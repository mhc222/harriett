import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMetaAuthorizationUrl,
  deleteFacebookPagePost,
  decryptMetaTokens,
  encryptMetaTokens,
  listManagedFacebookPages,
  META_OAUTH_SCOPES,
  metaIntegrationConfigured,
  publishFacebookPagePost,
  type MetaPage,
  type MetaTokenBundle,
} from "@/lib/integrations/meta";

const encryptionKey = Buffer.alloc(32, 11).toString("base64");
const page: MetaPage = {
  id: "123456789",
  name: "Test Realty",
  accessToken: "page-access-token",
  tasks: ["PROFILE_PLUS_CREATE_CONTENT"],
  pictureUrl: null,
};
const tokens: MetaTokenBundle = {
  userAccessToken: "user-access-token",
  userExpiresAt: 1_900_000_000_000,
  scopes: [...META_OAUTH_SCOPES],
  pages: [page],
};

function configureMeta() {
  vi.stubEnv("META_APP_ID", "meta-app-id");
  vi.stubEnv("META_APP_SECRET", "meta-app-secret");
  vi.stubEnv("META_LOGIN_CONFIG_ID", "1590866072451537");
  vi.stubEnv("META_OAUTH_REDIRECT_URI", "https://harriett-app.vercel.app/api/integrations/meta/callback");
  vi.stubEnv("META_GRAPH_API_VERSION", "v25.0");
  vi.stubEnv("CONNECTION_ENCRYPTION_KEY", encryptionKey);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Meta integration", () => {
  it("requests the Facebook Page permissions and preserves OAuth state", () => {
    configureMeta();
    const url = new URL(buildMetaAuthorizationUrl({ state: "state-123" }));

    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.pathname).toBe("/v25.0/dialog/oauth");
    expect(url.searchParams.get("client_id")).toBe("meta-app-id");
    expect(url.searchParams.get("config_id")).toBe("1590866072451537");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("override_default_response_type")).toBe("true");
    expect(url.searchParams.has("scope")).toBe(false);
  });

  it("reports whether every server credential is present", () => {
    expect(metaIntegrationConfigured()).toBe(false);
    configureMeta();
    expect(metaIntegrationConfigured()).toBe(true);
  });

  it("round trips encrypted Meta credentials without exposing tokens", () => {
    const encrypted = encryptMetaTokens(tokens, encryptionKey);
    expect(encrypted.tokenCiphertext).not.toContain("page-access-token");
    expect(decryptMetaTokens(encrypted, encryptionKey)).toEqual(tokens);
  });

  it("recognizes Pages with Meta's classic content-management task names", async () => {
    configureMeta();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      data: [
        {
          id: "123456789",
          name: "Publishable Realty",
          access_token: "publishable-page-token",
          tasks: ["ANALYZE", "CREATE_CONTENT", "MANAGE"],
        },
        {
          id: "987654321",
          name: "Analytics Only Realty",
          access_token: "analytics-page-token",
          tasks: ["ANALYZE"],
        },
      ],
    }), { status: 200 }));

    await expect(listManagedFacebookPages("user-access-token")).resolves.toEqual([
      {
        id: "123456789",
        name: "Publishable Realty",
        accessToken: "publishable-page-token",
        tasks: ["ANALYZE", "CREATE_CONTENT", "MANAGE"],
        pictureUrl: null,
      },
    ]);
  });

  it("publishes the exact approved message and link to the selected Page", async () => {
    configureMeta();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "123456789_987" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "123456789_987",
        permalink_url: "https://www.facebook.com/123456789/posts/987",
        is_published: true,
        is_hidden: false,
      }), { status: 200 }));

    const result = await publishFacebookPagePost({
      page,
      message: "A verified listing update.",
      link: "https://example.com/listing",
    });

    expect(result).toEqual({
      postId: "123456789_987",
      permalinkUrl: "https://www.facebook.com/permalink.php?story_fbid=987&id=123456789",
      verificationStatus: "graph_confirmed",
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(String(requestUrl)).toContain("/v25.0/123456789/feed");
    expect(requestInit?.method).toBe("POST");
    expect(String(requestInit?.body)).toContain("message=A+verified+listing+update.");
    expect(String(requestInit?.body)).toContain("link=https%3A%2F%2Fexample.com%2Flisting");
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer page-access-token");
  });

  it("publishes a verified listing image through the Page photos endpoint", async () => {
    configureMeta();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "photo-987",
        post_id: "123456789_654",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "123456789_654",
        permalink_url: "https://www.facebook.com/123456789/posts/654",
        is_published: true,
        is_hidden: false,
      }), { status: 200 }));

    await expect(publishFacebookPagePost({
      page,
      message: "See the full listing at https://www.pritchett-moore.com/properties/175589/details",
      imageUrl: "https://assets.caboosecms.com/media/listing-image.jpg",
    })).resolves.toEqual({
      postId: "123456789_654",
      permalinkUrl: "https://www.facebook.com/permalink.php?story_fbid=654&id=123456789",
      verificationStatus: "graph_confirmed",
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(String(requestUrl)).toContain("/v25.0/123456789/photos");
    expect(String(requestInit?.body)).toContain("caption=See+the+full+listing");
    expect(String(requestInit?.body)).toContain("url=https%3A%2F%2Fassets.caboosecms.com%2Fmedia%2Flisting-image.jpg");
    expect(String(requestInit?.body)).toContain("published=true");
  });

  it("does not retry a created post when the permalink lookup fails", async () => {
    configureMeta();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "123456789_987" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Not available", code: 100 } }), { status: 400 }));

    await expect(publishFacebookPagePost({ page, message: "Approved post." })).resolves.toEqual({
      postId: "123456789_987",
      permalinkUrl: null,
      verificationStatus: "unverified",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deletes the exact Page post with the Page access token", async () => {
    configureMeta();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    await expect(deleteFacebookPagePost({ page, postId: "123456789_987" })).resolves.toBeUndefined();

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(String(requestUrl)).toContain("/v25.0/123456789_987");
    expect(requestInit?.method).toBe("DELETE");
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe("Bearer page-access-token");
  });
});
