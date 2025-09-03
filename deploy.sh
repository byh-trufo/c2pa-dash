#!/bin/bash
#
# A simple script to sync the local website to a specific subdirectory
# in a GCS bucket.

# --- Configuration ---
BUCKET_NAME="ibc2025-c2pa-01"
SUBDIRECTORY="c2pa-dash"
# ---------------------

echo "🚀 Starting sync to gs://${BUCKET_NAME}/${SUBDIRECTORY}/"

# The -d flag deletes files in the destination that don't exist in the source.
# The -r flag makes the sync recursive.
# The -x flag excludes specified file patterns from being uploaded.
gcloud storage rsync . gs://${BUCKET_NAME}/${SUBDIRECTORY} -r -d -x "\.git/.*|\.gitignore|README\.md|LICENSE|.*\.md$|deploy\.sh"

echo "✅ Sync complete! Your website is updated."
