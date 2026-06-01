# CHAMP Health Care Services — Full-Stack Mobile App

A complete healthcare staffing management app for CHAMP Health Care Services (Ottawa, ON).

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo ~51) |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + bcrypt, Role-based |
| PDF | PDFKit |
| Storage | Supabase Storage or AWS S3 |
| Notifications | Expo Push Notifications |

---

## Project Structure

```
CHAMP-app/
├── backend/                    # Node.js API
│   ├── src/
│   │   ├── config/             # DB connection
│   │   ├── middleware/         # Auth, error handling
│   │   ├── routes/             # Express routes
│   │   ├── services/           # PDF, storage, notifications
│   │   └── utils/              # Holidays, pay periods
│   ├── migrations/             # Knex DB migrations
│   ├── seeds/                  # Test data
│   ├── .env.example
│   └── knexfile.js
│
└── mobile/                     # Expo React Native
    ├── src/
    │   ├── components/         # Reusable UI components
    │   ├── context/            # AuthContext
    │   ├── navigation/         # Stack + Tab navigators
    │   ├── screens/
    │   │   ├── auth/           # Login
    │   │   ├── admin/          # All admin screens
    │   │   └── employee/       # Employee screens
    │   ├── services/           # API client (Axios)
    │   └── utils/              # Colors, formatting
    ├── App.js
    └── app.json
```

---

## Quick Start

### 1. Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Get your connection string from Settings → Database
3. Enable Storage and create a bucket named `champ-documents` (set to public)

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env from example
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET, etc.

# Run migrations
npm run migrate

# Seed test data
npm run seed

# Start dev server
npm run dev
```

The API will run on `http://localhost:3000`.

### 3. Mobile App Setup

```bash
cd mobile
npm install

# Create .env
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend URL

# Start Expo
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `i` for iOS simulator / `a` for Android.

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=3000
NODE_ENV=development

# PostgreSQL (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# Storage (choose one)
STORAGE_PROVIDER=supabase            # or "s3"
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_STORAGE_BUCKET=champ-documents

# Push Notifications (optional)
EXPO_ACCESS_TOKEN=your_expo_token
```

### Mobile (`mobile/.env`)

```env
EXPO_PUBLIC_API_URL=http://your-backend-url/api
```

For local dev on a physical device, use your machine's IP instead of `localhost`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000/api
```

---

## Default Login Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Super Admin | champottawacsi@gmail.com | Champ2024! |
| Employee (any) | joanne@champ.ca | Employee123! |
| Employee | daljit@champ.ca | Employee123! |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/users | List employees (admin) |
| POST | /api/users | Create employee |
| GET | /api/clients | List clients |
| GET | /api/shifts | List shifts |
| POST | /api/shifts | Create shift |
| GET | /api/pay-periods/current | Current pay period |
| GET | /api/payroll/calculate/:id | Calculate payroll |
| POST | /api/payroll/generate-paystubs/:id | Generate PDFs |
| GET | /api/invoices/preview/:week_start | Preview invoices |
| POST | /api/invoices/generate | Generate invoice PDF |
| GET | /api/dashboard/admin | Admin dashboard data |
| GET | /api/dashboard/employee | Employee dashboard data |

---

## Business Logic

### Pay Periods
- Runs **Thursday → Wednesday** (14 days)
- Reference start: May 14, 2026
- Example: May 14 (Thu) → May 27 (Wed)

### Invoice Weeks
- Runs **Monday → Sunday** (independent of pay period)
- One invoice per client per week

### Payroll Hours vs Invoice Hours
- **Payroll** = actual hours (3pm–11pm = 7.5 hrs)
- **Invoice** = billed hours (standard shifts round to 8 hrs)

### Statutory Holidays
- Employee pay = **1.5x** (Time & Half)
- Client invoice = **2x** (Double rate)
- Auto-detected for Canadian federal + Ontario provincial holidays

### Deductions
- CPP: 5.95% of gross pay
- EI: 1.63% of gross pay
- Income Tax: Manual entry (use CRA calculator)
- Uber/Misc: Manual entry

### HST
- 13% on all client invoices
- HST#: 824640858RT0001

---

## Invoice Number Format

`[ABBREV][YY][M][FirstDay][LastDay]`

Example: Island View, week of May 20–25, 2026 → `IS2652025`

---

## Deployment

### Backend (Railway or Render)

1. Push backend to GitHub
2. Connect repo to Railway/Render
3. Set all environment variables
4. The `npm start` command runs `node src/server.js`

### Mobile (EAS Build)

```bash
npm install -g eas-cli
eas login
eas build --platform all
```

Update `EXPO_PUBLIC_API_URL` to your deployed backend URL before building.

---

## Company Info

**CHAMP Health Care Services**
920 Lesage Way, Orleans, ON K1W 0N3
Tel: 613-824-5065 | Fax: 613-366-3271
champottawacsi@gmail.com
HST# 824640858RT0001
