"use server";
import { getViewer } from "@/lib/auth";
import {
  fetchBarcodeProduct,
  type BarcodeResult,
} from "@/lib/nutrition/barcode";

export async function lookupBarcode(input: unknown): Promise<BarcodeResult> {
  const viewer = await getViewer();
  if (!viewer.user)
    return {
      success: false,
      error: "Log in again before looking up food products.",
    };
  return fetchBarcodeProduct(input);
}
