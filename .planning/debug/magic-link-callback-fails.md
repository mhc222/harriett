---
status: awaiting_human_verify
trigger: "sign in link not working, just bypass it and take me to next screen"
created: 2026-08-17
updated: 2026-08-17
---

# Symptoms

- expected_behavior: Clicking the Supabase magic link creates a secure session and opens the production dashboard.
- actual_behavior: A link is sent, but clicking it does not produce a usable dashboard session and the user returns to login.
- error_messages: No visible client or console error was reported.
- timeline: Observed in the current production deployment on 2026-08-17. No evidence that production magic-link login has worked previously.
- reproduction: Request a link at https://harriett-app.vercel.app/login, then click the emailed sign-in link.

# Current Focus

- hypothesis: createBrowserClient starts magic-link auth with PKCE, Supabase successfully verifies the emailed link and redirects to /auth/confirm with an authorization code, but the route ignores code and redirects to invalid_link instead of calling exchangeCodeForSession.
- test: Request a fresh production magic link in the browser that will open the email, click it once, and confirm the dashboard loads with a persistent authenticated session.
- expecting: Supabase verifies the one-time PKCE link, /auth/confirm exchanges its code using the verifier cookie, sets the session cookies, and the proxy allows the dashboard request.
- next_action: Await human verification with a fresh same-browser magic link; if it fails, capture the final callback URL and immediately query the correlated production auth logs.
- reasoning_checkpoint:
    hypothesis: createBrowserClient initiates a PKCE magic-link flow, but GET /auth/confirm ignores the successful verification redirect's code parameter, so it never exchanges that code for a cookie-backed session and always returns invalid_link.
    confirming_evidence:
      - Installed @supabase/ssr forces flowType pkce and signInWithOtp submits a code challenge while persisting its verifier in cookies.
      - Production Supabase logs show the magic-link /verify request completed successfully with HTTP 303 and identify the link as PKCE immediately before the observed return to login.
      - The focused regression test passes a code callback and directly observes zero calls to exchangeCodeForSession plus an invalid_link redirect.
    falsification_test: If the callback invokes exchangeCodeForSession with the received code and a successful exchange still produces no auth cookies or middleware rejects the resulting session, this hypothesis is incomplete and investigation must resume.
    fix_rationale: exchangeCodeForSession is the documented PKCE step that validates the one-time code against the verifier created during signInWithOtp, returns the session, and lets the existing SSR cookie adapter persist it before redirecting to the protected dashboard.
    blind_spots: A complete fresh-link test requires receiving a new production email; email clients that open links in a different browser will lack the PKCE verifier, so the hosted token-hash template recommended for passwordless SSR should also be evaluated after the code path is fixed.
- tdd_checkpoint: false

# Evidence

- timestamp: 2026-08-17T09:00:00-04:00
  observation: app/auth/confirm/route.ts accepts only token_hash and type.
- timestamp: 2026-08-17T09:00:00-04:00
  observation: Supabase official documentation states the default magic-link email returns the session in URL fragments, which server-side code cannot access, unless the hosted email template is customized to send token_hash.
- timestamp: 2026-08-17T09:00:00-04:00
  observation: The production browser remains at /login after requesting a link and shows no console error.
- timestamp: 2026-08-17T09:09:00-04:00
  observation: Installed @supabase/ssr 0.12.4 forces createBrowserClient and createServerClient to use flowType pkce; signInWithOtp sends a code challenge and stores the verifier in shared cookie storage.
- timestamp: 2026-08-17T09:10:00-04:00
  observation: The hosted Harriett Supabase magic-link template uses {{ .ConfirmationURL }} and its production site URL and redirect allow-list correctly target https://harriett-app.vercel.app/auth/confirm.
- timestamp: 2026-08-17T09:12:00-04:00
  observation: Production Supabase Auth logs show the emailed link was a PKCE magic link and GET /verify completed successfully with HTTP 303 before the app returned the user to login.
