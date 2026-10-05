# Chatterboxes

**Collaborators: Jianing Li (jl4837), Aurora Jiaxin Shen (js3996)**


# Part 1

## A. Text to Speech

\*\***Write your own shell file to use your favorite of these TTS engines to have your Pi greet you by name.**\*\*

[View my greeting shell script](speech-scripts/greet_jianing.sh)


\*\***Then answer: Is the same greeting, in these different voices, the same greeting? Describe one concrete way the voice changed what the utterance seemed to mean or who seemed to be speaking.**\*\*

For my personalized greeting, I chose **Piper** because its neural voice sounded more natural and conversational to me than eSpeak and Festival.

My Pi greets me with:

> "Hello Aurora! Welcome back. It's nice to see you again."


### Reflection on Different Voices

Although the words were identical, the greeting did not feel identical across the different voices. eSpeak sounded robotic and device-like, so the greeting felt more functional than social. Festival sounded slightly more human, but I could still notice the stitched-together quality of the speech. Piper sounded much more natural and conversational.

One concrete difference was the perceived personality of the device. With eSpeak, I interpreted the speaker more like a machine giving me information, while with Piper, the same words felt more like a friendly social agent greeting me. This showed me that voice can change the perceived role and personality of a speech interface even when the semantic content stays the same.


## B. Speech to Text


\*\***Record a few seconds of your own speech (`arecord -d 5 -f cd -c 1 -r 16000 test.wav`) and transcribe it with at least two model sizes. Report the real-time factor for each. At what point does the accuracy improvement stop being worth the delay, for a system that has to answer you?**\*\*

### Comparing Whisper Model Sizes

I first tested different Whisper model sizes using the provided `lookdave.wav` file.

| Model | Audio Duration | Transcription Time | Real-Time Factor | Transcription |
| --- | ---: | ---: | ---: | --- |
| `base.en` | 3.72s | 2.17s | 0.58x | "Look Dave, I can see you're really upset about this." |
| `small.en` | 3.72s | 6.03s | 1.62x | "Look Dave, I can see you're really upset about this." |

Both models produced the same transcription, but `small.en` took much longer. In this example, increasing the model size did not produce an observable improvement in accuracy.

### Testing My Own Recording

I then recorded a 5-second sentence:

> "Hello, how are you today? Are you good?"

I tested the recording with `tiny.en` and `base.en`.

| Model | Audio Duration | Transcription Time | Real-Time Factor | Result |
| --- | ---: | ---: | ---: | --- |
| `tiny.en` | 5.00s | 1.03s | 0.21x | Correct words, less punctuation |
| `base.en` | 5.00s | 1.93s | 0.39x | Correct words and punctuation |

For my recording, both models recognized the spoken content correctly. `base.en` produced slightly better punctuation, but took almost twice as long to transcribe the same audio.

### Accuracy vs. Delay

For a conversational system that needs to answer quickly, I would not automatically choose the larger model. In my tests, `small.en` introduced a substantial delay compared with `base.en` without improving the transcription of `lookdave.wav`. For my own simple recording, even `tiny.en` captured all the spoken words correctly. This suggests that the best model depends on whether the additional accuracy of a larger model is noticeable enough to justify the extra response time.


\*\***Write your own script that verbally asks for a numerical input (a phone number, zipcode, number of pets) and records the answer the respondent provides.**\*\* Numbers are a good stress test — transcription systems make characteristic errors on digit strings, and you will want to know what they are before you design around them.

### Numerical Input Interaction

I created a shell script that verbally asks the user for a five-digit ZIP code, records the user's response for five seconds, and transcribes the response using the `base.en` Whisper model.

[View my numerical input script](speech-scripts/ask_zipcode.sh)

For my test, I responded:

> "One, two, three, four, five."

The system transcribed the response as:

> "One, two, three, four, five."

The transcription was correct. The 5-second recording took 1.92 seconds to transcribe, with a real-time factor of **0.38x**.


