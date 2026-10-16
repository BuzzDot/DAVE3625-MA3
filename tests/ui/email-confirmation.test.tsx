import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
const { check } = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock("@/app/auth/confirm/actions", () => ({
  checkEmailConfirmation: check,
}));
import { EmailConfirmation } from "@/components/email-confirmation";
beforeEach(() => {
  check.mockReset();
  window.history.replaceState(null, "", "/auth/confirm");
});
afterEach(cleanup);
test("confirmation clears secret fragments and requires Supabase proof before displaying success", async () => {
  window.history.replaceState(
    null,
    "",
    "/auth/confirm#access_token=fixture-token&refresh_token=fixture-refresh",
  );
  check.mockResolvedValue("confirmed");
  render(<EmailConfirmation />);
  await screen.findByRole("heading", { name: "Email confirmed." });
  expect(check).toHaveBeenCalledWith("fixture-token");
  expect(window.location.hash).toBe("");
  expect(window.localStorage.length).toBe(0);
});
test("Supabase error fragments are not mistaken for success or submitted as tokens", async () => {
  window.history.replaceState(
    null,
    "",
    "/auth/confirm#error=access_denied&error_code=otp_expired&error_description=private-provider-detail",
  );
  render(<EmailConfirmation />);
  await screen.findByRole("heading", { name: "Confirmation needs attention." });
  expect(screen.getByRole("alert").textContent).toContain("Supabase rejected");
  expect(document.body.textContent).not.toContain("private-provider-detail");
  expect(check).not.toHaveBeenCalled();
  expect(window.location.hash).toBe("");
});
test("bare callback and forged tokens cannot claim email confirmation", async () => {
  render(<EmailConfirmation />);
  await screen.findByRole("heading", { name: "Confirmation needs attention." });
  expect(check).not.toHaveBeenCalled();
});
test("failed server verification never displays confirmation success", async () => {
  window.history.replaceState(
    null,
    "",
    "/auth/confirm#access_token=forged-token",
  );
  check.mockResolvedValue("invalid");
  render(<EmailConfirmation />);
  await waitFor(() =>
    expect(screen.getByRole("heading").textContent).toBe(
      "Confirmation needs attention.",
    ),
  );
});
