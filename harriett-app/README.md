This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Property data

Harriett uses RentCast as the initial read-only source for public listing search,
property lookup and preliminary valuation comps. Set `RENTCAST_API_KEY` in
`.env.local` and in the Vercel project environment. Never expose this key through
a `NEXT_PUBLIC_` variable.

Authenticated property endpoints:

- `GET /api/properties/search?city=Tuscaloosa&state=AL&maxResults=10`
- `GET /api/properties/{rentcastListingId}`
- `GET /api/properties/value?address=123%20Main%20St%2C%20Tuscaloosa%2C%20AL%2035401`

Search and valuation responses carry a notice that the public data must be
verified in the MLS. The integration caps a single search at 25 results and
validates RentCast responses before returning them to users or AI tools.

## Agent SMS

Harriett uses Twilio Programmable Messaging for two-way SMS with enrolled
agents. Incoming messages post to `/api/webhooks/twilio`, are stored in
Supabase, and trigger the durable `process-agent-sms` task. Delivery updates
post to `/api/webhooks/twilio/status`.

Set the Twilio variables from `.env.example` locally and in Vercel. Keep
`TWILIO_SEND_ENABLED=false` while configuring or testing without delivery.
Changing it to `true` is the explicit release gate for every outbound path,
including automatic START, STOP, and HELP responses. The app still requires a
valid Twilio signature for inbound and delivery webhooks while sending is off.

Trial accounts can send only to numbers verified in Twilio. Harriett does not
hardcode that test recipient. The sender is `TWILIO_FROM_NUMBER`, while each
recipient comes from the enrolled agent's `agents.phone` value in E.164 format.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
