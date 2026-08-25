import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleAuthorizationUrl,
  decryptGoogleTokens,
  encodeGoogleEmail,
  encryptGoogleTokens,
  GOOGLE_OAUTH_SCOPES,
  googleIntegrationConfigured,
  GoogleIntegrationError,
  type GoogleTokenBundle,
} from "@/lib/integrations/google";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");
const tokens: GoogleTokenBundle = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: 1_800_000_000_000,
  tokenType: "Bearer",
  scopes: [...GOOGLE_OAUTH_SCOPES],
};

function configureGoogle() {
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "client-secret");
  vi.stubEnv("GOOGLE_OAUTH_REDIRECT_URI", "https://harriett-app.vercel.app/api/integrations/google/callback");
  vi.stubEnv("CONNECTION_ENCRYPTION_KEY", encryptionKey);
}

afterEach(() => vi.unstubAllEnvs());

describe("Google integration", () => {
  it("requests offline individual consent for Gmail monitoring and Calendar events", () => {
    configureGoogle();
    const url = new URL(buildGoogleAuthorizationUrl({ state: "state-123", loginHint: "agent@example.com" }));

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("login_hint")).toBe("agent@example.com");
    expect(url.searchParams.get("scope")).toContain("gmail.modify");
    expect(url.searchParams.get("scope")).toContain("calendar.events");
  });

  it("reports whether every server credential is present", () => {
    expect(googleIntegrationConfigured()).toBe(false);
    configureGoogle();
    expect(googleIntegrationConfigured()).toBe(true);
  });

  it("round trips encrypted Google credentials", () => {
    const encrypted = encryptGoogleTokens(tokens, encryptionKey);
    expect(encrypted.tokenCiphertext).not.toContain("refresh-token");
    expect(decryptGoogleTokens(encrypted, encryptionKey)).toEqual(tokens);
  });

  it("rejects altered encrypted credentials", () => {
    const encrypted = encryptGoogleTokens(tokens, encryptionKey);
    encrypted.tokenCiphertext = `${encrypted.tokenCiphertext.slice(0, -2)}AA`;
    expect(() => decryptGoogleTokens(encrypted, encryptionKey)).toThrow(GoogleIntegrationError);
  });

  it("encodes a valid Gmail message for drafts and sends", () => {
    const encoded = encodeGoogleEmail({
      to: ["client@example.com"],
      subject: "Inspection follow-up",
      text: "Here is the update.",
    });
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    expect(decoded).toContain("To: client@example.com\r\n");
    expect(decoded).toContain("Subject: Inspection follow-up\r\n");
    expect(decoded).toContain("\r\n\r\nHere is the update.");
  });
});
