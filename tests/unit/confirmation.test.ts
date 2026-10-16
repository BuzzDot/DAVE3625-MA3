import { test } from "node:test";
import assert from "node:assert/strict";
import {
  confirmationFailure,
  confirmationMessage,
} from "../../src/lib/confirmation";
test("provider failures distinguish superseded email links, browser-bound codes and unknown errors", () => {
  assert.equal(confirmationFailure("otp_expired"), "expired");
  assert.equal(confirmationFailure("bad_code_verifier"), "browser");
  assert.equal(confirmationFailure("flow_state_not_found"), "browser");
  assert.equal(confirmationFailure("unexpected_failure"), "invalid");
  assert.match(confirmationMessage("expired"), /replaced by a newer email/);
  assert.doesNotMatch(confirmationMessage("invalid"), /email is confirmed/);
});
