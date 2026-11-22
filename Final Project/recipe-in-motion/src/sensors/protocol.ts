/**
 * kitchen-motion.v1 — typed reader for the Raspberry Pi motion protocol.
 *
 * Source of truth: teammate repo `Final Project/motion_live.py` (emit()) and
 * `INTEGRATION.md`. motion_live.py prints one JSON object per line on stdout:
 *   { schema: "kitchen-motion.v1", seq, t, type, ...fields }
 * The bridge (bridge/sensor_bridge.py) wraps each line as
 *   { sessionId, receivedAt, event }   (receivedAt = bridge wall clock, ms)
 *
 * Parsing is strict on the fields the app relies on and tolerant of extra
 * fields, so additive backend changes don't break the website.
 */

export const MOTION_SCHEMA = 'kitchen-motion.v1';

export type SensorId = 'LH' | 'HF' | 'HS' | 'RH';
export type HeadAction = 'confirm' | 'next' | 'undo';
export type HandAction = 'flip' | 'twist_stroke' | 'twist_cycle';
/** `unknown` is a valid rejection (not a fault); `flip` is an event, never a state */
export type HandState = 'unknown' | 'idle' | 'chop' | 'stir' | 'twist';

interface Base {
  schema: typeof MOTION_SCHEMA;
  /** Monotonic per process; resets to 1 when motion_live.py restarts */
  seq: number;
  /** Seconds since process start (monotonic clock) */
  t: number;
}

export interface ReadyMsg extends Base {
  type: 'ready';
  step: string;
  target_hz: number;
  utc: string;
  channels: Record<string, number>;
}
export interface HeadEventMsg extends Base {
  type: 'head_event';
  action: HeadAction;
  duration: number;
  /** Always true: experimental candidate, NOT a probability */
  candidate: boolean;
}
export interface HandEventMsg extends Base {
  type: 'hand_event';
  action: HandAction;
  /** Cumulative per process — never add counts; diff against a per-step baseline */
  count: number;
  candidate: boolean;
  /** twist_stroke only: ±1 sensor-axis direction (not a fixed clockwise sense) */
  direction?: number;
  /** twist_stroke and flip */
  duration?: number;
}
export interface MotionCounts {
  twist_stroke: number;
  twist_cycle: number;
  flip: number;
}
export interface StateMsg extends Base {
  type: 'state';
  step: string;
  hand_state: HandState;
  candidate: boolean;
  sensors: Partial<Record<SensorId, boolean>>;
  counts: MotionCounts;
  /** null = not enough data / invalid window (normal during warm-up) */
  features: Record<string, number> | null;
  timing: Record<string, number>;
}
export interface SensorFaultMsg extends Base {
  type: 'sensor_fault';
  sensor: SensorId;
  message: string;
}
export interface SensorRecoveredMsg extends Base {
  type: 'sensor_recovered';
  sensor: SensorId;
}
export interface StoppedMsg extends Base {
  type: 'stopped';
  reason: string;
}
export interface FatalMsg extends Base {
  type: 'fatal';
  message: string;
}

export type MotionMessage = ReadyMsg | HeadEventMsg | HandEventMsg | StateMsg | SensorFaultMsg | SensorRecoveredMsg | StoppedMsg | FatalMsg;
export type MotionType = MotionMessage['type'];

/** What the bridge sends per line */
export interface MotionEnvelope {
  sessionId: string;
  /** Bridge wall-clock ms when the line was read */
  receivedAt: number;
  event: MotionMessage;
}

/** Sent once per (re)connection. Control events at or before lastSeq are history, not commands. */
export interface BridgeHello {
  sessionId: string | null;
  lastSeq: number;
  bridgeNow: number;
  processRunning: boolean;
  source: 'live' | 'replay';
  ready: ReadyMsg | null;
  latestState: StateMsg | null;
}

