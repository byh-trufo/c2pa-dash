#!/bin/bash

# --- Usage ---
# ./sign_c2pa_mpd.sh $INPUT_FILENAME


# --- MPD configuration ---

# shaka packager
PACKAGER_CMD="./packager-linux-x64"

# Duration of each segment in seconds
SEGMENT_DURATION=1


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


# --- MPD ---

# set INPUT_FILENAME to cindy_talk_short.mp4 if not provided
if [ -z "$1" ]; then
  INPUT_FILENAME="cindy_talk_short.mp4"
else
  INPUT_FILENAME="$1"
fi

INPUT_MP4="assets/${INPUT_FILENAME}"
BASENAME=$(basename "$INPUT_FILENAME" .mp4)
OUTPUT_DIR="output"

# delete existing matching output files
if [ -d "$OUTPUT_DIR/$BASENAME" ]; then
  rm -r "$OUTPUT_DIR/$BASENAME"
fi
if [ -f "$OUTPUT_DIR/$BASENAME.mpd" ]; then
  rm -f "$OUTPUT_DIR/$BASENAME.mpd"
fi

OUTPUT_MPD="${OUTPUT_DIR}/${BASENAME}.mpd"
INIT_VIDEO="${OUTPUT_DIR}/${BASENAME}/video_init.mp4"
INIT_AUDIO="${OUTPUT_DIR}/${BASENAME}/audio_init.mp4"
SEG_VIDEO="${OUTPUT_DIR}/${BASENAME}/video_\$Number\$.m4s"
SEG_AUDIO="${OUTPUT_DIR}/${BASENAME}/audio_\$Number\$.m4s"

$PACKAGER_CMD \
  in=$INPUT_MP4,stream=video,init_segment=$INIT_VIDEO,segment_template=$SEG_VIDEO \
  in=$INPUT_MP4,stream=audio,init_segment=$INIT_AUDIO,segment_template=$SEG_AUDIO \
  --segment_duration $SEGMENT_DURATION \
  --mpd_output $OUTPUT_MPD

if [ $? -eq 0 ]; then
  echo "MPD file created successfully: ${OUTPUT_MPD}"
else
  echo "Error: Failed to create MPD file."
  exit 1
fi


# --- C2PA ---

# get absolute path of key_file and cert_file
KEY_FILE=$(realpath "${KEY_FILE}")
CERT_FILE=$(realpath "${CERT_FILE}")
echo $KEY_FILE
echo $CERT_FILE

# create manifest
MANIFEST_JSON="${OUTPUT_DIR}/${BASENAME}/manifest.json"

cat <<EOF > ${MANIFEST_JSON}
{
  "alg": "${SIGNING_ALG}",
  "private_key": "${KEY_FILE}",
  "sign_cert": "${CERT_FILE}",
  "ta_url": "${TIMESTAMP_URL}",
  "claim_generator": "Trufo IBC Demo/1.0",
  "title": "$(basename "${INPUT_MP4}")",
  "assertions": [
    {
      "label": "stds.schema-org.CreativeWork",
      "data": {
        "author": [
          {
            "@type": "Person",
            "name": "${AUTHOR_NAME}"
          }
        ]
      }
    }
  ]
}
EOF

if [ $? -ne 0 ]; then
    echo "Error: Failed to create manifest JSON file."
    exit 1
fi

# add C2PA to fragmented MP4
FRAG_VIDEO="video_*[0-9].m4s"
FRAG_AUDIO="audio_*[0-9].m4s"

c2patool "${INIT_VIDEO}" -m "${MANIFEST_JSON}" -o "${OUTPUT_DIR}/c2pa" -f \
  fragment --fragments_glob "${FRAG_VIDEO}"
c2patool "${INIT_AUDIO}" -m "${MANIFEST_JSON}" -o "${OUTPUT_DIR}/c2pa" -f \
  fragment --fragments_glob "${FRAG_AUDIO}"

# replace INIT_VIDEO and INIT_AUDIO in MPD with the c2pa fragments
rm -r "${OUTPUT_DIR}/${BASENAME}"
mv "${OUTPUT_DIR}/c2pa/${BASENAME}" "${OUTPUT_DIR}/${BASENAME}"
# list out number of audio.m4s and video.m4s files
echo "Number of video fragments: $(ls ${OUTPUT_DIR}/${BASENAME}/video_*.m4s | wc -l)"
echo "Number of audio fragments: $(ls ${OUTPUT_DIR}/${BASENAME}/audio_*.m4s | wc -l)"

# print that c2pa has been added
echo "C2PA metadata added to fragmented MP4 files."

# # stress test C2PA validation
# mv "${OUTPUT_DIR}/${BASENAME}/audio_1.m4s" "${OUTPUT_DIR}/${BASENAME}/audio_x.m4s"
# mv "${OUTPUT_DIR}/${BASENAME}/audio_2.m4s" "${OUTPUT_DIR}/${BASENAME}/audio_1.m4s"
# mv "${OUTPUT_DIR}/${BASENAME}/audio_x.m4s" "${OUTPUT_DIR}/${BASENAME}/audio_2.m4s"
# rm ${OUTPUT_DIR}/${BASENAME}/*.m4s

# check with c2patool
c2patool ${INIT_VIDEO} \
  fragment --fragments_glob "${FRAG_VIDEO}" | grep validation_state
c2patool ${INIT_AUDIO} \
  fragment --fragments_glob "${FRAG_AUDIO}" | grep validation_state

echo ${INIT_VIDEO}
echo ${FRAG_VIDEO}