## C. Turn-taking: knowing when someone has stopped talking

\*\***Try both extremes, and something in between. Describe what each one feels like to talk to. Note specifically: at 0.2s, what kinds of normal speech get cut off? At 1.5s, what does the delay make the system seem like?**\*\*

I tested `listen.py` with three different silence thresholds to understand how the system decides when I have finished speaking.

| Minimum Silence | Observation |
| --- | --- |
| `0.2s` | Very responsive, but short pauses could easily trigger the endpoint too early. For example, "Today I want..." was detected as a complete utterance before I finished my sentence. |
| `0.4s` (default) | More balanced, but it could still split natural pauses. For example, "Can you hear me?" was once divided into "Can you hear?" and "me." |
| `1.5s` | Allowed much longer pauses and was less likely to cut off a sentence, but the system felt slower because it waited longer after I had actually finished speaking. |

The experiment showed me that there is no single perfect silence threshold. A shorter threshold makes the system feel more responsive, but it can mistake hesitation or thinking pauses for the end of a turn. A longer threshold gives the user more time to think, but makes the system feel less responsive.

For this type of conversational interaction, I would start with a middle value around **0.4–0.8 seconds** and adjust it based on the interaction context. A system designed for short commands could use a shorter threshold, while a system that expects longer or more thoughtful answers may need a longer one.

There is no correct value. A system that takes drink orders and a system that listens to someone think out loud want very different thresholds, and the right one depends on what your users are doing with their pauses.

### The complete loop

I also tested the complete speech interaction using `echo_bot.py`, which combines endpoint detection, speech recognition, and text-to-speech.

| Test | ASR Time | TTS First Audio | Total Gap |
| --- | ---: | ---: | ---: |
| "Can you hear me?" | 1.02s | 0.24s | 1.25s |
| Longer sentence about my Interactive Devices lab | 1.19s | 0.75s | 1.95s |
| Long sentence about our TA Q&A session | 1.59s | 1.32s | 2.91s |

The latency became more noticeable with longer utterances. For the short sentence, the 1.25-second gap still felt relatively responsive. For the longest sentence, however, the gap increased to 2.91 seconds, which felt much more noticeable in a conversation.

This experiment showed me that conversational latency is not caused by only one component. The user experiences the combined delay of endpoint detection, speech recognition, TTS generation, and playback. Even when the transcription is accurate, a long gap before the device responds can make the interaction feel less natural.


## D. Storyboard

\*\***Post your storyboard and diagram here.**\*\*

**EchoShell — A Shell That Remembers**

Inspired by the act of speaking into a seashell and listening to the sounds within, we designed a memory medium called "EchoShell." You can confide your current experiences and feelings to the shell; it quietly stores them away, only to remind you later—perhaps when you are experiencing similar emotions—of what happened at that earlier moment in time.

<img width="1307" height="1080" alt="Storyboard_1" src="https://github.com/user-attachments/assets/6c69aacf-b321-459a-abe3-261595676f82" />


\*\***Please describe and document your process.**\*\*

### Design Process

We started by thinking about speech not only as a way to give commands to a device, but also as a way to preserve personal moments. This led us to the idea of a physical object that could hold fragments of a user's experiences, emotions, and memories over time.

We chose a seashell as the form of the device because its physical interaction already suggests both speaking and listening. A user can speak into the shell to leave a memory, and later bring the shell close to their ear to receive a memory from the past. Rather than making the shell feel like a conventional voice assistant, we want the interaction to feel more like confiding in an object that quietly remembers.

For this initial storyboard, I focused on one core interaction: a user shares an emotional experience with the shell, the shell stores that moment, and at some point in the future, a related experience brings the earlier memory back. The returned memory could include the user's original recording as well as a short reconstructed introduction that connects the past moment to the present.

At this stage, the interaction is intentionally still open-ended. Questions such as how the shell decides when to return a memory, how much control the user should have over retrieval, and how the physical form distinguishes between speaking and listening will be explored through role-playing, prototyping, and further discussion with my teammate.


