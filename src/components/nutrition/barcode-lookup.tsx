"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { lookupBarcode } from "@/app/nutrition/barcode-actions";
import { barcodeSchema, type BarcodeProduct } from "@/lib/nutrition/barcode";
import type { FoodInput } from "@/lib/nutrition/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MacroLine } from "./fields";

function Camera({
  onDetected,
  onError,
  onStop,
}: {
  onDetected: (code: string) => void;
  onError: (message: string) => void;
  onStop: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [guidance, setGuidance] = useState("Starting camera…");
  useEffect(() => {
    const element = video.current;
    let disposed = false;
    let accepted = false;
    let stream: MediaStream | undefined;
    let controls: IScannerControls | undefined;
    let reminder: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearTimeout(reminder);
      controls?.stop();
      controls = undefined;
      stream?.getTracks().forEach((track) => track.stop());
      stream = undefined;
      if (element?.srcObject) {
        element.pause();
        element.srcObject = null;
      }
    };
    const fail = (message: string) => {
      stop();
      if (!disposed && !accepted) onError(message);
    };
    async function start() {
      if (!window.isSecureContext) {
        fail(
          "Camera access requires HTTPS or localhost. Open the secure app URL, or enter the barcode below.",
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !element) {
        fail(
          "This browser does not provide camera access. Enter the barcode below instead.",
        );
        return;
      }
      // Load the JS decoder only after the user chooses the camera. No native
      // BarcodeDetector is needed, including in Safari and desktop browsers.
      let decoder;
      try {
        const [{ BrowserMultiFormatReader }, library] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(library.DecodeHintType.POSSIBLE_FORMATS, [
          library.BarcodeFormat.EAN_13,
          library.BarcodeFormat.EAN_8,
          library.BarcodeFormat.UPC_A,
          library.BarcodeFormat.UPC_E,
        ]);
        decoder = {
          reader: new BrowserMultiFormatReader(hints, {
            delayBetweenScanAttempts: 250,
            delayBetweenScanSuccess: 500,
          }),
          library,
        };
      } catch {
        fail(
          "The barcode decoder could not load. Check your connection and retry, or enter the barcode below.",
        );
        return;
      }
      if (disposed) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (error) {
        const name =
          error && typeof error === "object" && "name" in error
            ? String(error.name)
            : "";
        fail(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Camera permission was denied. Allow camera access in browser settings, or enter the barcode below."
            : name === "NotFoundError" || name === "DevicesNotFoundError"
              ? "No camera was found. Connect a webcam or enter the barcode below."
              : name === "NotReadableError" || name === "TrackStartError"
                ? "The camera could not be opened. Close other apps using it and retry, or enter the barcode below."
                : "Camera access could not start. Check your camera and browser settings, or enter the barcode below.",
        );
        return;
      }
      if (disposed) {
        stop();
        return;
      }
      setGuidance("Hold the barcode steady in the camera view. Scanning…");
      reminder = setTimeout(() => {
        if (!disposed && !accepted)
          setGuidance(
            "No readable barcode yet. Improve the light and hold the full barcode steady, or stop the camera and enter its printed code.",
          );
      }, 15000);
      try {
        controls = await decoder.reader.decodeFromStream(
          stream,
          element,
          (result, error, scanControls) => {
            if (disposed || accepted) {
              scanControls.stop();
              return;
            }
            const code = result?.getText();
            if (code && barcodeSchema.safeParse(code).success) {
              accepted = true;
              controls = scanControls;
              stop();
              onDetected(code);
            } else if (
              error &&
              !(
                error instanceof decoder.library.NotFoundException ||
                error instanceof decoder.library.ChecksumException ||
                error instanceof decoder.library.FormatException
              )
            ) {
              controls = scanControls;
              fail(
                "The barcode decoder could not read the video. Stop and retry, or enter the barcode below.",
              );
            }
          },
        );
        // A stream/decoder can finish initializing after cancellation or even
        // after a synchronous first decode. Never leave that late loop active.
        if (disposed || accepted) stop();
      } catch {
        fail(
          "The camera video could not be read. Stop and retry, or enter the barcode below.",
        );
      }
    }
    void start();
    return () => {
      disposed = true;
      stop();
    };
  }, [onDetected, onError]);
  return (
    <div className="space-y-3">
      <p className="text-xs">
        Point the rear camera at the barcode. Camera images stay on your device.
      </p>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {guidance}
      </p>
      <video
        ref={video}
        muted
        playsInline
        aria-label="Barcode camera preview"
        className="aspect-video w-full max-w-md rounded-xl bg-black object-cover"
      />
      <Button type="button" variant="outline" onClick={onStop}>
        Stop camera
      </Button>
    </div>
  );
}

export function BarcodeLookup({
  onDraft,
}: {
  onDraft: (draft: FoodInput) => void;
}) {
  const [barcode, setBarcode] = useState("");
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const inFlight = useRef(false);
  const lookup = useCallback(async (code: string) => {
    if (inFlight.current) return;
    setCamera(false);
    setBarcode(code);
    setError("");
    setProduct(null);
    const parsed = barcodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await lookupBarcode(code);
      if (result.success) setProduct(result.product);
      else setError(result.error);
    } catch {
      setError(
        "The lookup did not complete. Check your connection and try again.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);
  const cameraError = useCallback((message: string) => {
    setCamera(false);
    setError(message);
  }, []);
  return (
    <Card className="space-y-4">
      <h3 className="text-base font-semibold">Scan a food barcode</h3>
      <p className="text-xs leading-6 text-muted-foreground">
        Scan or type the printed code to look up Open Food Facts. Review the
        package values before saving a personal food. Nothing is logged until
        you choose a consumed quantity.
      </p>
      {camera ? (
        <Camera
          onDetected={lookup}
          onError={cameraError}
          onStop={() => setCamera(false)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setError("");
            setProduct(null);
            setCamera(true);
          }}
        >
          Use camera
        </Button>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(barcode);
        }}
      >
        <label className="min-w-0 flex-1 text-xs">
          Product barcode
          <input
            className="mt-2"
            value={barcode}
            disabled={busy}
            onChange={(e) => {
              setBarcode(e.target.value);
              setProduct(null);
            }}
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            required
          />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Looking up…" : "Find product"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {(busy || product) && (
        <p role="status" className="text-xs">
          {busy
            ? "Looking up product…"
            : "Product found. Check the nutrition label before saving."}
        </p>
      )}
      {product && (
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="font-semibold">{product.name}</h4>
          <p className="text-xs">
            Per 100 {product.nutrition_basis ?? "g"}. Unknown nutrients stay
            unknown.
          </p>
          <MacroLine
            values={{
              kcal: product.kcal_per_100g,
              protein: product.protein_per_100g,
              carbs: product.carbs_per_100g,
              fat: product.fat_per_100g,
            }}
          />
          <p className="text-xs">
            Sugars:{" "}
            {product.nutrients?.sugars?.amount == null
              ? "Unknown"
              : `${product.nutrients.sugars.amount} g`}{" "}
            per 100 {product.nutrition_basis ?? "g"}
          </p>
          <a
            className="block text-xs text-primary underline"
            href={product.url}
            target="_blank"
            rel="noreferrer"
          >
            Source: Open Food Facts · ODbL
          </a>
          <Button
            type="button"
            onClick={() => {
              onDraft({
                id: crypto.randomUUID(),
                revision: 0,
                name: product.name,
                description: product.description,
                nutrition_basis: product.nutrition_basis,
                nutrients: product.nutrients,
                kcal_per_100g: product.kcal_per_100g,
                protein_per_100g: product.protein_per_100g,
                carbs_per_100g: product.carbs_per_100g,
                fat_per_100g: product.fat_per_100g,
                portions: product.portions,
              });
              setProduct(null);
            }}
          >
            Review food draft
          </Button>
        </div>
      )}
    </Card>
  );
}
