#!/usr/bin/env bash

set -e

echo "=== Patching AGP version to 8.8.0 ==="

# Patch react-native version catalog
RN_CATALOG="node_modules/react-native/gradle/libs.versions.toml"
if [ -f "$RN_CATALOG" ]; then
  echo "Found react-native version catalog at $RN_CATALOG"
  echo "Before: $(grep 'agp = ' "$RN_CATALOG")"
  sed -i.bak 's/agp = "8\.11\.[0-9]*"/agp = "8.8.0"/' "$RN_CATALOG"
  echo "After: $(grep 'agp = ' "$RN_CATALOG")"
  echo "✓ Patched AGP version in react-native catalog"
fi

# Patch @react-native/gradle-plugin version catalog
PLUGIN_CATALOG="node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml"
if [ -f "$PLUGIN_CATALOG" ]; then
  echo "Found gradle-plugin version catalog at $PLUGIN_CATALOG"
  echo "Before: $(grep 'agp = ' "$PLUGIN_CATALOG")"
  sed -i.bak 's/agp = "8\.11\.[0-9]*"/agp = "8.8.0"/' "$PLUGIN_CATALOG"
  echo "After: $(grep 'agp = ' "$PLUGIN_CATALOG")"
  echo "✓ Patched AGP version in gradle-plugin catalog"
fi

# Also patch android/build.gradle if it has a hardcoded version
if [ -f "android/build.gradle" ]; then
  sed -i.bak "s/gradle:8\.11\.[0-9]*/gradle:8.8.0/g" "android/build.gradle"
  echo "✓ Patched android/build.gradle"
fi

echo "=== AGP patching complete ==="
