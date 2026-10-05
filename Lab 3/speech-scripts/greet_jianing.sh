#!/bin/bash

echo "Hello Jianinge, welcome back. I hope you're having a good day." \
| python3 -m piper \
  --model en_US-lessac-medium \
  --output_file greeting.wav

aplay greeting.wav

