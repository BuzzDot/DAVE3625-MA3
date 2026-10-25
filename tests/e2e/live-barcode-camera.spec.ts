import { test, expect } from "@playwright/test";

test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
  permissions: ["camera"],
  trace: "off",
  screenshot: "off",
  video: "off",
});
type CameraEvidence = {
  streams: MediaStream[];
  frames: number;
  decode: boolean;
};
type TestWindow = typeof window & { __formCameraEvidence: CameraEvidence };

test("simulated camera stream decodes a product, stops tracks and retains manual fallback (no physical camera)", async ({
  page,
}) => {
  test.skip(
    !process.env.FORM_TEST_EMAIL || !process.env.FORM_TEST_PASSWORD,
    "Requires a dedicated confirmed account",
  );
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.name));
  await page.addInitScript(() => {
    const evidence: CameraEvidence = { streams: [], frames: 0, decode: false };
    Object.defineProperty(window, "__formCameraEvidence", { value: evidence });
    const getMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await getMedia(constraints);
      evidence.streams.push(stream);
      return stream;
    };
    // Detector output is simulated; Chromium supplies an actual MediaStream
    // backed by its fake camera. This does not verify hardware decoding.
    Object.defineProperty(window, "BarcodeDetector", {
      configurable: true,
      value: class {
        static async getSupportedFormats() {
          return ["ean_13"];
        }
        async detect(video: HTMLVideoElement) {
          if (video.readyState < 2 || !evidence.decode) return [];
          evidence.frames++;
          return [{ rawValue: "3017620422003" }];
        }
      },
    });
  });
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.FORM_TEST_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.FORM_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await page.goto("/nutrition");
  await page.getByRole("button", { name: "Food library", exact: true }).click();
  await page.getByRole("button", { name: "Use camera", exact: true }).click();
  await expect(page.getByLabel("Barcode camera preview")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as TestWindow
          ).__formCameraEvidence.streams[0]?.getVideoTracks()[0]?.readyState,
      ),
    )
    .toBe("live");
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as TestWindow
          ).__formCameraEvidence.streams[0]?.getVideoTracks()[0]?.readyState,
      ),
    )
    .toBe("ended");
  await page.getByRole("button", { name: "Use camera", exact: true }).click();
  await page.evaluate(() => {
    (window as TestWindow).__formCameraEvidence.decode = true;
  });
  await expect(
    page.getByRole("button", { name: "Review food draft", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as TestWindow).__formCameraEvidence.frames,
    ),
  ).toBeGreaterThan(0);
  expect(
    await page.evaluate(() =>
      (window as TestWindow).__formCameraEvidence.streams.every((s) =>
        s.getTracks().every((t) => t.readyState === "ended"),
      ),
    ),
  ).toBe(true);
  await expect(page.getByLabel("Barcode camera preview")).toHaveCount(0);
  // Simulate denied permission independently of the fake camera's granted permission.
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.getByRole("button", { name: "Use camera", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Camera access was denied" }),
  ).toBeVisible();
  await expect(page.getByLabel("Product barcode")).toBeEnabled();
  await page
    .getByRole("heading", { name: "Scan a food barcode", exact: true })
    .locator("..")
    .screenshot({
      path: `test-results/${test.info().project.name}-simulated-camera.png`,
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
