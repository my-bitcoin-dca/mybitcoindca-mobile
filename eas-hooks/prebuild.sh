#!/usr/bin/env bash

# Create google-services.json from EAS secret
if [ -n "$GOOGLE_SERVICES_JSON" ]; then
  echo "$GOOGLE_SERVICES_JSON" | base64 -d > google-services.json
  echo "✓ google-services.json created from secret"
else
  echo "⚠️  Warning: GOOGLE_SERVICES_JSON secret not found"
  exit 1
fi