- timestamp: 2026-08-17T09:12:00-04:00
  observation: Supabase's official PKCE documentation states the post-verification redirect contains a code query parameter that must be exchanged with exchangeCodeForSession; app/auth/confirm/route.ts does not read code or call that method.
- timestamp: 2026-08-17T09:13:00-04:00
  observation: A focused route-handler test reproduced the bug before any production change; a code callback made zero calls to exchangeCodeForSession and redirected to invalid_link.
- timestamp: 2026-08-17T09:14:00-04:00
  observation: After the minimal route fix, four focused callback tests pass for successful PKCE exchange, failed PKCE exchange, successful token-hash verification, and rejection of an invalid OTP type.
- timestamp: 2026-08-17T09:15:00-04:00
  observation: Full verification passed with 38 unit tests, strict TypeScript, ESLint, and a production Next.js build; the build includes /auth/confirm as a dynamic route behind the existing proxy.
- timestamp: 2026-08-17T09:16:00-04:00
  observation: Vercel production deployment dpl_2dNvuPGC5u5Nr9B5Uu5YCkH4bYQb completed READY and was aliased to https://harriett-app.vercel.app.
- timestamp: 2026-08-17T09:16:00-04:00
  observation: Production smoke checks return login normally and reject both an invalid PKCE code and malformed token-hash type with invalid_link; Vercel reports the deployed /auth/confirm route healthy and uncached.
- timestamp: 2026-08-17T09:16:00-04:00
  observation: Supabase rejected the recommended hosted direct token-hash template update because email-template modification is unavailable on free-tier projects using the default email provider. A custom SMTP provider or paid plan is required; the hosted template remains unchanged with {{ .ConfirmationURL }}.
- timestamp: 2026-08-17T09:18:00-04:00
  observation: The final working tree, including bounded zod validation for PKCE codes and token hashes, passes all four focused callback regression tests.
- timestamp: 2026-08-17T09:18:00-04:00
  observation: The final working tree passes the full 38-test suite, strict TypeScript checking, and ESLint.
- timestamp: 2026-08-17T09:18:00-04:00
  observation: The final working tree production build succeeds and includes /auth/confirm as a dynamic route behind the existing authentication proxy.
- timestamp: 2026-08-17T09:19:00-04:00
  observation: Vercel deployment dpl_HnFrJDdMjppePhTM1BLVhRXqPdnN built the final working tree successfully, reached READY, and was aliased to https://harriett-app.vercel.app.
- timestamp: 2026-08-17T09:19:00-04:00
  observation: Production smoke checks confirm /login returns HTTP 200 and both an invalid PKCE code and malformed token-hash type return uncached HTTP 307 redirects to /login?error=invalid_link.

# Eliminated

- hypothesis: The production login is using the default implicit flow and only returns session tokens in a URL fragment.
  evidence: The installed @supabase/ssr browser client forces PKCE, and production auth logs show the verified email link token was generated for PKCE.
  timestamp: 2026-08-17T09:12:00-04:00

# Resolution

- root_cause: The production browser client initiated Supabase PKCE magic-link auth and Supabase verified the one-time email link, but app/auth/confirm/route.ts ignored the returned authorization code. It therefore never exchanged the code for a cookie-backed session and redirected every current hosted-template callback to invalid_link.
- fix: Accept the PKCE code in the callback, exchange it through the existing user-scoped Supabase SSR client, redirect only after a successful exchange, retain direct token-hash verification, and validate external OTP type values with zod.
- verification: The exact deployed tree passes focused callback tests 4/4, the full suite 38/38, strict TypeScript, ESLint, local production build, and Vercel production build. Deployment dpl_HnFrJDdMjppePhTM1BLVhRXqPdnN is READY at the production alias; /login is healthy and invalid production callbacks remain rejected. A fresh real email link still needs human verification because only the recipient can perform that final one-time flow.
- files_changed:
    - harriett-app/app/auth/confirm/route.ts
    - harriett-app/tests/auth-confirm.test.ts
