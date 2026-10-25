"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { lookupBarcode } from "@/app/nutrition/barcode-actions";
import { barcodeSchema, type BarcodeProduct } from "@/lib/nutrition/barcode";
import type { FoodInput } from "@/lib/nutrition/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MacroLine } from "./fields";

type Detector = {
  detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
type DetectorConstructor = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats: () => Promise<string[]>;
};

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
  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => stream?.getTracks().forEach((track) => track.stop());
    async function start() {
      try {
        const NativeDetector = (
          window as Window & { BarcodeDetector?: DetectorConstructor }
        ).BarcodeDetector;
        if (
          !window.isSecureContext ||
          !NativeDetector ||
          !navigator.mediaDevices?.getUserMedia
        ) {
          onError(
            "Camera scanning is unavailable in this browser. Enter the barcode below instead.",
          );
          return;
        }
        const supported = await NativeDetector.getSupportedFormats();
        const formats = ["ean_13", "ean_8", "upc_a", "upc_e"].filter((f) =>
          supported.includes(f),
        );
        if (disposed) return;
        if (!formats.length) {
          onError(
            "This browser cannot scan food barcodes. Enter the barcode below instead.",
          );
          return;
        }
        const detector = new NativeDetector({ formats });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (disposed || !video.current) {
          stop();
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        async function scan() {
          if (disposed || !video.current) return;
          try {
            const codes = await detector.detect(video.current);
            if (disposed) return;
            const code = codes.find(
              (c) => barcodeSchema.safeParse(c.rawValue).success,
            )?.rawValue;
            if (code) {
              stop();
              onDetected(code);
              return;
            }
            timer = setTimeout(scan, 400);
          } catch {
            stop();
            if (!disposed)
              onError(
                "The camera could not read barcodes. Enter the printed code below instead.",
              );
          }
        }
        if (!disposed) timer = setTimeout(scan, 400);
      } catch {
        stop();
        if (!disposed)
          onError(
            "Camera access was denied or the camera is unavailable. Allow camera access in browser settings, or enter the barcode below.",
          );
      }
    }
    void start();
    return () => {
      disposed = true;
      clearTimeout(timer);
      stop();
    };
  }, [onDetected, onError]);
  return (
    <div className="space-y-3">
      <p className="text-xs">
        Point the rear camera at the barcode. Camera images stay on your device.
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
  const lookup = useCallback(async (code: string) => {
    setCamera(false);
    setBarcode(code);
    setError("");
    setProduct(null);
    const parsed = barcodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
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
          <p className="text-xs">Per 100 g. Unknown nutrients stay unknown.</p>
          <MacroLine
            values={{
              kcal: product.kcal_per_100g,
              protein: product.protein_per_100g,
              carbs: product.carbs_per_100g,
              fat: product.fat_per_100g,
            }}
          />
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
