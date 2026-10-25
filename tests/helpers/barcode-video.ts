import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Independent EAN/UPC fixture encoder. The application decoder is not mocked.
// Generated video stays in ignored reports, never in the source repository.
const left = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const parity = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];
const invert = (s: string) =>
  [...s].map((c) => (c === "0" ? "1" : "0")).join("");
export function barcodeBits(input: string): string {
  if (!/^(?:\d{8}|\d{12}|\d{13})$/.test(input))
    throw new Error("EAN/UPC fixture code required");
  const digits = [...input].map(Number);
  const checksum = digits
    .slice(0, -1)
    .reverse()
    .reduce((s, n, i) => s + n * (i % 2 ? 1 : 3), 0);
  if ((10 - (checksum % 10)) % 10 !== digits.at(-1))
    throw new Error("Invalid fixture checksum");
  if (input.length === 8)
    return (
      "101" +
      digits
        .slice(0, 4)
        .map((n) => left[n])
        .join("") +
      "01010" +
      digits
        .slice(4)
        .map((n) => invert(left[n]))
        .join("") +
      "101"
    );
  const code = input.length === 12 ? `0${input}` : input;
  const pattern = parity[Number(code[0])];
  return (
    "101" +
    [...code.slice(1, 7)]
      .map((d, i) =>
        pattern[i] === "L"
          ? left[Number(d)]
          : invert([...left[Number(d)]].reverse().join("")),
      )
      .join("") +
    "01010" +
    [...code.slice(7)].map((d) => invert(left[Number(d)])).join("") +
    "101"
  );
}
export function barcodeVideo(code?: string): string {
  const directory = resolve("playwright-report/camera-fixtures");
  mkdirSync(directory, { recursive: true });
  const file = resolve(directory, `${code ?? "blank"}.y4m`);
  if (existsSync(file)) return file;
  const width = 640,
    height = 480;
  const frame = Buffer.alloc((width * height * 3) / 2, 128);
  frame.fill(235, 0, width * height);
  if (code) {
    const bits = barcodeBits(code);
    const scale = 4,
      x = Math.floor((width - bits.length * scale) / 2);
    for (let row = 110; row < 370; row++)
      for (let i = 0; i < bits.length; i++)
        if (bits[i] === "1")
          frame.fill(
            16,
            row * width + x + i * scale,
            row * width + x + (i + 1) * scale,
          );
  }
  writeFileSync(
    file,
    Buffer.concat([
      Buffer.from(
        `YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\nFRAME\n`,
      ),
      frame,
    ]),
  );
  return file;
}
