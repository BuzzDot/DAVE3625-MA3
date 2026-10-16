// Explicit release tooling only. Never import this into application code.
// Use the existing Supabase CLI authority only for its own Management API.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { target } from "./hosted-access.mjs";
const execute = promisify(execFile);
async function cliAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN)
    return process.env.SUPABASE_ACCESS_TOKEN;
  if (process.platform === "win32") {
    // Supabase CLI v2.72 stores raw UTF-8 bytes under this exact service/profile.
    // Capture the helper's output in process memory, never in terminal/log output.
    const code = String.raw`Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class FormSupabaseCredential {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct Credential {
  public uint Flags,Type; public string TargetName,Comment; public long LastWritten;
  public uint Size; public IntPtr Blob; public uint Persist,AttributeCount;
  public IntPtr Attributes; public string TargetAlias,UserName;
 }
 [DllImport("advapi32.dll",EntryPoint="CredReadW",CharSet=CharSet.Unicode,SetLastError=true)]
 [return:MarshalAs(UnmanagedType.Bool)] static extern bool Read(string name,uint type,uint flags,out IntPtr credential);
 [DllImport("advapi32.dll")] static extern void CredFree(IntPtr credential);
 public static string Get() {
  foreach(string name in new[]{"Supabase CLI:supabase","Supabase CLI:access-token"}){
   IntPtr ptr; if(!Read(name,1,0,out ptr))continue;
   try {var c=(Credential)Marshal.PtrToStructure(ptr,typeof(Credential));var data=new byte[c.Size];Marshal.Copy(c.Blob,data,0,data.Length);return Encoding.UTF8.GetString(data);}
   finally {CredFree(ptr);}
  } return "";
 }
}
'@
[Console]::Write([FormSupabaseCredential]::Get())`;
    const result = await execute(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", code],
      { windowsHide: true },
    );
    if (/^sbp_(oauth_)?[a-f0-9]{40}$/.test(result.stdout.trim()))
      return result.stdout.trim();
  }
  try {
    return (
      await readFile(join(homedir(), ".supabase/access-token"), "utf8")
    ).trim();
  } catch {
    throw new Error(
      "Existing Supabase CLI management authority could not be loaded. Configure auth URLs in the Supabase dashboard.",
    );
  }
}
async function request(patch) {
  const { ref } = await target();
  const token = await cliAccessToken();
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/config/auth`,
    {
      method: patch ? "PATCH" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: patch ? JSON.stringify(patch) : undefined,
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      `Supabase auth configuration request failed (HTTP ${response.status}); credentials withheld. ${String(detail.message ?? "").slice(0, 600)}`,
    );
  }
  return response.json();
}
export async function readAuthConfiguration() {
  const settings = await request();
  return {
    site_url: settings.site_url,
    uri_allow_list: settings.uri_allow_list,
    signupEnabled: !settings.disable_signup,
    emailConfirmationRequired: !settings.mailer_autoconfirm,
    emailProviderEnabled: settings.external_email_enabled,
    passwordMinLength: settings.password_min_length,
    passwordRequiredCharacters: settings.password_required_characters,
    passwordHibpEnabled: settings.password_hibp_enabled,
    customSmtpConfigured: Boolean(settings.smtp_host),
    emailRateLimitPerHour: settings.rate_limit_email_sent,
    confirmationTemplateUsesTokenHash: String(
      settings.mailer_templates_confirmation_content ?? "",
    ).includes(".TokenHash"),
    confirmationTemplateVariables:
      String(settings.mailer_templates_confirmation_content ?? "").match(
        /\{\{[^}]+\}\}/g,
      ) ?? [],
    confirmationTemplateIsDefault:
      !settings.mailer_templates_confirmation_content,
  };
}
// Bounded, read-only diagnostics. Never select tokens, request bodies or URLs.
export async function readConfirmationLogs(keysOnly = false) {
  const { ref } = await target();
  const endpoint = new URL(
    `https://api.supabase.com/v1/projects/${ref}/analytics/endpoints/logs`,
  );
  endpoint.searchParams.set(
    "iso_timestamp_start",
    new Date(Date.now() - 3600000).toISOString(),
  );
  endpoint.searchParams.set("iso_timestamp_end", new Date().toISOString());
  endpoint.searchParams.set(
    "sql",
    keysOnly
      ? "select arrayJoin(mapKeys(log_attributes)) as key, count() as events from logs where source='auth_logs' group by key order by events desc limit 80"
      : "select timestamp, log_attributes['path'] as path, log_attributes['error_code'] as error_code, log_attributes['status'] as status, log_attributes['error'] as error_summary from logs where source='auth_logs' and log_attributes['path'] in ('/verify','/resend') order by timestamp desc limit 30",
  );
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${await cliAccessToken()}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `Auth log inspection failed (HTTP ${response.status}); details withheld.`,
    );
  const data = await response.json();
  if (Array.isArray(data.result))
    for (const row of data.result) {
      if (row.error_summary)
        row.error_summary = String(row.error_summary)
          .replace(/https?:\/\/\S+/g, "[URL]")
          .replace(/[\w.%+-]+@[\w.-]+/g, "[email]")
          .replace(/[A-Za-z0-9_-]{24,}/g, "[identifier]")
          .slice(0, 500);
    }
  return data;
}
export async function configureProductionAuth(origin) {
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.origin !== origin)
    throw new Error("Use a plain HTTPS production origin.");
  const current = await readAuthConfiguration();
  const allowed = new Set(
    String(current.uri_allow_list ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
  for (const callback of [
    `${origin}/auth/callback`,
    `${origin}/auth/confirm`,
    "http://localhost:3000/auth/callback",
    "http://localhost:3000/auth/confirm",
    "http://127.0.0.1:3000/auth/callback",
    "http://127.0.0.1:3000/auth/confirm",
  ])
    allowed.add(callback);
  await request({ site_url: origin, uri_allow_list: [...allowed].join(",") });
  return readAuthConfiguration();
}
