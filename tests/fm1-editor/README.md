# fm1-editor tests

```bash
node core.test.js                                   # DX7 voice/bank SysEx encode+decode, checksum, the 32-algorithm table (17 tests)
PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp node browser.test.js   # drives the real page with a mock Web MIDI output (20 checks)
PW=/opt/node22/lib/node_modules/playwright node hub.test.js                  # hub tile + fm1-editor/ redirect
```

`browser.test.js` needs Chromium (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) and writes screenshots (desktop / tablet / phone, algorithm
picker) to `SHOTS`. It asserts: exact SysEx bytes that reach the output, note on/off, CC probe, undo/redo, .syx and JSON import/export, persistence under
`mmm.fm1.*`, no horizontal overflow at 1280/820/390 px, text contrast ratios, no page errors and **no network requests**.

Not covered (needs the real hardware): whether the FM-1 accepts the bank, single-voice SysEx, live parameter SysEx, its CC map.
