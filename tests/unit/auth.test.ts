import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authCredentials,
  authErrorMessage,
} from "../../src/lib/auth-validation";

test("signup accepts strong symbols without transforming passwords and enforces UTF-8 byte limits", () => {
  const schema = authCredentials("signup");
  const password = "Å!<>$`\\\"' " + "a".repeat(40);
  assert.equal(
    schema.parse({ email: "test@example.com", password }).password,
    password,
  );
  assert.equal(
    schema.safeParse({ email: "test@example.com", password: "A".repeat(72) })
      .success,
    true,
  );
  assert.equal(
    schema.safeParse({ email: "test@example.com", password: "A".repeat(73) })
      .success,
    false,
  );
  assert.equal(
    schema.safeParse({ email: "test@example.com", password: "å".repeat(37) })
      .success,
    false,
  );
  assert.equal(
    schema.safeParse({ email: "test@example.com", password: "short" }).success,
    false,
  );
});

test("login preserves credentials accepted under earlier policies", () => {
  assert.equal(
    authCredentials("login").parse({
      email: "test@example.com",
      password: " old! ",
    }).password,
    " old! ",
  );
});

test("auth errors explain delivery and rate limits without returning provider internals", () => {
  assert.match(
    authErrorMessage("over_email_send_rate_limit", "signup"),
    /Wait a few minutes/,
  );
  assert.match(
    authErrorMessage("email_address_not_authorized", "signup"),
    /Email delivery is restricted/,
  );
  assert.match(
    authErrorMessage("email_not_confirmed", "login"),
    /Confirm your email/,
  );
  assert.equal(
    authErrorMessage("user_not_found", "login"),
    authErrorMessage("invalid_credentials", "login"),
  );
});
