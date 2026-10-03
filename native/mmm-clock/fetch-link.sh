#!/bin/bash
# Fetches Ableton Link (pinned) with its bundled ASIO into Vendor/link. Needs git and network access.
# Link is GPLv2+ (or commercial); see Vendor/link/LICENSE.md before distributing the built app.
set -euo pipefail
cd "$(dirname "$0")"
TAG=Link-4.1
if [ -f Vendor/link/include/ableton/Link.hpp ] && [ -f Vendor/link/modules/asio-standalone/asio/include/asio.hpp ]; then exit 0; fi
rm -rf Vendor/link
mkdir -p Vendor
git clone --quiet --depth 1 --branch "$TAG" --recurse-submodules --shallow-submodules https://github.com/Ableton/link.git Vendor/link
echo "Fetched Ableton Link $TAG"
