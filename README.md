# BOTB – Best of The Bay

Full-stack e-commerce platform: React 18 frontend + Express/Prisma/PostgreSQL backend with crypto deposits, wallet system, and admin dashboard.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Frontend Setup](#frontend-setup)
5. [Backend Setup](#backend-setup)
6. [Environment Variables](#environment-variables)
7. [Database](#database)
8. [API Reference](#api-reference)
9. [Railway Deployment](#railway-deployment)
10. [Admin Access](#admin-access)

---

## Project Overview

BOTB is a marketplace with:
- **78 products** across categories: Flower (Exotic, Indoor, Mixed, Deps), Concentrates (In-House, Authentic Conc), Disposables (Authentic), Edibles
- **Crypto deposits**: BTC, LTC, DOGE (BlockCypher auto-forwarding), ETH (Alchemy HD wallet), XMR (manual)
- **USD wallet**: internal credit balance debited at checkout
- **Loyalty tiers**: Basic → Preferred → Gold → Platinum (cashback 0.5%–1.5%)
- **Admin dashboard**: analytics, order management, deposit confirmation, user management, support tickets

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite 5, CSS Modules |
| Backend | Node.js 20, Express 4, express-async-errors |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| Auth | JWT (access 15min + refresh) |
| Crypto BTC/LTC/DOGE | BlockCypher API |
| Crypto ETH | Alchemy webhooks + ethers.js BIP44 HD wallet |
| Deployment | Railway (Nixpacks) |

---

## Project Structure

```
react-src/
├── src/                          # React frontend
│   ├── context/CartContext.jsx   # Cart state (useReducer + localStorage)
│   ├── data/products.js          # 78 hardcoded products with CDN URLs
│   ├── data/categories.js        # Category tree + slug helpers
│   ├── components/               # Header, Footer, ProductCard, MiniCart
│   └── pages/                    # HomePage, CategoryPage, ProductDetailPage, CartPage, CheckoutPage
├── backend/                      # Express backend
│   ├── prisma/
│   │   ├── schema.prisma         # 15+ models
│   │   ├── seed.js               # Seeds admin + 78 products + categories
│   │   └── migrations/           # Prisma migration history
│   ├── src/
│   │   ├── server.js             # Entry point, CORS, routes mounting
│   │   ├── middleware/           # auth.js, error.js
│   │   ├── controllers/          # auth, users, products, orders, wallet, deposits, support, webhooks, admin/
│   │   ├── routes/               # auth, users, products, orders, wallet, deposits, support, webhooks, admin/
│   │   ├── services/             # crypto.service.js, wallet.service.js, order.service.js
│   │   └── utils/                # formatters.js
│   ├── .env                      # Local env (never committed)
│   ├── .env.example              # Template
│   ├── .gitignore
│   ├── .nixpacks.toml            # Railway Nixpacks config
│   ├── railway.toml              # Railway deploy config
│   └── package.json
├── FEATURES_PAYMENT_USERS_DASHBOARD.md
├── BACKEND_IMPLEMENTATION.md
└── README.md
```

---

## Frontend Setup

```bash
# from react-src/
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

**Design tokens:**

| Token | Value |
|---|---|
| Font | Manrope (200–800) |
| Base | #FFFFFF |
| Accent yellow | #FFEE58 |
| Accent pink | #F6CFF4 |
| Accent purple | #503AA8 |
| Accent gray | #686868 |
| Accent off-white | #FBFAF3 |

---

## Backend Setup

```bash
cd backend/
npm install
cp .env.example .env    # fill in your values

# Start dev server (requires running PostgreSQL)
npm run dev             # http://localhost:4000

# Seed database (admin + 78 products + categories)
node prisma/seed.js
```

---

## Environment Variables

Create `backend/.env` from this template:

```env
# Core
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/botb_db
FRONTEND_URL=http://localhost:5173

# Auth
JWT_SECRET=change_me_in_production_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_REFRESH_SECRET=change_me_in_production_xxxxxxxxxxxxxxxxxxxxxxxx

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
CDN_BASE_URL=

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Public URL for webhooks (must be reachable from internet)
PUBLIC_URL=https://your-backend-domain.com

# BlockCypher (BTC/LTC/DOGE) — https://accounts.blockcypher.com
BLOCKCYPHER_TOKEN=

# Alchemy (ETH) — https://dashboard.alchemy.com
ALCHEMY_API_KEY=
ALCHEMY_SIGNING_KEY=
ALCHEMY_AUTH_TOKEN=
ALCHEMY_WEBHOOK_ID=

# ETH HD Wallet — BIP39 mnemonic seed phrase (24 words)
ETH_HD_SEED=

# XMR global address
XMR_ADDRESS=

# Seed — admin credentials
ADMIN_USERNAME=duc237
ADMIN_PASSWORD=admin@1234
```

> **Railway:** set these as environment variables in the Railway service dashboard. `DATABASE_URL` is injected automatically by the Railway PostgreSQL plugin.

---

## Database

### Prisma Commands

```bash
# Generate client after schema changes
npx prisma generate

# Create and apply a new migration
npx prisma migrate dev --name <name>

# Apply pending migrations (production)
npx prisma migrate deploy

# Seed (idempotent — safe to run multiple times)
node prisma/seed.js

# Open Prisma Studio (GUI)
npx prisma studio
```

### Models

| Model | Purpose |
|---|---|
| User | Customers + admins (role: customer/moderator/admin) |
| Category | Self-referential tree (parent/children) |
| Brand | Product brands |
| Product | Products with stock, prices, images |
| ProductImage | Multiple images per product |
| Order | Customer orders (pending/processing/shipped/delivered/cancelled) |
| OrderItem | Line items per order |
| Deposit | Crypto deposit requests |
| Transaction | All balance movements (deposit/order/cashback/refund/adjustment) |
| SupportTicket | Customer support tickets |
| TicketMessage | Messages in support thread |
| Notification | In-app notifications per user |
| NewsArticle | Blog/news |
| FAQ | FAQ entries |
| Giveaway | Giveaway entries |
| Review | Product reviews (moderated) |
| ApiKey | API key management |
| SiteSetting | Key-value site settings |

### Loyalty Tiers

| Tier | Min Spent | Cashback |
|---|---|---|
| Basic | $0 | 0.5% |
| Preferred | $1,000 | 1.0% |
| Gold | $2,000 | 1.3% |
| Platinum | $5,000 | 1.5% |

---

## API Reference

All endpoints are prefixed with `/api`. Auth endpoints return `accessToken` (15min) and `refreshToken`.

**Response format:**
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```

**Auth header:** `Authorization: Bearer <accessToken>`

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns tokens |
| POST | `/api/auth/refresh` | No | Rotate access token |
| POST | `/api/auth/logout` | Yes | Invalidate refresh token |
| GET | `/api/auth/me` | Yes | Current user profile |

### Users (self)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users/profile` | Yes | Get own profile |
| PATCH | `/api/users/profile` | Yes | Update profile |
| PATCH | `/api/users/password` | Yes | Change password |

### Products

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | No | List with filters/pagination |
| GET | `/api/products/:slug` | No | Product detail |
| GET | `/api/products/:slug/related` | No | Related products |

**Query params:** `?category=<slug>&brand=<id>&search=<q>&minPrice=&maxPrice=&sort=newest|price_asc|price_desc|popular&page=1&limit=12`

### Categories & Brands

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/categories` | No | Full category tree |
| GET | `/api/brands` | No | All brands |

### Orders

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | Yes | Place order (debits wallet) |
| GET | `/api/orders` | Yes | Own orders history |
| GET | `/api/orders/:id` | Yes | Order detail |

**POST /api/orders body:**
```json
{
  "items": [{ "productId": "uuid", "quantity": 2 }],
  "shippingAddress": "123 Main St",
  "notes": "optional"
}
```

### Wallet

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/wallet/balance` | Yes | Balance + tier info |
| GET | `/api/wallet/transactions` | Yes | Transaction history |

### Deposits

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/deposits` | Yes | Create deposit (get crypto address) |
| GET | `/api/deposits` | Yes | Own deposits |
| GET | `/api/deposits/:id` | Yes | Deposit status |

**POST /api/deposits body:**
```json
{ "currency": "BTC" }
```

**Supported currencies:** `BTC`, `LTC`, `DOGE`, `ETH`, `XMR`

### Support Tickets

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/support/tickets` | Yes | Open new ticket |
| GET | `/api/support/tickets` | Yes | Own tickets |
| GET | `/api/support/tickets/:id` | Yes | Ticket + messages |
| POST | `/api/support/tickets/:id/messages` | Yes | Reply to ticket |

### Webhooks (no auth — signed by provider)

| Method | Path | Description |
|---|---|---|
| POST | `/api/webhooks/blockcypher` | BTC/LTC/DOGE deposit confirmation |
| POST | `/api/webhooks/alchemy` | ETH deposit confirmation |

### Admin — Dashboard & Analytics

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Moderator+ | Stats, charts, recent activity |
| GET | `/api/admin/analytics` | Admin | Full analytics (?period=7d/30d/90d/1y) |

### Admin — User Management

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/admin/users` | Moderator+ | List all users |
| GET | `/api/admin/users/:id` | Moderator+ | User detail + stats |
| PATCH | `/api/admin/users/:id/role` | Admin | Change user role |
| POST | `/api/admin/users/:id/adjust-balance` | Admin | Manual balance adjustment |
| POST | `/api/admin/users/:id/ban` | Admin | Ban/unban user |

### Admin — Orders

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/admin/orders` | Moderator+ | All orders |
| GET | `/api/admin/orders/:id` | Moderator+ | Order detail |
| PATCH | `/api/admin/orders/:id/status` | Moderator+ | Update status |
| POST | `/api/admin/orders/:id/refund` | Admin | Refund order |

### Admin — Products

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/admin/products` | Admin | Create product |
| PATCH | `/api/admin/products/:id` | Admin | Update product |
| DELETE | `/api/admin/products/:id` | Admin | Delete product |
| POST | `/api/admin/products/:id/images` | Admin | Upload images |
| DELETE | `/api/admin/products/:id/images/:imgId` | Admin | Remove image |

### Admin — Deposits

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/admin/deposits` | Moderator+ | All deposits |
| POST | `/api/admin/deposits/:id/confirm` | Moderator+ | Manually confirm deposit |
| POST | `/api/admin/deposits/:id/reject` | Admin | Reject deposit |

### Admin — Support

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/admin/support/tickets` | Moderator+ | All tickets |
| GET | `/api/admin/support/tickets/:id` | Moderator+ | Ticket detail |
| POST | `/api/admin/support/tickets/:id/reply` | Moderator+ | Staff reply |
| PATCH | `/api/admin/support/tickets/:id/status` | Moderator+ | Open/close ticket |
| PATCH | `/api/admin/support/tickets/:id/assign` | Moderator+ | Assign to agent |

### Admin — Content

| Method | Path | Role | Description |
|---|---|---|---|
| GET/POST | `/api/admin/categories` | Admin | List / Create |
| PATCH/DELETE | `/api/admin/categories/:id` | Admin | Update / Delete |
| GET/POST | `/api/admin/brands` | Admin | List / Create |
| PATCH/DELETE | `/api/admin/brands/:id` | Admin | Update / Delete |
| GET/POST | `/api/admin/news` | Admin | List / Create article |
| PATCH/DELETE | `/api/admin/news/:id` | Admin | Update / Delete |
| GET/POST | `/api/admin/faq` | Admin | List / Create FAQ |
| PATCH/DELETE | `/api/admin/faq/:id` | Admin | Update / Delete |
| GET/POST | `/api/admin/giveaways` | Admin | List / Create |
| PATCH/DELETE | `/api/admin/giveaways/:id` | Admin | Update / Delete |
| GET | `/api/admin/reviews` | Moderator+ | Pending reviews |
| PATCH | `/api/admin/reviews/:id/approve` | Moderator+ | Approve review |
| DELETE | `/api/admin/reviews/:id` | Moderator+ | Delete review |

### Admin — Settings

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/admin/settings` | Admin | All site settings |
| PATCH | `/api/admin/settings` | Admin | Update settings |

---

## Railway Deployment

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app) → New Project
2. **Deploy from GitHub repo** → select `yoroo-237/botb`
3. Set **Root Directory** to `backend`

### 2. Add PostgreSQL Plugin

1. In your Railway project → **+ New** → **Database** → **PostgreSQL**
2. `DATABASE_URL` is automatically injected into the backend service

### 3. Set Environment Variables

In the Railway backend service → **Variables**, add:

```
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-frontend-url.com
JWT_SECRET=<generate: openssl rand -hex 64>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 64>
PUBLIC_URL=https://<your-railway-backend-url>
BLOCKCYPHER_TOKEN=<from blockcypher.com>
ALCHEMY_API_KEY=<from dashboard.alchemy.com>
ALCHEMY_SIGNING_KEY=<from Alchemy webhook settings>
ALCHEMY_AUTH_TOKEN=<from Alchemy>
ALCHEMY_WEBHOOK_ID=<from Alchemy>
ETH_HD_SEED=<24-word BIP39 mnemonic — generate offline, keep secret>
XMR_ADDRESS=<your XMR address>
ADMIN_USERNAME=duc237
ADMIN_PASSWORD=admin@1234
```

### 4. Deploy

Railway auto-deploys on every push to `main`. The Nixpacks build runs:
1. `npm ci`
2. `npx prisma generate`
3. `npx prisma migrate deploy`
4. `node prisma/seed.js`

Then starts: `node src/server.js`

Health check: `GET /health` → `{ "status": "ok" }`

### 5. Custom Domain (optional)

Railway service → **Settings** → **Domains** → generate Railway domain or add custom domain.

### Nixpacks config (`backend/.nixpacks.toml`)

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = [
  "npx prisma generate",
  "npx prisma migrate deploy",
  "node prisma/seed.js"
]

[start]
cmd = "node src/server.js"
```

### Railway config (`backend/railway.toml`)

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node src/server.js"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

---

## Admin Access

After first deployment and seed:

| Field | Value |
|---|---|
| Username | `duc237` |
| Password | `admin@1234` |
| Role | `admin` |

Login via `POST /api/auth/login` with `{ "username": "duc237", "password": "admin@1234" }`.

> **Change the password immediately in production** via `PATCH /api/users/password` or directly in the database.

---

## Crypto Integration Notes

### BlockCypher (BTC / LTC / DOGE)
- Each deposit creates an auto-forwarding address via `POST /chains/:chain/payments`
- Confirmations trigger `POST /api/webhooks/blockcypher`
- Requires `BLOCKCYPHER_TOKEN` and `PUBLIC_URL` to be set

### Alchemy (ETH)
- Derives a unique BIP44 address per deposit: `m/44'/60'/0'/0/<depositId>`
- `ETH_HD_SEED` is a BIP39 mnemonic — generate securely and never expose
- Alchemy webhook `POST /api/webhooks/alchemy` confirms incoming transfers
- Requires `ALCHEMY_API_KEY`, `ALCHEMY_SIGNING_KEY`, `ALCHEMY_WEBHOOK_ID`

### XMR (Monero)
- Manual confirmation only — admin reviews transaction on the XMR blockchain
- Set `XMR_ADDRESS` env var; displayed to user on deposit page
- Admin confirms via `POST /api/admin/deposits/:id/confirm`

---

## Frontend Notes

- Product images use CDN URLs from `bestofthebay.net` — requires internet access
- Cart persisted to `localStorage` as `botb_cart`
- All 78 products are hardcoded in `src/data/products.js` and mirrored in the database seed
- Frontend must set `VITE_API_URL=https://your-backend-url.com/api` to connect to backend
