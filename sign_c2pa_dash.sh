#!/bin/bash

# --- Usage ---
# ./sign_c2pa_mpd.sh $INPUT_FILENAME


# --- MPD configuration ---

# shaka packager
PACKAGER_CMD="./packager-linux-x64"

# Duration of each segment in seconds
SEGMENT_DURATION=3


# --- C2PA Configuration ---

# Set the paths to your C2PA signing certificate and private key.
CERT_FILE="certs/my_chain.crt"
KEY_FILE="certs/my_key.pem"

# Set the author name to be included in the C2PA metadata.
AUTHOR_NAME="Trufo at IBC"

# Set the signing algorithm. Common values are 'ps256', 'ps384', 'es256', 'ed25519'.
SIGNING_ALG="es256"

# Set the Timestamp Authority URL. DigiCert provides a free one.
TIMESTAMP_URL="http://timestamp.digicert.com"


# --- MPD ---

# set INPUT_FILENAME to golden.mp4 if not provided
if [ -z "$1" ]; then
  INPUT_FILENAME="golden.mp4"
else
  INPUT_FILENAME="$1"
fi

INPUT_MP4="assets/${INPUT_FILENAME}"
BASE_NAME=$(basename "$INPUT_FILENAME" .mp4)
OUTPUT_DIR="output/$BASE_NAME"

# delete existing matching output files
if [ -d "$OUTPUT_DIR" ]; then
  rm -r "$OUTPUT_DIR"
fi

OUTPUT_MPD="${OUTPUT_DIR}/av.mpd"

# this works!!!
MP4Box -dash $((SEGMENT_DURATION * 1000)) -profile onDemand \
    -out $OUTPUT_MPD \
    -dash-profile live \
    -segment-name seg \
    -segment-timeline -url-template \
    $INPUT_MP4#video:id=video \
    $INPUT_MP4#audio:id=audio

if [ $? -eq 0 ]; then
  echo "MPD file created successfully: ${OUTPUT_MPD}"
else
  echo "Error: Failed to create MPD file."
  exit 1
fi


# # --- C2PA ---

# get absolute path of key_file and cert_file
KEY_FILE=$(realpath "${KEY_FILE}")
CERT_FILE=$(realpath "${CERT_FILE}")
echo $KEY_FILE
echo $CERT_FILE

# create manifest
MANIFEST_JSON="${OUTPUT_DIR}/manifest.json"

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

# iterate through files that end in init.mp4 in output_dir
# then run c2patool to sign each file and their fragments
# outputs go in ./tmp-c2pa (instead of ./output)
for INIT_FILE in ${OUTPUT_DIR}/*_init.mp4; do
    echo "Signing file: ${INIT_FILE}"
    TRACK_NAME=$(basename "$INIT_FILE" _init.mp4)
    FRAG_REGEX="${TRACK_NAME}_*[0-9].m4s"

    c2patool ${INIT_FILE} -m ${MANIFEST_JSON} -o tmp-c2pa -f \
      fragment --fragments_glob "${FRAG_REGEX}"
done

# replace the .mp4 and .m4s files in OUTPUT_DIR with the c2pa versions
# keep track of the number of files moved
COUNT=0
for C2PA_FILE in tmp-c2pa/${BASE_NAME}/*; do
    # if ends in mp4 or m4s
    if [[ $C2PA_FILE == *.mp4 || $C2PA_FILE == *.m4s ]]; then
        if [[ $C2PA_FILE == *seg* ]]; then
            # the file format is seg_trackX_[0-9].m4s -- check that the number [0-9] is not greater than 5000000
            SEGMENT_NUMBER=$(echo "$C2PA_FILE" | grep -oP '(?<=seg_track[0-9]_)[0-9]+(?=\.m4s)')
            if [[ $SEGMENT_NUMBER -gt 5000000 ]]; then
                echo "Skipping file with segment number > 5000000: ${C2PA_FILE}"
                continue
            fi
        fi
        mv "${C2PA_FILE}" "${OUTPUT_DIR}/$(basename "$C2PA_FILE")"
    fi
    COUNT=$((COUNT + 1))
done
echo "Moved ${COUNT} file fragments to ${OUTPUT_DIR}"

# removing ./tmp-c2pa
rm -r tmp-c2pa

# checking
# c2patool ${OUTPUT_DIR}/seg_track1_init.mp4 fragment --fragments_glob 'seg_track1_*[0-9].m4s'
