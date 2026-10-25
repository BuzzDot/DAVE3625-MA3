// Explicit Node test instrumentation. Never imported by production application code.
import { offLiquids } from "../fixtures/off-liquids.mjs";
if (process.env.FORM_OFF_FIXTURES !== "1")
  throw new Error("OFF fixture preload requires explicit local test mode.");
if (
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname,
  )
)
  throw new Error("OFF fixtures require an isolated local Supabase URL.");
const original = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  if (url.origin === "https://world.openfoodfacts.org") {
    const code = url.pathname.match(/^\/api\/v3\/product\/(\d+)\.json$/)?.[1];
    if (code && offLiquids[code])
      return Response.json({ product: offLiquids[code] });
  }
  return original(input, options);
};
