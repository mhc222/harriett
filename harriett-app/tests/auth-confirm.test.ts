import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/db/server", () => ({
  createUserClient: vi.fn(async () => ({ auth })),
}));

import { GET } from "@/app/auth/confirm/route";

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    auth.exchangeCodeForSession.mockReset();
    auth.verifyOtp.mockReset();
  });

  it("exchanges a PKCE authorization code before opening the dashboard", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest("https://harriett-app.vercel.app/auth/confirm?code=authorization-code")
    );

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("authorization-code");
    expect(response.headers.get("location")).toBe("https://harriett-app.vercel.app/");
  });

  it("rejects a PKCE authorization code when the exchange fails", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error("invalid code") });

    const response = await GET(
      new NextRequest("https://harriett-app.vercel.app/auth/confirm?code=invalid-code")
    );

    expect(response.headers.get("location")).toBe(
      "https://harriett-app.vercel.app/login?error=invalid_link"
    );
  });

  it("retains direct token-hash verification for hosted email templates", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest(
        "https://harriett-app.vercel.app/auth/confirm?token_hash=one-time-hash&type=email"
      )
    );

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "one-time-hash",
      type: "email",
    });
    expect(response.headers.get("location")).toBe("https://harriett-app.vercel.app/");
  });

  it("rejects malformed token-hash callback types", async () => {
    const response = await GET(
      new NextRequest(
        "https://harriett-app.vercel.app/auth/confirm?token_hash=one-time-hash&type=not-valid"
      )
    );

    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://harriett-app.vercel.app/login?error=invalid_link"
    );
  });
});
