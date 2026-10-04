#!/bin/bash
# Compiles and runs the Link tick self-test on Linux/macOS-less hosts (ticks == microseconds there).
set -euo pipefail
cd "$(dirname "$0")/.."
./fetch-link.sh
V=Vendor/link
g++ -std=c++17 -O1 tests/link_ticks_test.cpp Sources/CLink/mmm_link.cpp -o /tmp/link_ticks_test \
  -ISources/CLink/include -I$V/include -I$V/modules/asio-standalone/asio/include \
  -DLINK_PLATFORM_LINUX=1 -DLINK_PLATFORM_UNIX=1 -DASIO_NO_TYPEID=1 -DASIO_STANDALONE=1 \
  -DASIO_VERSION_NAMESPACE=link_asio_1_38_2 -w -lpthread
/tmp/link_ticks_test
