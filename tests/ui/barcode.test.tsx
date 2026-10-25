import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BarcodeLookup } from "../../src/components/nutrition/barcode-lookup";
import { lookupBarcode } from "../../src/app/nutrition/barcode-actions";

vi.mock("../../src/app/nutrition/barcode-actions", () => ({
  lookupBarcode: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(lookupBarcode).mockReset();
});
it("decodes a camera result, releases tracks and looks up the detected code", async () => {
  vi.stubGlobal("isSecureContext", true);
  const stop = vi.fn();
  vi.stubGlobal(
    "BarcodeDetector",
    class {
      static getSupportedFormats = async () => ["ean_13"];
      detect = async () => [{ rawValue: "3017620422003" }];
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }),
    },
  });
  vi.mocked(lookupBarcode).mockResolvedValue({
    success: false,
    error: "Product not found.",
  });
  render(<BarcodeLookup onDraft={vi.fn()} />);
  fireEvent.click(screen.getByText("Use camera"));
  await waitFor(() =>
    expect(lookupBarcode).toHaveBeenCalledWith("3017620422003"),
  );
  expect(stop).toHaveBeenCalled();
  expect(screen.queryByLabelText("Barcode camera preview")).toBeNull();
});
it("validates manual entry, shows provider errors and creates a reviewed draft without logging", async () => {
  const onDraft = vi.fn();
  render(<BarcodeLookup onDraft={onDraft} />);
  fireEvent.change(screen.getByLabelText("Product barcode"), {
    target: { value: "123" },
  });
  fireEvent.click(screen.getByText("Find product"));
  expect(screen.getByRole("alert").textContent).toMatch(/8, 12, 13 or 14/);
  expect(lookupBarcode).not.toHaveBeenCalled();
  vi.mocked(lookupBarcode).mockResolvedValueOnce({
    success: false,
    error: "Product not found.",
  });
  fireEvent.change(screen.getByLabelText("Product barcode"), {
    target: { value: "3017620422003" },
  });
  fireEvent.click(screen.getByText("Find product"));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("Product not found."),
  );
  vi.mocked(lookupBarcode).mockResolvedValueOnce({
    success: true,
    product: {
      barcode: "3017620422003",
      url: "https://world.openfoodfacts.org/product/3017620422003",
      name: "Example",
      description: "Open Food Facts",
      kcal_per_100g: 200,
      protein_per_100g: null,
      carbs_per_100g: 0,
      fat_per_100g: 10,
      portions: [],
    },
  });
  fireEvent.click(screen.getByText("Find product"));
  await screen.findByText("Review food draft");
  expect(onDraft).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Review food draft"));
  expect(onDraft).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Example",
      protein_per_100g: null,
      revision: 0,
    }),
  );
  expect(onDraft.mock.calls[0][0]).not.toHaveProperty("barcode");
});
it("provides manual fallback for unsupported cameras and permission denial", async () => {
  render(<BarcodeLookup onDraft={vi.fn()} />);
  vi.stubGlobal("BarcodeDetector", undefined);
  fireEvent.click(screen.getByText("Use camera"));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toMatch(
      /unavailable in this browser/,
    ),
  );
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal(
    "BarcodeDetector",
    class {
      static getSupportedFormats = async () => ["ean_13"];
    },
  );
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockRejectedValue(new Error("Denied")) },
  });
  fireEvent.click(screen.getByText("Use camera"));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toMatch(
      /Camera access was denied/,
    ),
  );
  expect(screen.getByLabelText("Product barcode")).toBeTruthy();
});
it("stops a camera stream that resolves after the scanner was closed", async () => {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal(
    "BarcodeDetector",
    class {
      static getSupportedFormats = async () => ["ean_13"];
    },
  );
  const stop = vi.fn();
  let resolveStream!: (value: MediaStream) => void;
  const getUserMedia = vi.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        resolveStream = resolve;
      }),
  );
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  render(<BarcodeLookup onDraft={vi.fn()} />);
  fireEvent.click(screen.getByText("Use camera"));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
  fireEvent.click(screen.getByText("Stop camera"));
  resolveStream({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await waitFor(() => expect(stop).toHaveBeenCalledOnce());
});
