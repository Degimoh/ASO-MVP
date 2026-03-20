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

## OpenRouter

Set `OPENROUTER_API_KEY` in `.env` to use live generation.

If no key is set, the app uses a deterministic fallback template response so the MVP workflow still works.
