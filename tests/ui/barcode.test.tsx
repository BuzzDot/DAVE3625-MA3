import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BarcodeLookup } from "../../src/components/nutrition/barcode-lookup";
import { lookupBarcode } from "../../src/app/nutrition/barcode-actions";

const decoder = vi.hoisted(() => ({
  decodeFromStream: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("../../src/app/nutrition/barcode-actions", () => ({
  lookupBarcode: vi.fn(),
}));
vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromStream = decoder.decodeFromStream;
  },
}));
beforeEach(() => {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("BarcodeDetector", undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  decoder.decodeFromStream.mockResolvedValue({ stop: decoder.stop });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  decoder.decodeFromStream.mockReset();
  vi.mocked(lookupBarcode).mockReset();
});
function media(getUserMedia: unknown) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
}
it("accepts one JS-decoded result without BarcodeDetector and stops duplicate callbacks", async () => {
  const stop = vi.fn();
  media(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }));
  vi.mocked(lookupBarcode).mockResolvedValue({
    success: false,
    error: "Product not found.",
  });
  render(<BarcodeLookup onDraft={vi.fn()} />);
  fireEvent.click(screen.getByText("Use camera"));
  await waitFor(() => expect(decoder.decodeFromStream).toHaveBeenCalled());
  const callback = decoder.decodeFromStream.mock.calls[0][2];
  callback({ getText: () => "3017620422003" }, undefined, {
    stop: decoder.stop,
  });
  callback({ getText: () => "3017620422003" }, undefined, {
    stop: decoder.stop,
  });
  await waitFor(() =>
    expect(lookupBarcode).toHaveBeenCalledExactlyOnceWith("3017620422003"),
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
it.each([
  ["NotAllowedError", /permission was denied/],
  ["NotFoundError", /No camera was found/],
  ["NotReadableError", /Close other apps/],
])(
  "distinguishes camera failure %s and retains manual entry",
  async (name, message) => {
    media(vi.fn().mockRejectedValue(new DOMException("Camera error", name)));
    render(<BarcodeLookup onDraft={vi.fn()} />);
    fireEvent.click(screen.getByText("Use camera"));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(message),
    );
    expect(screen.getByLabelText("Product barcode")).toBeTruthy();
  },
);
it("reports missing camera access separately from an insecure context", async () => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
  render(<BarcodeLookup onDraft={vi.fn()} />);
  fireEvent.click(screen.getByText("Use camera"));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toMatch(
      /does not provide camera access/,
    ),
  );
  vi.stubGlobal("isSecureContext", false);
  fireEvent.click(screen.getByText("Use camera"));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toMatch(/requires HTTPS/),
  );
});
it("stops a camera stream that resolves after the scanner was closed", async () => {
  const stop = vi.fn();
  let resolveStream!: (value: MediaStream) => void;
  const getUserMedia = vi.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        resolveStream = resolve;
      }),
  );
  media(getUserMedia);
  render(<BarcodeLookup onDraft={vi.fn()} />);
  fireEvent.click(screen.getByText("Use camera"));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
  fireEvent.click(screen.getByText("Stop camera"));
  resolveStream({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await waitFor(() => expect(stop).toHaveBeenCalledOnce());
  expect(decoder.decodeFromStream).not.toHaveBeenCalled();
});
it("releases a decoder that finishes initializing after unmount", async () => {
  const stop = vi.fn();
  media(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }));
  let resolveControls!: (value: { stop: () => void }) => void;
  decoder.decodeFromStream.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveControls = resolve;
      }),
  );
  const view = render(<BarcodeLookup onDraft={vi.fn()} />);
  fireEvent.click(screen.getByText("Use camera"));
  await waitFor(() => expect(decoder.decodeFromStream).toHaveBeenCalled());
  view.unmount();
  expect(stop).toHaveBeenCalled();
  resolveControls({ stop: decoder.stop });
  await waitFor(() => expect(decoder.stop).toHaveBeenCalled());
});
