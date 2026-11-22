/**
 * sensorAdapter — turns kitchen-motion.v1 messages into recipe intents.
 *
 * Deterministic and framework-free (time is passed in) so it can be tested
 * against the real JSONL logs. Rules, from the teammate's INTEGRATION.md:
 *
 *  • De-duplicate by (sessionId, seq); a new sessionId = motion_live.py restarted.
 *  • After (re)connecting, never replay old gestures: control events with
 *    seq ≤ hello.lastSeq, or older than maxGestureAgeMs, are ignored.
 *  • A nod (head confirm) causes ONLY confirm — never confirm + next.
 *  • head `next` only looks ahead (never completes); a nod while looking ahead
 *    just returns to the current step.
 *  • Hand data is feedback only (MOTION). It never completes or counts a step.
 *    Hand events are filtered by the current micro-action's movement, so
 *    twist candidates during stirring are ignored. Counts are cumulative per
 *    process: we diff against a per-micro baseline and never add stroke + cycle.
 *  • `unknown` hand state is a valid rejection, not a fault.
 *  • Sensor faults / silence degrade to buttons and keyboard; nothing blocks.
 */
import type { ClassifierId } from '../config/recipeConfig';
import { sensorConfig } from '../config/interactionConfig';
import type { BridgeHello, BridgeStatus, HandState, MotionCounts, MotionEnvelope, SensorId } from './protocol';

export type SensorIntent =
  | { kind: 'confirm' }
  | { kind: 'returnToActive' }
  | { kind: 'next' }
  | { kind: 'undo' }
  | { kind: 'motion'; classifier: ClassifierId; signal: 'active' | 'sample' | 'stopped' };

export interface AdapterContext {
  phase: 'welcome' | 'prep' | 'cooking' | 'memory';
  previewing: boolean;
  /** Movement of the active micro-action (null when it has none) */
  classifier: ClassifierId | null;
  /** Active micro-action id, for per-step count baselines */
  microId: string | null;
}

export type LinkStatus = 'connecting' | 'live' | 'stale' | 'offline';

export interface SensorSnapshot {
  link: LinkStatus;
  source: 'live' | 'replay' | null;
  sessionId: string | null;
  sensors: Partial<Record<SensorId, boolean>>;
  faults: Partial<Record<SensorId, string>>;
  handState: HandState | null;
  /** Hand-event counts since the current micro-action started (candidates, display only) */
  stepCounts: MotionCounts;
  lastGesture: { action: string; outcome: string; at: number } | null;
  ignored: number;
  invalid: number;
}

const HAND_TO_CLASSIFIER: Partial<Record<HandState, ClassifierId>> = { chop: 'CHOPPING', stir: 'WHISKING', twist: 'TWISTING' };
const zeroCounts = (): MotionCounts => ({ twist_stroke: 0, twist_cycle: 0, flip: 0 });

export class SensorAdapter {
  private sessionId: string | null = null;
  private lastSeq = 0;
  /** Control events with seq ≤ gateSeq (in gateSession) arrived before we connected */
  private gateSession: string | null = null;
  private gateSeq = 0;
  /** browserNow − bridgeNow, measured at hello */
  private clockOffset = 0;
  private lastMessageAt = 0;
  private motion: { classifier: ClassifierId; until: number | null } | null = null;
  private mismatch = 0;
  private counts: MotionCounts = zeroCounts();
  private baseline: { microId: string | null; counts: MotionCounts } = { microId: null, counts: zeroCounts() };
  snapshot: SensorSnapshot = {
    link: 'connecting',
    source: null,
    sessionId: null,
    sensors: {},
    faults: {},
    handState: null,
    stepCounts: zeroCounts(),
    lastGesture: null,
    ignored: 0,
    invalid: 0,
  };

