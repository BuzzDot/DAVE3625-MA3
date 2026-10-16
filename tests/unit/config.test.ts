import { test } from "node:test";
import assert from "node:assert/strict";
import {
  siteUrl,
  supabaseConfig,
  supabaseConfigured,
} from "../../src/lib/supabase/config";
test("configuration fails closed and rejects privileged keys without exposing their values", () => {
  const original = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    site: process.env.NEXT_PUBLIC_SITE_URL,
  };
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.equal(supabaseConfigured(), false);
    assert.throws(() => supabaseConfig(), /not configured/);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_example";
    assert.throws(() => supabaseConfig(), /secret key/);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
    assert.throws(() => supabaseConfig(), /privileged key/);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
    assert.equal(supabaseConfigured(), true);
    assert.equal(supabaseConfig().url, "http://127.0.0.1:54321");
    process.env.NEXT_PUBLIC_SITE_URL = "javascript:alert(1)";
    assert.throws(() => siteUrl(), /Invalid site URL/);
    process.env.NEXT_PUBLIC_SITE_URL = "https://fitness.example/path";
    assert.equal(siteUrl(), "https://fitness.example");
  } finally {
    for (const [env, value] of [
      ["NEXT_PUBLIC_SUPABASE_URL", original.url],
      ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", original.key],
      ["NEXT_PUBLIC_SITE_URL", original.site],
    ]) {
      if (value === undefined) delete process.env[env!];
      else process.env[env!] = value;
    }
  }
});
