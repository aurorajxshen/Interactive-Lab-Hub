#!/bin/bash

# Ask the user for a ZIP code using Piper TTS
echo "Please say your five digit zip code after the beep." \
| python3 -m piper \
  --model en_US-lessac-medium \
  --output_file zipcode_prompt.wav

# Play the verbal prompt
aplay zipcode_prompt.wav

# Give the user a moment to prepare
sleep 0.5

# Record the user's answer for 5 seconds
echo "Recording your answer..."
arecord -d 5 -f S16_LE -c 1 -r 16000 zipcode_answer.wav

echo "Recording complete."

# Transcribe the recorded answer
python transcribe.py zipcode_answer.wav --model base.en
