# SplitMint — AI-Powered Bill Splitting

> Split expenses smarter. Settle faster. Stress less.

SplitMint is a full-stack, production-ready bill-splitting application that combines real-time expense tracking with the power of AI. It goes beyond simple splitting — **MintSense AI** understands natural language, explains settlements, and acts as a personal finance assistant that knows your entire spending history across all groups.

---

## Live Demo

🔗 **[splitmint.vercel.app](https://split-mint-chi.vercel.app/)**

---

## What Makes SplitMint Different

Most expense-splitting apps make you fill out forms. SplitMint lets you just *talk*.

> *"Paid 840 for dinner with Rahul and Priya, split equally"*

That's it. MintSense AI parses the amount, description, participants, split mode, and category — and fills the entire form instantly.

---

## Features

### MintSense AI — Natural Language Expense Entry
- Describe expenses in plain English — AI pre-fills the entire form
- Powered by **Groq llama-3.3-70b-versatile** for near-instant responses
- Handles amounts, descriptions, payers, participants, dates, split modes, and categories automatically

### Smart Groups
- Create groups with unlimited participants
- Add, rename, or remove participants at any time
- Safe removal — linked expense detection prevents data corruption, with a force-remove option that cascades cleanly

### Flexible Expense Splitting
- **Equal** — divide evenly across selected participants
- **Custom** — specify exact amounts per person
- **Percentage** — assign % shares that auto-calculate to amounts
- Real-time preview of each person's share as you configure

### Balance Engine
- Net balance computation across all expenses and recorded settlements
- Pairwise debt matrix — see exactly who owes whom at a glance
- **Greedy minimal settlement algorithm** — reduces N debts to the fewest possible payments
- Settlements recorded in DB are reflected immediately in all balance calculations

### AI Explain & AI Summary
- **AI Explain** — MintSense narrates the settlement plan in plain, friendly language
- **AI Summary** — Get a conversational 3–5 sentence analysis of the group's spending patterns, top spenders, and biggest expenses

### MintSense Finance Chatbot
- Streaming AI chatbot with **full financial context awareness**
- Knows all your groups, all expenses, net balances, settlement status, and monthly trends
- **Time-aware** — understands "last month", "this month", "compare months"
- Context sent as compact plain text (not JSON) — ~35% fewer tokens, better reasoning
- Ask things like:
  - *"Who owes me money?"*
  - *"Which category do I spend most on?"*
  - *"How does this month compare to last month?"*
  - *"Which group costs me the most?"*

### Expense Filters & Search
- Full-text search across expense descriptions
- Filter by participant (payer or split member)
- Filter by date range
- Filter by amount range
- Active filter count badge with one-click clear

### Dashboard
- **Spent This Month**, **You Owe** (net after settlements), **Owed to You** (net), **Active Groups**
- Spending by Category pie chart (current month)
- Group list with all-time totals
- Recent activity feed with category icons
- All balance figures use the balance API — accurate after settlements, not raw expense sums

### Light / Dark Mode
- Toggles between **Mint & Cream** light theme and **Carbon Dark** theme
- Persisted via `next-themes` with no flash on load

### Auth
- Email/password registration with bcrypt hashing
- **Google OAuth** one-click sign-in
- JWT sessions via NextAuth.js v5

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animations | Framer Motion |
| Auth | NextAuth.js v5 — JWT + Google OAuth |
| Database | MongoDB Atlas + Mongoose |
| AI | Groq llama-3.3-70b-versatile |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Deployment | Vercel |

---

## Architecture Highlights

### Edge-Safe Auth Split
NextAuth v5 + Mongoose creates an edge/Node.js runtime conflict. Solved by splitting auth into:
- `lib/auth.config.ts` — edge-safe config (no Mongoose) used in `proxy.ts` for route protection
- `lib/auth.ts` — full config with Mongoose for API routes only

### Balance Engine (`lib/balance-engine.ts`)
Pure TypeScript, zero dependencies:
1. Net balance map from all expenses
2. Pairwise debt matrix with bidirectional netting
3. Greedy creditor-debtor matching for minimal settlement paths

Recorded settlements are injected as synthetic repayment expenses — the engine always reflects real-world payments without mutating historical expense records.

### Token-Efficient AI Context
The finance chatbot system prompt is built as compact plain text — same information as JSON but ~35% fewer tokens. LLMs reason better over natural language than over structured key/value data.

### Lazy MongoDB Connection
`connectDB()` uses a cached promise — one connection per serverless instance, reconnects gracefully on cold starts with no race conditions.

---

## Project Structure

```
splitmint/
├── app/
│   ├── (auth)/               # Login & Register pages
│   ├── (dashboard)/          # Dashboard, Groups, Profile
│   │   └── groups/[id]/      # Group detail + expense form
│   ├── api/                  # All API routes
│   └── page.tsx              # Landing page
├── components/
│   ├── layout/               # Navbar, Sidebar, ChatWidget, ThemeToggle
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── auth.ts               # NextAuth full config (Node.js)
│   ├── auth.config.ts        # Edge-safe auth config
│   ├── balance-engine.ts     # Debt matrix + settlement algorithm
│   ├── groq.ts               # Groq client
│   └── mongodb.ts            # Lazy connection singleton
├── models/                   # Mongoose schemas (User, Group, Expense, Settlement)
├── store/                    # Zustand global state
├── types/                    # TypeScript interfaces
└── proxy.ts                  # Next.js 16 route protection (replaces middleware)
```

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET / POST | `/api/groups` | List / create groups |
| GET / PUT / DELETE | `/api/groups/[id]` | Group CRUD |
| POST / PUT / DELETE | `/api/groups/[id]/participants` | Manage participants |
| GET / POST | `/api/expenses` | List with filters / create |
| PUT / DELETE | `/api/expenses/[id]` | Edit / delete expense |
| GET | `/api/balances/[groupId]` | Net balances + settlement suggestions |
| GET / POST / DELETE | `/api/settlements` | Record / clear settlements |
| POST | `/api/ai/parse-expense` | NLP → expense form fields |
| POST | `/api/ai/categorize` | Auto-categorize by description |
| GET | `/api/ai/summary/[groupId]` | AI narrative group summary |
| GET | `/api/ai/settle/[groupId]` | AI settlement explanation |
| POST | `/api/ai/chat` | Streaming finance chatbot |

---

## Running Locally

```bash
# Clone
git clone https://github.com/sidharth131102/SplitMint.git
cd SplitMint/splitmint

# Install dependencies
pnpm install

# Set up environment variables
# Create .env.local with the keys below

# Run dev server
pnpm dev
```

### Environment Variables

```env
MONGODB_URI=            # MongoDB Atlas connection string
NEXTAUTH_SECRET=        # Random secret (openssl rand -base64 32)
NEXTAUTH_URL=           # http://localhost:3000 in dev, Vercel URL in prod
GOOGLE_CLIENT_ID=       # Google OAuth client ID
GOOGLE_CLIENT_SECRET=   # Google OAuth client secret
GEMINI_API_KEY=         # Google AI Studio API key
GROQ_API_KEY=           # Groq API key (console.groq.com)
```

---

Built with Next.js 16 · Groq · MongoDB Atlas · Tailwind CSS v4
