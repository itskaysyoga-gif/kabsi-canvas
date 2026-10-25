import assert from "node:assert/strict";
import { isAllowedTestRecipient } from "./test-recipient.ts";

Deno.test(
  "the test route sends only to hello@kabsi.co, mail-tester.com and the listed test addresses",
  () => {
    assert.equal(isAllowedTestRecipient("hello@kabsi.co", ""), true);
    assert.equal(isAllowedTestRecipient(" Hello@Kabsi.co ", ""), true);
    assert.equal(isAllowedTestRecipient("test-ab12cd@srv1.mail-tester.com", ""), true);
    assert.equal(isAllowedTestRecipient("test-ab12cd@mail-tester.com", ""), true);
    assert.equal(isAllowedTestRecipient("someone@evilmail-tester.com", ""), false);
    assert.equal(isAllowedTestRecipient("a@mail-tester.com.evil.test", ""), false);
    assert.equal(isAllowedTestRecipient("owner@example.test", ""), false);
    assert.equal(
      isAllowedTestRecipient("owner@example.test", "x@y.test, Owner@Example.test"),
      true,
    );
    assert.equal(isAllowedTestRecipient("owner@example.test", "owner@example.test.evil"), false);
    assert.equal(isAllowedTestRecipient("a@b.test,c@d.test", "a@b.test,c@d.test"), false);
    assert.equal(isAllowedTestRecipient("", ""), false);
  },
);
