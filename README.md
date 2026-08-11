# MoneyFlow — Personal Finance OS (MERN)

A full-stack personal finance management web app built with the MERN stack.

**Features**
- Auth: Email/password + Google OAuth (JWT)
- Modules: Salary, Bonus, Expense, Saving, Remittance, Exchange Log, Plan/Goals, Notes
- Multi-currency (USD / KHR / THB) with user-adjustable exchange rates + automatic `amountUSD` normalization
- Themes, language (English / Khmer), default currency preferences
- Filtering, pagination, grid/table/list views, backup/export, delete-all
- Dashboard summaries + Reports with charts (Recharts)
- Cloudinary image uploads

## Tech Stack

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS + Recharts |
| Backend   | Node.js + Express + Mongoose              |
| Database  | MongoDB Atlas                             |
| Auth      | JWT + Passport.js (Google OAuth)          |
| Uploads   | Cloudinary                                |
| Hosting   | Vercel (client) / Render (server)         |

## Project Structure

```
moneyflow-app/
├── client/                 # React + Vite frontend
├── server/                 # Express + MongoDB backend
├── shared/                 # Shared constants & types
├── docs/                   # API & schema docs
├── scripts/                # Seed / migration scripts
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Google Cloud Console OAuth credentials (for Google login)
- Cloudinary account (for image uploads)

## 1. Clone / Setup

```bash
cd moneyflow-app
```

## 2. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env with your real values (see below)
npm install
npm run dev
```

### server/.env (required)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/moneyflow?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret_here
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

> **Security note**: Never commit real `.env` files. Rotate any secrets that were previously shared in plain text.

## 3. Frontend Setup

```bash
cd ../client
cp .env.example .env
npm install
npm run dev
```

### client/.env

```env
VITE_API_URL=http://localhost:5000/api
```

## 4. Run Both

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## API Overview

All protected routes require header:

```
Authorization: Bearer <JWT>
```

| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| POST   | /api/auth/register              | Register                     |
| POST   | /api/auth/login                 | Login                        |
| GET    | /api/auth/google                | Start Google OAuth           |
| GET    | /api/auth/me                    | Current user                 |
| PUT    | /api/auth/profile               | Update profile / preferences |
| PUT    | /api/auth/password              | Change password              |
| POST   | /api/auth/forgot-password       | Request reset                |
| PUT    | /api/auth/reset-password        | Reset password               |
| CRUD   | /api/expenses                   | Expenses                     |
| CRUD   | /api/salaries                   | Salaries                     |
| CRUD   | /api/bonuses                    | Bonuses                      |
| CRUD   | /api/savings                    | Savings                      |
| CRUD   | /api/remittances                | Remittances                  |
| CRUD   | /api/exchange-logs              | Exchange logs                |
| CRUD   | /api/plans                      | Plans / Goals                |
| CRUD   | /api/notes                      | Notes                        |
| GET    | /api/reports/summary            | Dashboard aggregates         |
| GET    | /api/reports/charts             | Chart data                   |

## Currency Conversion Logic

Every money record stores:
- `amount` + `currency` (original)
- `amountUSD` (normalized using the user’s current `exchangeRateKhr` / `exchangeRateThb`)

Reports and dashboard totals always use `amountUSD` for consistency.

## Build Order (Recommended)

1. Auth + User preferences
2. Expense CRUD + basic dashboard
3. Salary + Bonus
4. Saving + Plan
5. Remittance + Exchange Log
6. Notes board
7. Full Reports / Charts
8. Polish (themes, i18n, export)

## Scripts

```bash
# Backend
cd server && npm run seed      # Seed sample data (optional)

# Frontend
cd client && npm run build     # Production build
```

## License

MIT — free for personal & educational use.

---

**Next steps after cloning**
1. Fill `.env` files with your credentials.
2. Start server then client.
3. Register a local account or use Google login.
4. Begin with Expenses (the core daily loop).

For detailed API contracts and model fields see `docs/`.