  hello(h: BridgeHello, now: number): SensorIntent[] {
    this.clockOffset = now - h.bridgeNow;
    this.gateSession = h.sessionId;
    this.gateSeq = h.lastSeq;
    this.lastMessageAt = now;
    if (h.sessionId !== this.sessionId) this.resetSession(h.sessionId);
    if (h.sessionId === this.sessionId) this.lastSeq = Math.max(this.lastSeq, h.lastSeq);
    if (h.latestState) {
      this.snapshot.sensors = { ...h.latestState.sensors };
      this.counts = { ...h.latestState.counts };
    }
    this.snapshot = { ...this.snapshot, source: h.source, link: h.processRunning ? 'live' : 'offline', sessionId: h.sessionId };
    this.rebaseline(this.baseline.microId, true);
    return this.stopMotion();
  }

  bridgeStatus(b: BridgeStatus, now: number): SensorIntent[] {
    this.lastMessageAt = now;
    if (b.status === 'started') {
      this.resetSession(b.sessionId);
      this.snapshot.link = 'live';
      return [];
    }
    this.snapshot.link = 'offline';
    return this.stopMotion();
  }

  /** Mark the transport as down (EventSource error / closed) */
  disconnected(): SensorIntent[] {
    this.snapshot.link = 'connecting';
    return this.stopMotion();
  }

  noteInvalid() {
    this.snapshot.invalid += 1;
  }

  receive(env: MotionEnvelope, ctx: AdapterContext, now: number): SensorIntent[] {
    const ev = env.event;
    if (env.sessionId !== this.sessionId) this.resetSession(env.sessionId);
    if (ev.seq <= this.lastSeq) {
      this.snapshot.ignored += 1; // duplicate / out of order
      return [];
    }
    this.lastSeq = ev.seq;
    this.lastMessageAt = now;
    if (this.snapshot.link !== 'live' && ev.type !== 'stopped' && ev.type !== 'fatal') this.snapshot.link = 'live';
    this.rebaseline(ctx.microId);

    switch (ev.type) {
      case 'ready':
        this.snapshot.faults = {};
        return [];

      case 'state': {
        this.snapshot.sensors = { ...ev.sensors };
        this.counts = { ...ev.counts };
        this.updateStepCounts();
        this.snapshot.handState = ev.hand_state;
        return this.fromHandState(ev.hand_state, ctx, now);
      }

      case 'sensor_fault':
        this.snapshot.sensors = { ...this.snapshot.sensors, [ev.sensor]: false };
        this.snapshot.faults = { ...this.snapshot.faults, [ev.sensor]: ev.message };
        // LH/RH fault invalidates hand detection; stop any feedback it was driving
        return ev.sensor === 'LH' || ev.sensor === 'RH' ? this.stopMotion() : [];

      case 'sensor_recovered': {
        const faults = { ...this.snapshot.faults };
        delete faults[ev.sensor];
        this.snapshot.faults = faults;
        this.snapshot.sensors = { ...this.snapshot.sensors, [ev.sensor]: true };
        return [];
      }

      case 'stopped':
      case 'fatal':
        this.snapshot.link = 'offline';
        return this.stopMotion();

      case 'head_event':
        return this.fromHead(env, ctx, now);

      case 'hand_event': {
        this.counts = { ...this.counts, [ev.action]: ev.count };
        this.updateStepCounts();
        const wanted: ClassifierId | null = ev.action === 'flip' ? 'FLIPPING' : 'TWISTING';
        // context filter: e.g. twist candidates while stirring are ignored
        if (ctx.phase !== 'cooking' || ctx.previewing || ctx.classifier !== wanted) {
          this.snapshot.ignored += 1;
          return [];
        }
        this.motion = { classifier: wanted, until: now + sensorConfig.handEventPulseMs };
        return [{ kind: 'motion', classifier: wanted, signal: 'sample' }];
      }
    }
  }

  /** Heartbeat + expiry of event-driven motion pulses. Call a few times per second. */
  tick(now: number): SensorIntent[] {
    if (this.snapshot.link === 'live' && now - this.lastMessageAt > sensorConfig.heartbeatTimeoutMs) {
      this.snapshot.link = 'stale';
      return this.stopMotion();
    }
    if (this.motion?.until && now > this.motion.until) return this.stopMotion();
    return [];
  }