### Initial Interaction Flow

For the first version of the concept, we imagined the interaction as:

**Speak → Listen → Store → Time passes → Recall → Listen again**

1. The user picks up the EchoShell and speaks about a current experience or feeling.
2. The shell listens without immediately responding, allowing the user to speak naturally.
3. After detecting that the user has finished, the shell gives subtle feedback (the sound of wave) that the memory has been stored.
4. The memory remains in the shell over time.
5. During a future interaction, the shell may recognize a connection between the user's present experience and a past memory.
6. When the user brings the shell close to their ear, the shell recalls that earlier moment, potentially introducing it with a short reconstructed message before replaying the user's past voice.


### Imagined Dialogue

#### Moment 1 — Leaving a Memory

**User:**  
"I'm really nervous about my presentation tomorrow. I know I've prepared for it, but..."

*[1.2-second thinking pause — EchoShell continues listening]*

**User:**  
"...I still feel like something is going to go wrong."

*[EchoShell waits approximately 1.5 seconds after the user stops speaking before deciding that the turn has ended.]*

**EchoShell:**  
*[A soft sound confirms that the memory has been stored.]*


#### Several Months Later

**User:**  
"I have an interview tomorrow. I don't know why, but I'm getting really nervous again."

*[1.0-second pause]*

**User:**  
"I just keep thinking I'm going to mess it up."

*[EchoShell waits approximately 1.5 seconds after silence.]*

**EchoShell:**  
"I've heard this feeling before."

*[Pause]*

**EchoShell:**  
"Last fall, you left this with me..."

