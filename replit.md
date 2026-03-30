# Express Gold Investments — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Full-stack crypto investment platform "Express Gold Investments" with dark gold/amber luxury aesthetic.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS) / Vite (frontend)

## Platform Details

**Company**: Express Gold Investment Limited
**Reg No**: 01387452 (England & Wales, Apr 9, 2020)
**Address**: Celia Court, West Ewell, Epsom, KT17 1DW, Surrey, UK
**BTC Deposit Address**: `bc1qujrqrs6us5l0t2g9kagc0yc84daxcpzzzj5stv`
**Admin**: username=`expressgold_admin`, password=`Admin@ExpressGold2024`

## Artifacts

### `artifacts/crypto-investment` — Frontend (React + Vite)

Full landing page + authenticated app. Runs at `/`.

**Public Pages:**
- `/` — Full homepage (no sidebar): hero, live prices, 4 investment plan cards, profit calculator, about section, video placeholder, certificate, company address, FAQ, footer
- `/login` — Login with redirect to /dashboard
- `/signup` — Registration with BTC wallet address, referral code (?ref=CODE), language selector

**Authenticated Pages (own nav, no sidebar):**
- `/dashboard` — User dashboard: welcome + live clock, 3 action buttons, 4 stat cards, referral link, active investments, transaction history, withdraw modal
- `/invest` — Plan selection: 4 radio-button plan cards (Starter/Pro/VIP/Savings), amount input, SPEND button
- `/deposit?plan=X&amount=Y` — QR code + BTC address, investment summary table, "I have made the deposit" → notifies admin

**Sidebar Pages (AppLayout):**
- `/portfolio` — Portfolio tracker
- `/watchlist` — Watchlist
- `/admin` — Admin panel (adminOnly): withdrawals approve/reject, deposit confirmation, bonus gifts, user list

**Investment Plans:**
| Plan | ROI | Duration | Min | Max |
|------|-----|----------|-----|-----|
| Starter | 5% | 3 days | $1,000 | $10,000 |
| Pro | 12.5% | 2 days | $10,000 | $20,000 |
| VIP | 20% | 1 day | $20,000 | Unlimited |
| Savings | 5% | Daily | Any | Unlimited |

**Languages**: English, Français, Español, Deutsch, Русский, العربية (via `src/lib/language-context.tsx`)
**Auth**: JWT tokens stored in localStorage (`egi_token`)

### `artifacts/api-server` — Express API Server

Runs at `/api`. All routes under:

**Auth:**
- `POST /api/auth/signup` — creates account, generates referral code (USERNAME-XXXXXX format), accepts `bitcoinWalletAddress`, `referredBy`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

**Users:**
- `GET /api/users/dashboard` — full dashboard data (user fields + investments + recent transactions)
- `GET /api/users/transactions`
- `POST /api/users/deposit-notify` — user notifies BTC deposit sent; creates pending transaction for admin

**Withdrawals:**
- `POST /api/withdrawals/request` — submit withdrawal request

**Admin (adminOnly):**
- `GET /api/admin/users`
- `GET /api/admin/withdrawals` — all withdrawal requests
- `POST /api/admin/withdrawals/:id/approve` — approve + credit totalWithdrawn
- `POST /api/admin/withdrawals/:id/reject` — reject + refund balance
- `GET /api/admin/deposits` — pending BTC deposit notifications
- `POST /api/admin/deposits/:id/confirm` — confirm deposit, create investment, update activeDeposits
- `POST /api/admin/bonus` — give bonus to user by username/email

**Crypto:**
- `GET /api/crypto/market?limit=N&offset=N` — live prices via CoinGecko (60s memory cache, DB fallback)

**Investments:**
- `GET /api/investments/plans`
- `GET /api/investments`
- `POST /api/investments`

## Database Schema

Tables:
- `users` — accounts with `balance`, `savingsBalance`, `totalEarnings`, `todayEarnings`, `activeDeposits`, `totalWithdrawn`, `referralCode`, `referredBy`, `bitcoinWalletAddress`
- `investment_plans` — seeded plans (starter, pro, vip)
- `user_investments` — active/completed investments per user
- `transactions` — all money events (deposit, withdrawal, earnings, bonus, savings_interest, savings_deposit)
- `withdrawal_requests` — pending/completed withdrawal requests
- `crypto_assets` — cached market data
- `portfolio` — user portfolio holdings
- `watchlist` — user watchlist

## Structure

```text
artifacts/
├── api-server/        # Express backend
└── crypto-investment/ # React + Vite frontend
    └── src/
        ├── lib/
        │   ├── auth-context.tsx      # JWT auth (login/signup/logout/refreshUser)
        │   └── language-context.tsx  # 6-language i18n (useLang hook)
        ├── pages/
        │   ├── market.tsx    # Homepage (public, no sidebar)
        │   ├── dashboard.tsx # User dashboard (authenticated)
        │   ├── invest.tsx    # Plan selection (authenticated)
        │   ├── deposit.tsx   # Deposit confirmation + QR (authenticated)
        │   ├── login.tsx
        │   ├── signup.tsx
        │   └── admin.tsx     # Admin panel (admin role)
        └── App.tsx           # Routes: public full-page + authenticated full-page + sidebar
lib/
├── db/src/schema/    # Drizzle schema files
└── ...
scripts/
└── src/
    └── daily-earnings.ts  # Run daily at 8 AM: pnpm --filter @workspace/scripts run daily-earnings
```

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/crypto-investment run dev` — start frontend
- `pnpm --filter @workspace/scripts run daily-earnings` — run daily earnings job (8 AM UTC)
- `pnpm --filter @workspace/scripts run seed-crypto` — seed market data

## Referral System

- Referral codes auto-generated on signup: `USERNAME-XXXXXX` format
- Referral links: `https://domain.com/signup?ref=CODE`
- Referral bonus: 5% of referred user's first deposit (credited immediately)
- Referred user's `referredBy` stored as the referral code string
