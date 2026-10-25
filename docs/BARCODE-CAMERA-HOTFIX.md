# Barcode camera compatibility hotfix — October 25, 2026

## Confirmed cause

The previous `Camera` component required `window.BarcodeDetector` and supported native formats before calling `getUserMedia`. Its combined capability check returned “Camera scanning is unavailable in this browser” when the native decoder was absent, even with working camera hardware. HTTPS, the existing `camera=(self)` Permissions-Policy and rear-camera `facingMode: { ideal: "environment" }` were already correct. The immediate failure was decoder compatibility, not evidence of missing cameras or denied permission.

The old Playwright camera test injected a synthetic `BarcodeDetector` whose `detect` method returned a known code. Although it supplied a real synthetic MediaStream, it did not decode the pixels or test the missing-native-decoder path. It therefore could not catch this real-device bug. Earlier reports explicitly marked physical-camera/Safari testing unverified; their simulated-decoder results do not establish optical decoding.

## Narrow fix

- Pin `@zxing/browser` **0.2.1** and its decoder peer `@zxing/library` **0.23.0**; load both lazily only when the user chooses the camera. No native BarcodeDetector or external scanner account is required.
- Keep standard `getUserMedia`, a non-mandatory rear-facing preference, muted inline video and local frame decoding. Support EAN-13, EAN-8, UPC-A and UPC-E. Desktop webcams can use the default available video device.
- Stop decoder controls, reminder timers and all owned media tracks after success, cancellation, unmount and errors, including initialization that resolves after cancellation. A per-scan accepted flag and in-flight lookup guard prevent repeated lookups.
- Pass the decoded text to the existing reviewed food/quantity workflow. Leading-zero identity normalization, server authentication, RLS and SQL-calculated historical intake snapshots are unchanged.
- Distinguish insecure/missing camera APIs, denied permission, missing hardware, busy/unreadable devices, decoder loading/video failures, and ordinary frames without a readable barcode. Ordinary not-found/checksum/format results keep scanning; guidance appears after 15 seconds. Manual entry remains available.

No schema, auth, nutrition calculation, barcode lookup endpoint, camera permission policy or unrelated module behavior changes.

## Verification before publication

- Lint, strict TypeScript and optimized production build passed.
- **62 domain/PGlite cases** and **39 UI cases** passed. UI decoder mocks test lifecycle/late initialization/error classification only; they are not the optical-decode evidence.
- **10 focused desktop/mobile Chromium cases** passed against the local production server with hosted Supabase. The new camera cases use independently encoded, generated YUV video files fed through Chromium's file-backed `getUserMedia` camera. **ZXing actually decodes the EAN-13/EAN-8/UPC-A video pixels with BarcodeDetector explicitly undefined. No decoder callback is mocked.**
- **16 additional compatibility cases passed**: five each in installed Chrome, installed Edge and mobile Chrome emulation (EAN-13 → real product lookup → reviewed food → confirmed 25 g intake → reload persistence; EAN-8; UPC-A; stop/unmount/denial/missing-device handling; manual normalized lookup/fresh-session/history/owner isolation), plus manual lookup/persistence in the WebKit engine on Windows. Each runner also passed all three real Supabase API scenarios and removed its disposable accounts.
- Generated barcode videos, JSON reports, screenshots and logs stay in ignored `playwright-report/` / `test-results/`. Only the small deterministic fixture generator is source-controlled. The fixture images encode known valid test barcodes; they do not contain credentials or personal images.
- `npm audit` reports zero vulnerabilities with the new lockfile.

The first compatibility attempt also exposed the existing optional `/favicon.ico` 404 in full Chrome/Edge. The barcode test now excludes only that confirmed unrelated URL from its console assertion; every other console error remains visible. No favicon/UI change was introduced. Initial camera test discovery required moving per-video launch configuration from nested groups into a test-scoped page fixture. Failed setup/compatibility reports remain locally retained.

## Explicit testing limits

These are **simulated camera inputs with a real video stream and real JS pixel decoding**, not a physical-camera test. Permission-denial/missing-device cases inject the corresponding native error; real permission dialogs were not operated. Mobile Chromium emulation is not iPhone Safari.

Playwright WebKit was installed and inspected, but the Windows port exposes no `navigator.mediaDevices`, `getUserMedia`, `MediaStream` or canvas `captureStream`, even at the secure production origin. It can verify manual lookup/UI behavior, not camera capture/decoding. No Safari or iPhone camera compatibility is claimed as verified. The user will perform the final Windows-webcam and iPhone-Safari physical test.

## Approved publication

The user explicitly authorized committing/pushing/deploying this narrow hotfix after successful relevant checks. The exact deployed hash and focused public-site results are recorded in the release handoff and ignored camera-hotfix evidence after publication. Retest the secure public origin, not a localhost build; confirm alias metadata matches the new commit before acceptance. Preserve real records and remove only dedicated fixtures. No Garmin or unrelated feature work is included.
