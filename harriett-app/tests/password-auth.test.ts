import { describe, expect, it } from "vitest";
import { accountEmailSchema, accountPasswordSchema, inviteSignupSchema } from "@/lib/auth/password";

describe("password account validation", () => {
  it("normalizes an office email", () => {
    expect(accountEmailSchema.parse("  MCRONIN@PRITCHETT-MOORE.COM ")).toBe(
      "mcronin@pritchett-moore.com"
    );
  });

  it("requires a twelve character password", () => {
    expect(accountPasswordSchema.safeParse("short-pass").success).toBe(false);
    expect(accountPasswordSchema.safeParse("a useful long password").success).toBe(true);
  });

  it("requires the private invitation token", () => {
    expect(
      inviteSignupSchema.safeParse({
        email: "mcronin@pritchett-moore.com",
        password: "a useful long password",
        token: "too-short",
      }).success
    ).toBe(false);
  });
});
