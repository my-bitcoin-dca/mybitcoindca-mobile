#!/usr/bin/env bash

set -e

# Check if google-services.json already exists (local builds)
if [ -f "google-services.json" ]; then
  echo "✓ google-services.json already exists (local build)"
  exit 0
fi

# Create google-services.json from EAS secret (cloud builds)
if [ -n "$GOOGLE_SERVICES_JSON" ]; then
  printf '%s' "$GOOGLE_SERVICES_JSON" | base64 -d > google-services.json
  echo "✓ google-services.json created from secret"
  echo "File size: $(wc -c < google-services.json) bytes"
  echo "First line: $(head -n 1 google-services.json)"
else
  echo "⚠️  Warning: GOOGLE_SERVICES_JSON secret not found"
  exit 1
fi