*[The shell plays the user's original recording from the earlier moment.]*

**Past User:**  
"I'm really nervous about my presentation tomorrow..."

*[The user listens to their past self through the shell.]*


### Pause and Turn-Taking

The timing of the interaction is especially important for EchoShell because users may pause while recalling an experience or thinking about how to describe an emotion.

In Part C, we found that a short silence threshold such as 0.2 seconds could easily cut off natural pauses, while a much longer threshold such as 1.5 seconds gave the speaker more room to think but made the interaction feel slower. For EchoShell, we currently prefer a relatively longer endpoint threshold of around 1.5 seconds when the user is leaving a memory.

Unlike a system designed for short commands, EchoShell is intended to listen to reflective and potentially fragmented speech. A pause may therefore indicate that the user is thinking rather than that they have finished speaking.

This timing is still an initial design decision. we plan to observe how people naturally pause and signal the end of their turn during the acted-out dialogue in Part E and adjust the interaction accordingly.
 

## E. Acting out the dialogue


\*\***Describe if the dialogue seemed different than what you imagined when it was acted out, and how.**\*\*

Video: Part 1 acted-out interaction using the early physical prototype.


https://github.com/user-attachments/assets/8e378d40-d626-4c7b-ad66-61c5c52099c4


Acting out the interaction revealed that the conversational flow was less self-explanatory than it appeared in the storyboard. In particular, the user did not always know when EchoShell had finished listening, when it was processing a memory, or when it was ready to respond. The original design depended too heavily on speech and pauses to communicate these state transitions.

The role-play also made us reconsider the timing of the interaction. Because EchoShell is intended for reflective speech rather than short commands, natural hesitation and thinking pauses need to be preserved rather than immediately interpreted as the end of a turn.

Finally, the physical form of the shell suggested an opportunity that was not fully represented in our first storyboard. Picking up a shell and bringing it close to the face or ear are already familiar physical behaviors. This led us to explore physical sensing and ambient audio as additional interaction cues in Part 2.


---

# Lab 3 Part 2

## Prep for Part 2

**1. What are concrete things that could use improvement in the design of your device? For example: wording, timing, anticipation of misunderstandings.**

Our initial storyboard established the basic idea of speaking to EchoShell and later hearing a past memory, but several parts of the interaction needed to be made more explicit. 

First, we simplified the physical initiation of the interaction. Earlier iterations considered an additional rubbing gesture, but we ultimately removed it because the shell's physical form already provides strong interaction cues. Instead, the final prototype uses two sequential physical signals: picking up the shell and bringing it close to the user. The IMU first detects that the shell has been picked up, waking the system, while the proximity sensor detects that it has been brought close enough for a more intentional interaction. This reduces the number of gestures the user has to learn while still preventing incidental movement from immediately starting a recording.

Second, the original design relied heavily on speech and did not clearly communicate when EchoShell was awake, listening, remembering, or finished. We therefore introduced the sound of ocean waves as a continuous ambient feedback mechanism. The waves appear when the shell wakes up, remain quietly in the background while the interaction continues, briefly swell when a memory is stored or retrieved, and gradually fade when the interaction ends.

Third, we reconsidered the endpoint timing. In Part C, very short silence thresholds such as 0.2 seconds frequently interrupted natural pauses, while a 1.5-second threshold allowed more time for hesitation at the cost of responsiveness. EchoShell is different from a command-based voice assistant: users may pause for relatively long periods while recalling or describing an experience. We therefore increased the initial endpoint threshold to **3 seconds**, intentionally prioritizing space for reflection over immediate responsiveness.

Finally, we added a clearer way to end the overall interaction. After a recalled memory finishes playing, EchoShell enters a **10-second listening window**. This gives the user time to reflect on what they have just heard and decide whether they want to continue speaking. If no speech is detected, the ocean sound gradually fades and the interaction ends. The user can also explicitly end the interaction at any time by putting the shell down.

These timings are design hypotheses rather than fixed optimal values, and we plan to evaluate them through the Wizard-of-Oz interactions.


**2. What are other modes of interaction *beyond speech* that you might also use to clarify how to interact? In particular: how does someone know when the device is listening, and when it is thinking? You have a screen and an LED.**

We wanted EchoShell to communicate its state without requiring explicit spoken instructions or a conventional graphical interface. We therefore designed the interaction around a combination of **physical movement, proximity, and ambient sound**.

The ocean ambience serves as the primary state-feedback channel:
- Silence: EchoShell is asleep.
- Soft continuous waves: EchoShell is awake and listening.
- A stronger swell: EchoShell has completed a turn and is storing or retrieving a memory.
- EchoShell's voice: the system has completed retrieval and is beginning its response.
- Fading waves: the interaction is ending.

In an earlier iteration, we considered asking the user to rub the shell as an explicit wake-up gesture. However, we eventually removed this interaction. The seashell itself already has strong physical affordances: when people encounter it, they naturally tend to pick it up, bring it closer to their face or ear, listen to it, or speak into it. Adding a separate rubbing gesture therefore introduced an unnecessary learned action.

The final prototype instead uses **two physical cues in sequence**. First, an IMU detects when the shell is picked up, indicating initial engagement and waking EchoShell. Second, an APDS9960 proximity sensor detects when the shell has been brought close to the user, indicating stronger intent to interact. Only then does the system transition toward the listening interaction. This allows the physical behavior of the user to communicate intent without requiring a button, wake word, or explicit instruction.


**3. Make a new storyboard, diagram and/or script based on these reflections.**

The redesigned interaction follows seven main stages:

**Sleep → Wake → Confide → Remember → Recall → Reflect → Sleep**

<img width="686" height="601" alt="截屏2026-10-04 11 52 06" src="https://github.com/user-attachments/assets/194164e4-a00a-4c37-b860-4d707035b57e" />

1. **Sleep:** EchoShell rests silently on the table.
2. **Wake:** The user picks up the shell. The IMU detects the movement and wakes EchoShell, causing the soft ocean ambience to begin. When the user brings the shell close, the proximity sensor confirms stronger interaction intent and the system becomes ready to listen.
3. **Confide:** The user speaks naturally about a current experience or feeling. EchoShell records the voice while the ocean remains quietly in the background.
4. **Remember:** After approximately 3 seconds of silence, EchoShell interprets the current turn as complete. The waves briefly swell to acknowledge that the memory has been heard and stored.
5. **Recall:** A related past memory is selected. EchoShell gently introduces it — for example, "I see. Remember last week, you had a similar feeling?" The waves swell briefly before the original past recording is played with a subtle echo effect.
6. **Reflect:** After the memory ends, the waves swell and then return to the quiet background level. EchoShell waits for up to 10 seconds, allowing the user to reflect and optionally continue speaking. New speech returns the system to the Confide state.
7. **Sleep:** If no speech is detected during the waiting window, the waves gradually fade. Putting the shell down at any point also ends the interaction and returns EchoShell to sleep.


## Prototype our system

EchoShell behaves like the sea: receptive, gentle, and slightly distant. It does not judge, advise, or tell the user what their memories mean. It listens, holds fragments of the past, and occasionally lets an old echo return—leaving the interpretation to the user.

<img width="1156" height="782" alt="b070ba47cb382bf2b52541eb7ec9f2e2" src="https://github.com/user-attachments/assets/e1937328-14ff-40d3-bcba-942ff407f2cc" />

Our final prototype implements EchoShell as a state-based interactive system running on a Raspberry Pi 5. It combines physical sensing, proximity, voice activity, audio feedback, and Wizard-of-Oz memory retrieval.

The interaction begins when the IMU detects that the shell has been picked up. This wakes EchoShell and starts the continuous ocean ambience. The proximity sensor then detects when the user brings the shell close, providing a second indication that the user intends to interact rather than having simply moved the object.

Once the shell is active and close to the user, the microphone captures the user's speech. EchoShell allows reflective pauses and treats approximately three seconds of silence as the end of a speaking turn. The recording is then archived as a new memory.

For the current Wizard-of-Oz prototype, memory retrieval is intentionally not automated. A separate controller allows the researcher to select a previously prepared memory that is appropriate to the participant's current emotional context. This isolates the interaction question we are interested in—how it feels to receive a past memory from the shell—without requiring us to first build a reliable semantic and emotional retrieval model.

EchoShell then says, "I see. Remember last week, you had a similar feeling?" and plays the selected past recording with a subtle echo effect. The continuous ocean ambience remains underneath both the system voice and the recalled recording so that the interaction feels like one continuous experience rather than several disconnected audio clips.

After the recalled memory finishes, EchoShell waits for approximately 10 seconds. If the user begins speaking again, the system returns to the listening state. Otherwise, the interaction ends and the shell returns to sleep.

Our prototype uses a Raspberry Pi 5 as the central controller for EchoShell.

### Components

- **Raspberry Pi 5:** runs the interaction state machine and coordinates sensing, recording, memory storage, and audio playback.
- **LSM6DS3TR-C IMU:** detects when EchoShell is picked up and moved.
- **APDS9960 proximity sensor:** detects when the user brings the shell close for intentional interaction.
- **USB microphone:** captures the participant's speech.
- **Speaker:** plays the ocean ambience, EchoShell's voice, and recalled recordings.
- **3D-printed shell enclosure:** integrates the sensing and audio hardware into a physical form that naturally suggests speaking and listening.
- **Laptop / SSH interface:** serves as the Wizard-of-Oz controller through which the researcher selects a past memory.

The system therefore satisfies the prototype requirements by using the Raspberry Pi, sensor input, and spoken participant interaction.


### Implementation files

- [EchoShell main interaction code](echoshell/echoshell.py)
- [Wizard-of-Oz controller](echoshell/wizard.py)
- [IMU movement detection test](echoshell/detect_movement.py)
- [IMU sensor test](echoshell/test_imu.py)


### Prototype Development

1. Setting up and testing the sensors
<img width="1707" height="1280" alt="af0a8f9b7f54ed8073a84a14ee0ac1ee" src="https://github.com/user-attachments/assets/ecf86fd0-2c24-4454-b1fa-cae36a367fa0" />
<img width="1707" height="1280" alt="b4884875ffbf8a14967dcef9609ab2cc" src="https://github.com/user-attachments/assets/fd4d31b0-d90b-4786-bcdb-de022bcb36c1" />
<img width="1707" height="1280" alt="102cbec89dfe7715aef569d746e6cae1" src="https://github.com/user-attachments/assets/e8fa2ab9-5690-40df-8ddf-50bc20257e3a" />


2. Modeling and printing the shell
<img width="1707" height="1280" alt="65920c8779f2f06dc764f1797da0b651" src="https://github.com/user-attachments/assets/c0792be1-91f3-491b-a2e0-6c39e1d17ae3" />
<img width="1707" height="1280" alt="e4a7a4c05e2cd2f95b0dbc3452a124d7" src="https://github.com/user-attachments/assets/daf52a90-8c04-4df3-9d27-07efd57f4b29" />
<img width="960" height="1280" alt="917683e70cceee0c3d6e0fd71cb67be8" src="https://github.com/user-attachments/assets/103a9b60-faa1-49a4-a103-ea9edd1fd1c2" />


3. Assembling components and the shell
<img width="1702" height="1276" alt="2be709a170c875ca1fdb895408c2344d" src="https://github.com/user-attachments/assets/0edcc84f-e9c7-4620-b3f7-82c6e2780aa0" />
<img width="1707" height="1280" alt="315bcf10a352dab7e45b345107677d53" src="https://github.com/user-attachments/assets/9f1fbbc3-3da7-451d-a633-cae5ecaf6174" />


**Video: Final interactive EchoShell prototype working scene.**


https://github.com/user-attachments/assets/59690d21-19e4-4a92-bd39-3c379c0cfc5e


**Wizard-of-Oz controller**

<img width="1709" height="765" alt="截屏2026-10-04 17 41 43" src="https://github.com/user-attachments/assets/39f6ee5a-dcb1-414b-8f62-59743ec16c7d" />


## Test the system

We tested the interactive prototype with two participants. During each session, one team member observed the participant's physical interaction and conversational behavior while the other operated the Wizard-of-Oz memory retrieval controller. We paid particular attention to whether participants understood when to pick up and approach the shell, when the system was listening, when their speaking turn had ended, how they interpreted the ocean-wave feedback, and how they responded to hearing a recalled memory.

After the interaction, we asked participants about the physical form, audio feedback, timing, recalled memories, and moments of confusion. We also asked how they would want EchoShell to respond in different emotional situations rather than assuming that recalling a similar memory would always be desirable.

<img width="1707" height="1280" alt="af85b5ad773566ae8caf1c0275e66803" src="https://github.com/user-attachments/assets/ca63ab7b-7087-4ea3-9e93-0fe7a5387e19" />


### What worked well about the system and what didn't?

Overall, participants responded positively to the physical and emotional qualities of EchoShell. They described the idea of a physical "memory recorder" as compelling and felt that the seashell form made the interaction unusually intuitive. The shape itself provided a strong affordance: when participants saw the shell, they naturally wanted to pick it up, bring it close, listen to it, or speak into it. 

The ocean ambience was also received positively. Participants felt that the continuous wave sound matched the physical form of the shell and helped create a calm atmosphere in which they could pay attention to their current emotional state. The ambience therefore worked not only as system feedback but also as part of the emotional experience of the product.

However, the tests revealed ambiguity in turn-taking and system state. Participants were sometimes unsure when they should speak and when EchoShell was preparing to respond. We attempted to communicate transitions by increasing the volume of the waves, but because both the background ambience and transition signal were variations of the same sound, the difference was sometimes too subtle. A future version should create a larger contrast between the background and transition sounds and potentially add another modality—such as a subtle internal light, haptic pulse, or more distinctive audio cue—to differentiate listening, retrieving, and speaking states.

The tests also challenged our assumption that recalling a similar emotional memory is always helpful. For anxiety or nervousness, participants could imagine a previous similar experience being useful: it might redirect attention or remind them that an earlier stressful situation ultimately turned out well. For anger, however, participants did not necessarily want to revisit another angry memory. They sometimes preferred the device to remain quietly present rather than retrieve another emotionally similar experience.

Finally, participants felt that hearing their own previous voice would make the experience more personally resonant than hearing a generic or simulated recording. This reinforces the core idea of EchoShell as a medium through which the past self communicates with the present self, rather than as an AI agent that gives advice.


### What worked well about the controller and what didn't?

The Wizard-of-Oz controller worked well as a lightweight way to separate memory retrieval intelligence from the rest of the functioning prototype. The physical sensing, speech recording, turn-taking, ambient audio, and memory playback were handled by the Raspberry Pi, while the wizard only selected which past memory should be returned. This allowed us to test the central experience without pretending that we had already solved automatic emotional or semantic memory retrieval.

The simple numbered memory menu also allowed the wizard to make selections quickly. However, operating it during a live interaction required significant attention. The wizard had to listen to the participant, interpret the emotional context, remember the available recordings, and select one before the delay became noticeable. The current memory labels were useful for a small prototype but would not scale to a large personal memory archive.

The test also showed that the wizard's decision cannot be reduced to simply choosing the memory with the most similar emotion. For example, retrieving an earlier nervous memory could be comforting, while retrieving an earlier angry memory could reinforce rather than relieve the user's emotional state. This means that a future retrieval system would need to consider not only similarity, but also the likely function or consequence of recalling that memory.


### What lessons can you take away from the WoZ interactions for designing a more autonomous version of the system?

The most important lesson is that autonomous retrieval should not simply perform emotion-to-emotion matching. Our original concept assumed that if the user currently felt nervous, angry, or homesick, EchoShell could retrieve a past memory with a similar emotional state. The user tests showed that the usefulness of such a memory depends strongly on context and on what happened afterward.

A more autonomous EchoShell should therefore represent memories using multiple dimensions, such as emotion, topic, intensity, time, outcome, and the user's later interpretation of the event. For example, when a user is nervous, a useful memory might not merely contain nervousness; it might contain nervousness followed by a positive outcome or successful coping.

The system should also be capable of deciding not to retrieve a memory. In some situations, such as anger, quiet companionship may be more appropriate than resurfacing another emotionally intense experience. This suggests that future autonomy should include a retrieval policy rather than only a similarity model.

Finally, the interaction should expose system states more clearly. An autonomous version would need distinguishable cues for listening, processing/retrieving, speaking, and returning to rest, rather than relying primarily on subtle changes in the same ocean ambience.


### How could you use your system to create a dataset of interaction? What other sensing modalities would make sense to capture?

EchoShell itself could become a longitudinal data collection system. With informed participant consent, each interaction could store the user's voice recording together with interaction metadata such as timestamp, speaking duration, pause patterns, proximity, device movement, which memory was retrieved, and whether the user continued speaking afterward.

During Wizard-of-Oz studies, we could additionally record which memory the wizard selected and why, as well as the participant's response to that retrieval. Over time, these interactions could form a dataset for learning not only which memories are semantically or emotionally related, but which types of retrieval participants actually find helpful in different contexts.

Additional sensing modalities could capture aspects of the interaction that audio alone misses. For example, touch or capacitive sensing could detect how the user holds the shell; pressure sensing could capture squeezing or gripping; IMU data could capture movement patterns; and optional physiological signals could help study changes in arousal. A camera could also capture posture or facial behavior in a controlled research setting, although this would introduce substantially greater privacy concerns and would be less consistent with EchoShell's intimate, low-observation design.

Because EchoShell stores highly personal speech and emotional memories, any future dataset would require explicit consent, careful access control, and clear choices about what is stored or deleted. For this product, privacy is part of the interaction design rather than only a technical implementation detail.



