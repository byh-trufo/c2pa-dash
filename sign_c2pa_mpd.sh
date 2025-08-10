#!/bin/bash

# --- Usage ---
# ./sign_c2pa_mpd.sh $INPUT_FILENAME


# --- MPD configuration ---
PACKAGER_CMD="./packager-linux-x64"

SEGMENT_DURATION=2  # Duration of each segment in seconds


# --- C2PA Configuration ---
# Set the paths to your C2PA signing certificate and private key.
CERT_FILE="certs/ibc_demo.crt"
KEY_FILE="certs/ibc_demo.key"

# Set the author name to be included in the C2PA metadata.
AUTHOR_NAME="Trufo at IBC"

# Set the signing algorithm. Common values are 'ps256', 'ps384', 'es256', 'ed25519'.
SIGNING_ALG="ed25519"

# Set the Timestamp Authority URL. DigiCert provides a free one.
TIMESTAMP_URL="http://timestamp.digicert.com"


# --- Script Logic ---
INPUT_FILENAME=$1
INPUT_MP4="assets/${INPUT_FILENAME}"
BASENAME=$(basename "$INPUT_FILENAME" .mp4)
OUTPUT_DIR="output/${BASENAME}"
# delete output_dir if it exists
if [ -d "$OUTPUT_DIR" ]; then
  rm -rf "$OUTPUT_DIR"
fi

OUTPUT_MPD="${OUTPUT_DIR}/${BASENAME}.mpd"
OUTPUT_VIDEO="${OUTPUT_DIR}/video.mp4"
OUTPUT_AUDIO="${OUTPUT_DIR}/audio.mp4"

# gpac -i "$INPUT_MP4" dasher:segdur=${SEGMENT_DURATION}:profile=full:template=${INPUT_BASENAME}'/seg_$Number%05d$.m4s' -o "$OUTPUT_MPD"

$PACKAGER_CMD \
  in="$INPUT_MP4",stream=video,output="$OUTPUT_VIDEO" \
  in="$INPUT_MP4",stream=audio,output="$OUTPUT_AUDIO" \
  --segment_duration "$SEGMENT_DURATION" \
  --mpd_output "$OUTPUT_MPD"
