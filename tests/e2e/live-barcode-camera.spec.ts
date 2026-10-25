import { test as base, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { barcodeVideo } from "../helpers/barcode-video";

const test = base.extend<{ cameraCode: string }>({
  cameraCode: ["3017620422003", { option: true }],
  page: async (
    { playwright, browserName, channel, baseURL, cameraCode },
    runPage,
    info,
  ) => {
    test.skip(
      browserName !== "chromium",
      "File-backed camera tests require Chromium; Windows WebKit has no MediaStream/getUserMedia.",
    );
    const browser = await playwright.chromium.launch({
      ...cameraOptions(cameraCode || undefined),
      channel,
    });
    info.annotations.push({
      type: "camera-test-source",
      description: `${browserName} ${browser.version()}; file-backed getUserMedia video; real ZXing decoder; no physical camera`,
    });
    const device = info.project.use;
    const context = await browser.newContext({
      baseURL,
      permissions: ["camera"],
      viewport: device.viewport,
      userAgent: device.userAgent,
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    });
    try {
      await runPage(await context.newPage());
    } finally {
      await context.close();
      await browser.close();
    }
  },
});
test.use({ trace: "off", screenshot: "off", video: "off" });
test.beforeEach(() => {
  test.skip(
    !process.env.FORM_TEST_EMAIL ||
      !process.env.FORM_TEST_PASSWORD ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "Requires configured Supabase and a dedicated confirmed account",
  );
});
type EvidenceWindow = typeof window & { __cameraStreams: MediaStream[] };
async function openScanner(page: Page) {
  test.skip(
    !process.env.FORM_TEST_EMAIL || !process.env.FORM_TEST_PASSWORD,
    "Requires a dedicated confirmed account",
  );
  await page.addInitScript(() => {
    // Explicitly remove the experimental API. ZXing must decode the video pixels.
    Object.defineProperty(window, "BarcodeDetector", {
      configurable: true,
      value: undefined,
    });
    const streams: MediaStream[] = [];
    Object.defineProperty(window, "__cameraStreams", { value: streams });
    const getMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await getMedia(constraints);
      streams.push(stream);
      return stream;
    };
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
}
const tracksEnded = (page: Page) =>
  page.evaluate(() =>
    (window as EvidenceWindow).__cameraStreams.every((s) =>
      s.getTracks().every((t) => t.readyState === "ended"),
    ),
  );
function cameraOptions(code?: string) {
  return {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      `--use-file-for-fake-video-capture=${barcodeVideo(code)}`,
    ],
  };
}

test.describe("EAN-13 video camera", () => {
  test.use({ cameraCode: "3017620422003" });
  test("real JS video decode without BarcodeDetector confirms nutrition and persists", async ({
    page,
  }) => {
    test.setTimeout(90000);
    const name = `Camera intake ${test.info().project.name} ${Date.now()}`;
    const api = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    let foodId: string | undefined;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.name));
    try {
      await openScanner(page);
      let lookups = 0;
      page.on("request", (request) => {
        if (request.method() === "POST" && request.headers()["next-action"])
          lookups++;
      });
      await page
        .getByRole("button", { name: "Use camera", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Review food draft", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Product barcode")).toHaveValue(
        "3017620422003",
      );
      expect(
        await page.evaluate(
          () =>
            typeof (window as unknown as { BarcodeDetector?: unknown })
              .BarcodeDetector,
        ),
      ).toBe("undefined");
      expect(
        await page.evaluate(
          () => (window as EvidenceWindow).__cameraStreams.length,
        ),
      ).toBe(1);
      expect(await tracksEnded(page)).toBe(true);
      await expect(page.getByLabel("Barcode camera preview")).toHaveCount(0);
      await page.waitForTimeout(750); // More than two decoder retry intervals: no repeated lookup.
      expect(lookups).toBe(1);
      await page
        .getByRole("button", { name: "Review food draft", exact: true })
        .click();
      await page.getByLabel("Food name", { exact: true }).fill(name);
      const kcal = Number(
        await page
          .getByLabel("Calories per 100 g", { exact: true })
          .inputValue(),
      );
      await page
        .getByRole("button", { name: "Save food", exact: true })
        .click();
      await expect(page.getByRole("status")).toHaveText(
        "Saved to your account.",
      );
      expect(
        (
          await api.auth.signInWithPassword({
            email: process.env.FORM_TEST_EMAIL!,
            password: process.env.FORM_TEST_PASSWORD!,
          })
        ).error,
      ).toBeNull();
      foodId = (await api.from("foods").select("id").eq("name", name).single())
        .data!.id;
      expect(
        (await api.from("nutrition_entries").select("id").eq("food_id", foodId))
          .data,
      ).toEqual([]);
      await page.getByRole("searchbox", { name: "Search foods" }).fill(name);
      await page
        .getByRole("button", { name: `Log ${name}`, exact: true })
        .click();
      await page.getByLabel("Consumed quantity").fill("25");
      await page
        .getByRole("button", { name: "Save food entry", exact: true })
        .click();
      await expect(page.getByRole("status")).toHaveText(
        "Saved to your account.",
      );
      const entry = await api
        .from("nutrition_entries")
        .select("kcal_snapshot,quantity")
        .eq("food_id", foodId)
        .single();
      expect(entry.error).toBeNull();
      expect(entry.data!.quantity).toBe(25);
      expect(entry.data!.kcal_snapshot).toBeCloseTo(kcal / 4, 3);
      await page.reload();
      await expect(
        page.getByRole("button", { name: `Edit entry ${name}`, exact: true }),
      ).toBeVisible();
      await page.locator("main").screenshot({
        path: `test-results/${test.info().project.name}-decoded-video-intake.png`,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      if (!foodId) {
        await api.auth.signInWithPassword({
          email: process.env.FORM_TEST_EMAIL!,
          password: process.env.FORM_TEST_PASSWORD!,
        });
        foodId = (
          await api.from("foods").select("id").eq("name", name).maybeSingle()
        ).data?.id;
      }
      if (foodId) {
        await api.from("nutrition_entries").delete().eq("food_id", foodId);
        await api.from("foods").delete().eq("id", foodId);
      }
      await api.auth.signOut({ scope: "local" });
    }
  });
});

test.describe("blank video lifecycle", () => {
  test.use({ cameraCode: "" });
  test("camera cancellation, unmount, permission denial and missing hardware preserve manual entry", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await openScanner(page);
    for (const unmount of [false, true]) {
      await page
        .getByRole("button", { name: "Use camera", exact: true })
        .click();
      await expect(page.getByLabel("Barcode camera preview")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as EvidenceWindow).__cameraStreams
                .at(-1)
                ?.getVideoTracks()[0]?.readyState,
          ),
        )
        .toBe("live");
      if (unmount)
        await page.getByRole("button", { name: "Diary", exact: true }).click();
      else
        await page
          .getByRole("button", { name: "Stop camera", exact: true })
          .click();
      await expect.poll(() => tracksEnded(page)).toBe(true);
      if (unmount)
        await page
          .getByRole("button", { name: "Food library", exact: true })
          .click();
    }
    for (const [name, message] of [
      ["NotAllowedError", "Camera permission was denied"],
      ["NotFoundError", "No camera was found"],
    ]) {
      await page.evaluate((name) => {
        navigator.mediaDevices.getUserMedia = async () => {
          throw new DOMException("Camera failure", name);
        };
      }, name);
      await page
        .getByRole("button", { name: "Use camera", exact: true })
        .click();
      await expect(
        page.getByRole("alert").filter({ hasText: message }),
      ).toBeVisible();
      await expect(page.getByLabel("Product barcode")).toBeEnabled();
    }
  });
});

for (const [format, code] of [
  ["EAN-8", "96385074"],
  ["UPC-A", "012345678905"],
]) {
  test.describe(`${format} video`, () => {
    test.use({ cameraCode: code });
    test(`real JS video decode supports ${format}`, async ({ page }) => {
      test.setTimeout(60000);
      await openScanner(page);
      await page
        .getByRole("button", { name: "Use camera", exact: true })
        .click();
      await expect(page.getByLabel("Product barcode")).toHaveValue(code);
      await expect.poll(() => tracksEnded(page)).toBe(true);
    });
  });
}
