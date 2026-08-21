import { describe, expect, it } from "vitest";
import {
  assertSendAllowed,
  detectConsentIntent,
  smsDeliveryMode,
  smsGuardrailViolation,
  twilioSendingEnabled,
  validTwilioSignature,
} from "@/lib/sms";

describe("validTwilioSignature", () => {
  // Twilio's documented example request. The expected signature was generated
  // with the official twilio library (getExpectedTwilioSignature) to keep this
  // test non-circular.
  const authToken = "12345";
  const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
  const params = {
    CallSid: "CA1234567890ABCDE",
    Caller: "+14158675309",
    Digits: "1234",
    From: "+14158675309",
    To: "+18005551212",
  };
  const knownSignature = "RSOYDt4T1cUTdK1PDd93/VVr8B8=";

  it("matches the official twilio library's signature", () => {
    expect(validTwilioSignature(authToken, url, params, knownSignature)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(
      validTwilioSignature(authToken, url, { ...params, Digits: "9999" }, knownSignature)
    ).toBe(false);
  });

  it("rejects a wrong-length signature without throwing", () => {
    expect(validTwilioSignature(authToken, url, params, "short")).toBe(false);
  });
});

describe("twilioSendingEnabled", () => {
  it("defaults to dry-run and only enables live Twilio on explicit live mode", () => {
    const original = process.env.TWILIO_SEND_ENABLED;
    const originalMode = process.env.SMS_DELIVERY_MODE;
    delete process.env.SMS_DELIVERY_MODE;
    delete process.env.TWILIO_SEND_ENABLED;
    expect(twilioSendingEnabled()).toBe(false);
    expect(smsDeliveryMode()).toBe("dry_run");

    process.env.TWILIO_SEND_ENABLED = "false";
    expect(twilioSendingEnabled()).toBe(false);
    expect(smsDeliveryMode()).toBe("dry_run");

    process.env.TWILIO_SEND_ENABLED = "true";
    expect(twilioSendingEnabled()).toBe(false);
    expect(smsDeliveryMode()).toBe("dry_run");

    if (original === undefined) delete process.env.TWILIO_SEND_ENABLED;
    else process.env.TWILIO_SEND_ENABLED = original;
    if (originalMode === undefined) delete process.env.SMS_DELIVERY_MODE;
    else process.env.SMS_DELIVERY_MODE = originalMode;
  });

  it("treats dry-run mode as not live Twilio sending", () => {
    const original = process.env.TWILIO_SEND_ENABLED;
    const originalMode = process.env.SMS_DELIVERY_MODE;

    process.env.TWILIO_SEND_ENABLED = "true";
    process.env.SMS_DELIVERY_MODE = "dry_run";
    expect(smsDeliveryMode()).toBe("dry_run");
    expect(twilioSendingEnabled()).toBe(false);

    process.env.SMS_DELIVERY_MODE = "live";
    expect(smsDeliveryMode()).toBe("live");
    expect(twilioSendingEnabled()).toBe(true);

    if (original === undefined) delete process.env.TWILIO_SEND_ENABLED;
    else process.env.TWILIO_SEND_ENABLED = original;
    if (originalMode === undefined) delete process.env.SMS_DELIVERY_MODE;
    else process.env.SMS_DELIVERY_MODE = originalMode;
  });
});

describe("detectConsentIntent", () => {
  it("detects carrier keywords", () => {
    expect(detectConsentIntent("STOP")).toEqual({ intent: "opt_out", method: "keyword" });
    expect(detectConsentIntent("stop.")).toEqual({ intent: "opt_out", method: "keyword" });
    expect(detectConsentIntent("Quit")).toEqual({ intent: "opt_out", method: "keyword" });
    expect(detectConsentIntent("UNSUBSCRIBE")).toEqual({ intent: "opt_out", method: "keyword" });
    expect(detectConsentIntent("help")).toEqual({ intent: "help", method: "keyword" });
    expect(detectConsentIntent("START")).toEqual({ intent: "opt_in", method: "keyword" });
  });

  it("detects natural language opt-outs (any reasonable means)", () => {
    for (const msg of [
      "please stop texting me",
      "don't text me anymore",
      "Do not contact me again",
      "no more texts please",
      "take me off this list",
      "you have the wrong number",
    ]) {
      expect(detectConsentIntent(msg)?.intent).toBe("opt_out");
      expect(detectConsentIntent(msg)?.method).toBe("natural_language");
    }
  });

  it("does not opt out on ordinary messages", () => {
    for (const msg of [
      "Can you stop by the office later?",
      "The buyers want to stop at the house Friday",
      "What's the status on 604 2nd St?",
      "help me draft the net sheet",
    ]) {
      expect(detectConsentIntent(msg)?.intent).not.toBe("opt_out");
    }
  });
});

describe("smsGuardrailViolation", () => {
  it("blocks SHAFT content", () => {
    expect(smsGuardrailViolation("Join us for beer at the open house")).toBe("beer");
    expect(smsGuardrailViolation("Casino night fundraiser!")).toBe("casino");
    expect(smsGuardrailViolation("Firearms convey with the property")).toBe("firearms");
  });

  it("passes normal transaction content", () => {
    expect(
      smsGuardrailViolation(
        "Hi Jerrod, it's Harriett. The lead-based paint window on 604 2nd St NW closes Friday."
      )
    ).toBeNull();
  });
});

describe("assertSendAllowed", () => {
  const base = { id: "a", office_id: "o", name: "Test", phone: "+12055551234", sms_consent: "opted_in" };

  it("allows opted-in agents with a phone", () => {
    expect(() => assertSendAllowed(base)).not.toThrow();
  });

  it("blocks opted-out agents", () => {
    expect(() => assertSendAllowed({ ...base, sms_consent: "opted_out" })).toThrow(/not opted in/);
  });

  it("blocks agents who never consented", () => {
    expect(() => assertSendAllowed({ ...base, sms_consent: "none" })).toThrow(/not opted in/);
  });

  it("blocks agents without a phone", () => {
    expect(() => assertSendAllowed({ ...base, phone: null })).toThrow(/no phone/);
  });
});