export interface BridgeStatus {
  status: 'started' | 'exited' | 'restarting' | 'replay-finished';
  sessionId: string | null;
  code?: number | null;
  bridgeNow: number;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const SENSORS: readonly string[] = ['LH', 'HF', 'HS', 'RH'];
const HEAD: readonly string[] = ['confirm', 'next', 'undo'];
const HAND: readonly string[] = ['flip', 'twist_stroke', 'twist_cycle'];
const HAND_STATES: readonly string[] = ['unknown', 'idle', 'chop', 'stir', 'twist'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const fail = (error: string): ParseResult<never> => ({ ok: false, error });

function numRecord(v: unknown): v is Record<string, number> {
  return isObj(v) && Object.values(v).every(isNum);
}

/** Validate one decoded kitchen-motion.v1 object */
export function parseMotionMessage(raw: unknown): ParseResult<MotionMessage> {
  if (!isObj(raw)) return fail('not an object');
  if (raw.schema !== MOTION_SCHEMA) return fail(`unexpected schema ${String(raw.schema)}`);
  if (!isInt(raw.seq) || raw.seq < 1) return fail('seq must be a positive integer');
  if (!isNum(raw.t)) return fail('t must be a number');
  const m = raw;
  switch (m.type) {
    case 'ready':
      if (!isStr(m.step) || !isNum(m.target_hz) || !isStr(m.utc) || !numRecord(m.channels)) return fail('ready: bad fields');
      break;
    case 'head_event':
      if (!isStr(m.action) || !HEAD.includes(m.action)) return fail(`head_event: unknown action ${String(m.action)}`);
      if (!isNum(m.duration) || !isBool(m.candidate)) return fail('head_event: bad fields');
      break;
    case 'hand_event':
      if (!isStr(m.action) || !HAND.includes(m.action)) return fail(`hand_event: unknown action ${String(m.action)}`);
      if (!isInt(m.count) || m.count < 0 || !isBool(m.candidate)) return fail('hand_event: bad count/candidate');
      if (m.direction !== undefined && m.direction !== 1 && m.direction !== -1) return fail('hand_event: direction must be ±1');
      if (m.duration !== undefined && !isNum(m.duration)) return fail('hand_event: bad duration');
      break;
    case 'state': {
      if (!isStr(m.hand_state) || !HAND_STATES.includes(m.hand_state)) return fail(`state: unknown hand_state ${String(m.hand_state)}`);
      if (!isStr(m.step) || !isBool(m.candidate)) return fail('state: bad step/candidate');
      if (!isObj(m.sensors) || !Object.entries(m.sensors).every(([k, v]) => SENSORS.includes(k) && isBool(v))) return fail('state: bad sensors');
      const c = m.counts;
      if (!isObj(c) || !isInt(c.twist_stroke) || !isInt(c.twist_cycle) || !isInt(c.flip)) return fail('state: bad counts');
      if (m.features !== null && !numRecord(m.features)) return fail('state: bad features');
      if (!numRecord(m.timing)) return fail('state: bad timing');
      break;
    }
    case 'sensor_fault':
      if (!isStr(m.sensor) || !SENSORS.includes(m.sensor) || !isStr(m.message)) return fail('sensor_fault: bad fields');
      break;
    case 'sensor_recovered':
      if (!isStr(m.sensor) || !SENSORS.includes(m.sensor)) return fail('sensor_recovered: bad sensor');
      break;
    case 'stopped':
      if (!isStr(m.reason)) return fail('stopped: bad reason');
      break;
    case 'fatal':
      if (!isStr(m.message)) return fail('fatal: bad message');
      break;
    default:
      return fail(`unknown type ${String(m.type)}`);
  }
  return { ok: true, value: m as unknown as MotionMessage };
}

/** Parse one stdout line exactly as motion_live.py prints it */
export function parseMotionLine(line: string): ParseResult<MotionMessage> {
  const trimmed = line.trim();
  if (!trimmed) return fail('empty line');
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch (e) {
    return fail(`invalid JSON: ${(e as Error).message}`);
  }
  return parseMotionMessage(raw);
}

export function parseEnvelope(raw: unknown): ParseResult<MotionEnvelope> {
  if (!isObj(raw) || !isStr(raw.sessionId) || !isNum(raw.receivedAt)) return fail('envelope: missing sessionId/receivedAt');
  const ev = parseMotionMessage(raw.event);
  if (!ev.ok) return ev;
  return { ok: true, value: { sessionId: raw.sessionId, receivedAt: raw.receivedAt, event: ev.value } };
}

export function parseHello(raw: unknown): ParseResult<BridgeHello> {
  if (!isObj(raw) || !isInt(raw.lastSeq) || !isNum(raw.bridgeNow)) return fail('hello: bad fields');
  if (raw.sessionId !== null && !isStr(raw.sessionId)) return fail('hello: bad sessionId');
  const ready = raw.ready ? parseMotionMessage(raw.ready) : null;
  const latest = raw.latestState ? parseMotionMessage(raw.latestState) : null;
  return {
    ok: true,
    value: {
      sessionId: raw.sessionId as string | null,
      lastSeq: raw.lastSeq,
      bridgeNow: raw.bridgeNow,
      processRunning: raw.processRunning === true,
      source: raw.source === 'replay' ? 'replay' : 'live',
      ready: ready?.ok && ready.value.type === 'ready' ? ready.value : null,
      latestState: latest?.ok && latest.value.type === 'state' ? latest.value : null,
    },
  };
}