  /* ───────── internals ───────── */

  private fromHead(env: MotionEnvelope, ctx: AdapterContext, now: number): SensorIntent[] {
    const ev = env.event;
    if (ev.type !== 'head_event') return [];
    const reject = (outcome: string): SensorIntent[] => {
      this.snapshot.ignored += 1;
      this.snapshot.lastGesture = { action: ev.action, outcome, at: now };
      return [];
    };
    // history from before this connection is never treated as a command
    if (env.sessionId === this.gateSession && ev.seq <= this.gateSeq) return reject('ignored (before connect)');
    const age = now - (env.receivedAt + this.clockOffset);
    if (age > sensorConfig.maxGestureAgeMs) return reject('ignored (stale)');
    if (this.snapshot.sensors.HF === false) return reject('ignored (head sensor fault)');

    let intent: SensorIntent | null = null;
    let outcome = '';
    if (ev.action === 'confirm') {
      if (ctx.phase === 'cooking' && ctx.previewing) {
        intent = { kind: 'returnToActive' };
        outcome = 'back to current step';
      } else if (ctx.phase !== 'memory') {
        intent = { kind: 'confirm' };
        outcome = 'confirm';
      }
    } else if (ctx.phase === 'cooking') {
      intent = { kind: ev.action };
      outcome = ev.action === 'next' ? 'look ahead' : 'undo';
    }
    if (!intent) return reject('ignored (not available here)');
    this.snapshot.lastGesture = { action: ev.action, outcome, at: now };
    return [intent];
  }

  private fromHandState(state: HandState, ctx: AdapterContext, now: number): SensorIntent[] {
    if (ctx.phase !== 'cooking' || ctx.previewing || !ctx.classifier) return this.stopMotion();
    let mapped = HAND_TO_CLASSIFIER[state];
    // known confusion: stirring is sometimes classified as twist — treat it as stirring while whisking
    if (ctx.classifier === 'WHISKING' && state === 'twist') mapped = 'WHISKING';
    if (mapped && mapped === ctx.classifier) {
      this.mismatch = 0;
      const first = !this.motion || this.motion.classifier !== mapped;
      this.motion = { classifier: mapped, until: null };
      return [{ kind: 'motion', classifier: mapped, signal: first ? 'active' : 'sample' }];
    }
    // event-driven pulses (flip / twist stroke) expire in tick(), not here
    if (this.motion && this.motion.until !== null && now <= this.motion.until) return [];
    this.mismatch += 1;
    return this.mismatch >= sensorConfig.handMismatchToStop ? this.stopMotion() : [];
  }

  private stopMotion(): SensorIntent[] {
    if (!this.motion) return [];
    const c = this.motion.classifier;
    this.motion = null;
    this.mismatch = 0;
    return [{ kind: 'motion', classifier: c, signal: 'stopped' }];
  }

  private resetSession(sessionId: string | null) {
    this.sessionId = sessionId;
    this.lastSeq = 0;
    this.counts = zeroCounts();
    this.baseline = { microId: this.baseline.microId, counts: zeroCounts() };
    this.snapshot = { ...this.snapshot, sessionId, faults: {}, handState: null, stepCounts: zeroCounts() };
  }

  /** New micro-action → counts restart from the backend's current cumulative values */
  private rebaseline(microId: string | null, force = false) {
    if (!force && microId === this.baseline.microId) return;
    this.baseline = { microId, counts: { ...this.counts } };
    this.updateStepCounts();
  }

  private updateStepCounts() {
    const b = this.baseline.counts;
    this.snapshot.stepCounts = {
      twist_stroke: Math.max(0, this.counts.twist_stroke - b.twist_stroke),
      twist_cycle: Math.max(0, this.counts.twist_cycle - b.twist_cycle),
      flip: Math.max(0, this.counts.flip - b.flip),
    };
  }
}
