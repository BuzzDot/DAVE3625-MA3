import { beforeEach, expect, test, vi } from "vitest";
const { signup, resend, getUser } = vi.hoisted(() => ({
  signup: vi.fn(),
  resend: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@/lib/supabase/registration", () => ({
  createRegistrationClient: () => ({
    auth: { signUp: signup, resend, getUser },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: {} }),
}));
vi.mock("@/lib/supabase/config", () => ({
  supabaseConfigured: () => true,
  siteUrl: () => "https://fitness.example",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { authenticate, resendConfirmation } from "@/app/auth/actions";
import { checkEmailConfirmation } from "@/app/auth/confirm/actions";
beforeEach(() => {
  signup.mockReset();
  resend.mockReset();
  getUser.mockReset();
});
test("signup and resend use the same fixed production confirmation destination", async () => {
  const form = new FormData();
  form.set("email", "fixture@example.com");
  form.set("password", "Symbols!<>&Å123");
  signup.mockResolvedValue({ error: null });
  resend.mockResolvedValue({ error: null });
  expect((await authenticate("signup", {}, form)).error).toBeUndefined();
  expect((await resendConfirmation({}, form)).error).toBeUndefined();
  expect(signup.mock.calls[0][0].options.emailRedirectTo).toBe(
    "https://fitness.example/auth/confirm",
  );
  expect(resend.mock.calls[0][0].options.emailRedirectTo).toBe(
    "https://fitness.example/auth/confirm",
  );
});
test("resend failures are not falsely reported as a requested confirmation", async () => {
  resend.mockResolvedValue({ error: { code: "unexpected_failure" } });
  const form = new FormData();
  form.set("email", "fixture@example.com");
  const result = await resendConfirmation({}, form);
  expect(result.error).toBeTruthy();
  expect(result.message).toBeUndefined();
});
test("confirmation requires a provider-verified token belonging to a confirmed email", async () => {
  expect(await checkEmailConfirmation("invalid")).toBe("invalid");
  expect(getUser).not.toHaveBeenCalled();
  getUser.mockResolvedValueOnce({
    error: null,
    data: { user: { email_confirmed_at: null } },
  });
  expect(await checkEmailConfirmation("test.jwt.signature")).toBe("invalid");
  getUser.mockResolvedValueOnce({
    error: { status: 401 },
    data: { user: null },
  });
  expect(await checkEmailConfirmation("test.jwt.signature")).toBe("invalid");
  getUser.mockResolvedValueOnce({
    error: null,
    data: { user: { email_confirmed_at: "2026-10-16T20:00:00Z" } },
  });
  expect(await checkEmailConfirmation("test.jwt.signature")).toBe("confirmed");
});
