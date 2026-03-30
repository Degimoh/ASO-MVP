# AI ASO Generator (MVP)

AI ASO Generator is a SaaS MVP for creating App Store Optimization assets with an editable workspace.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + reusable shadcn-style UI components
- Prisma ORM + PostgreSQL
- OpenRouter for AI generation
- Zod for API validation

## Core Features

- Dashboard with sidebar navigation
- Project creation form with all required ASO input fields
- Project workspace for generation + editing
- AI generation for:
  - App Store description
  - Keywords
  - Screenshot captions
  - Update notes
  - Localization
- Editable structured JSON outputs
- Save generation results to PostgreSQL
- Export project assets as JSON and TXT
- Usage logging for generation actions
- Internal credits wallet with crypto checkout support (mock or Coinbase Commerce)

## Architecture

```
app/
  api/
    projects/
    generate/
  dashboard/
components/
  dashboard/
  workspace/
  ui/
lib/
  ai/
  prompts/
  repositories/
  services/
  validations/
prisma/
  schema.prisma
  migrations/
```

## Prisma Models

- `User`
- `Project`
- `ProjectFeature`
- `ProjectLocale`
- `GenerationResult`
- `UsageLog`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env
```

3. Run database migration and generate Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

4. Start app:

```bash
npm run dev
```

Open http://localhost:3000.

5. Sign in:

- After running seed, use:
  - Email: `demo@aiaso.app`
  - Password: `demo-password`

## OpenRouter

Set `OPENROUTER_API_KEY` in `.env` to use live generation.

Screenshot creative text overlays default to Nano Banana models:
- `google/gemini-3-pro-image-preview` (Nano Banana Pro)
- fallback: `google/gemini-3.1-flash-image-preview` (Nano Banana 2)

You can override this with:
- `SCREENSHOT_CREATIVE_MODEL`
- `SCREENSHOT_CREATIVE_FALLBACK_MODEL`

If no key is set, the app uses a deterministic fallback template response so the MVP workflow still works.

## Internal Credits + Crypto Checkout

- Wallet APIs: `GET /api/wallet`, `POST /api/wallet/checkout`
- Mock confirmation API (for local testing): `POST /api/wallet/payments/[paymentId]/simulate-confirm`
- Coinbase Commerce webhook endpoint: `POST /api/webhooks/coinbase-commerce`
- Configure in `.env`:
  - `CRYPTO_PROVIDER=mock` (default) or `coinbase`
  - `COINBASE_COMMERCE_API_KEY`
  - `COINBASE_COMMERCE_WEBHOOK_SECRET`
