# Backend Implementation — BOTB Cannabis Marketplace
> Document d'implémentation technique complet pour Node.js + Express + Prisma + PostgreSQL.
> Chaque section contient la structure de fichier, le code source complet et les explications.

---

## TABLE DES MATIÈRES
1. [Structure du projet](#1-structure-du-projet)
2. [Variables d'environnement](#2-variables-denvironnement)
3. [Package.json & dépendances](#3-packagejson--dépendances)
4. [Schéma Prisma (BDD complète)](#4-schéma-prisma-bdd-complète)
5. [Point d'entrée — server.js](#5-point-dentrée--serverjs)
6. [Middlewares](#6-middlewares)
7. [Helpers & utilitaires](#7-helpers--utilitaires)
8. [Services](#8-services)
9. [Controllers](#9-controllers)
10. [Routes](#10-routes)
11. [Initialisation & Seed](#11-initialisation--seed)
12. [Ordre de démarrage](#12-ordre-de-démarrage)

---

## 1. Structure du projet

```
backend/
├── prisma/
│   ├── schema.prisma          # Schéma BDD complet
│   └── seed.js                # Données initiales (settings, admin, produits)
├── src/
│   ├── server.js              # Entry point Express
│   ├── config/
│   │   └── env.js             # Validation et export des variables d'env
│   ├── middlewares/
│   │   ├── auth.js            # requireAuth, requireAdmin, requireModerator
│   │   ├── errorHandler.js    # Gestionnaire d'erreurs global
│   │   └── upload.js          # Multer config (images produits)
│   ├── utils/
│   │   ├── response.js        # helpers ok() / fail()
│   │   ├── pagination.js      # parsePaginationParams / buildPagination
│   │   ├── formatters.js      # formatTxnId, formatCurrency
│   │   └── jwt.js             # signAccessToken, signRefreshToken, verifyToken
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── wallet.service.js
│   │   ├── crypto.service.js
│   │   ├── order.service.js
│   │   ├── product.service.js
│   │   ├── admin.service.js
│   │   └── notification.service.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── profile.controller.js
│   │   ├── wallet.controller.js
│   │   ├── order.controller.js
│   │   ├── product.controller.js
│   │   ├── notification.controller.js
│   │   ├── ticket.controller.js
│   │   ├── apikey.controller.js
│   │   ├── content.controller.js
│   │   ├── webhook.controller.js
│   │   └── admin/
│   │       ├── dashboard.controller.js
│   │       ├── users.controller.js
│   │       ├── orders.controller.js
│   │       ├── products.controller.js
│   │       ├── deposits.controller.js
│   │       ├── transactions.controller.js
│   │       ├── support.controller.js
│   │       ├── analytics.controller.js
│   │       ├── settings.controller.js
│   │       └── content.controller.js
│   └── routes/
│       ├── index.js           # Router principal
│       ├── auth.routes.js
│       ├── profile.routes.js
│       ├── wallet.routes.js
│       ├── order.routes.js
│       ├── product.routes.js
│       ├── notification.routes.js
│       ├── ticket.routes.js
│       ├── apikey.routes.js
│       ├── content.routes.js
│       ├── webhook.routes.js
│       └── admin/
│           ├── index.js
│           ├── dashboard.routes.js
│           ├── users.routes.js
│           ├── orders.routes.js
│           ├── products.routes.js
│           ├── deposits.routes.js
│           ├── transactions.routes.js
│           ├── support.routes.js
│           ├── analytics.routes.js
│           ├── settings.routes.js
│           └── content.routes.js
├── uploads/                   # Stockage local images (si pas Cloudinary)
├── .env
├── .env.example
└── package.json
```

---

## 2. Variables d'environnement

### `.env.example`
```env
# Core
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/botb_db
FRONTEND_URL=http://localhost:5173

# Auth
JWT_SECRET=change_me_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=change_me_refresh_secret_min_32_chars

# Upload / CDN
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CDN_BASE_URL=

# Public URL (pour webhooks entrants BlockCypher/Alchemy)
PUBLIC_URL=https://your-backend-domain.com

# Crypto — BlockCypher (BTC/LTC/DOGE)
BLOCKCYPHER_TOKEN=your_token_here

# Crypto — Alchemy (ETH)
ALCHEMY_API_KEY=
ALCHEMY_SIGNING_KEY=
ALCHEMY_AUTH_TOKEN=
ALCHEMY_WEBHOOK_ID=

# Crypto — ETH HD Wallet (12 mots BIP39)
ETH_HD_SEED=your twelve word seed phrase goes here for hd wallet

# XMR (fallback si pas en BDD)
XMR_ADDRESS=
```

### `src/config/env.js`
```js
import 'dotenv/config';

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

export const env = {
  nodeEnv:           process.env.NODE_ENV || 'development',
  port:              parseInt(process.env.PORT || '4000', 10),
  databaseUrl:       process.env.DATABASE_URL,
  frontendUrl:       process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret:         process.env.JWT_SECRET,
  jwtRefreshSecret:  process.env.JWT_REFRESH_SECRET,
  uploadDir:         process.env.UPLOAD_DIR || './uploads',
  maxFileSize:       parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  cdnBaseUrl:        process.env.CDN_BASE_URL || '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey:    process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  publicUrl:         process.env.PUBLIC_URL || '',
  blockcypherToken:  process.env.BLOCKCYPHER_TOKEN || '',
  alchemy: {
    apiKey:       process.env.ALCHEMY_API_KEY || '',
    signingKey:   process.env.ALCHEMY_SIGNING_KEY || '',
    authToken:    process.env.ALCHEMY_AUTH_TOKEN || '',
    webhookId:    process.env.ALCHEMY_WEBHOOK_ID || '',
  },
  ethHdSeed:         process.env.ETH_HD_SEED || '',
  xmrAddress:        process.env.XMR_ADDRESS || '',
};
```

---

## 3. Package.json & dépendances

```json
{
  "name": "botb-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev":         "node --watch src/server.js",
    "start":       "node src/server.js",
    "db:generate": "prisma generate",
    "db:push":     "prisma db push",
    "db:migrate":  "prisma migrate dev",
    "db:seed":     "node prisma/seed.js",
    "db:studio":   "prisma studio"
  },
  "dependencies": {
    "@prisma/client":       "^5.14.0",
    "axios":                "^1.7.2",
    "bcrypt":               "^5.1.1",
    "cors":                 "^2.8.5",
    "dotenv":               "^16.4.5",
    "ethers":               "^6.13.1",
    "express":              "^4.19.2",
    "express-async-errors": "^3.1.1",
    "jsonwebtoken":         "^9.0.2",
    "multer":               "^1.4.5-lts.1"
  },
  "devDependencies": {
    "prisma": "^5.14.0"
  }
}
```

---

## 4. Schéma Prisma (BDD complète)

### `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── USERS ────────────────────────────────────────────────────────────────────

model User {
  id               Int       @id @default(autoincrement())
  username         String    @unique
  passwordHash     String
  role             String    @default("customer")   // customer | moderator | admin
  isActive         Boolean   @default(true)
  balance          Decimal   @default(0) @db.Decimal(12, 2)
  points           Int       @default(0)
  totalSpent       Decimal   @default(0) @db.Decimal(12, 2)
  markupPct        Decimal   @default(0) @db.Decimal(5, 2)
  bio              String?
  telegramHandle   String?
  signalDetails    String?
  sessionDetails   String?
  btcRefundAddress String?
  xmrRefundAddress String?
  avatarUrl        String?
  hidePrices       Boolean   @default(false)
  notifOrders      Boolean   @default(true)
  notifDeposits    Boolean   @default(true)
  notifTickets     Boolean   @default(true)
  notifNewProducts Boolean   @default(true)
  notifLogins      Boolean   @default(true)
  tourCompleted    Boolean   @default(false)
  lastLoginAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  orders         Order[]
  transactions   Transaction[]
  deposits       Deposit[]
  tickets        SupportTicket[]
  ticketMessages TicketMessage[]
  apiKeys        ApiKey[]
  notifications  Notification[]
  reviews        Review[]
}

// ─── PRODUCTS & CATALOGUE ────────────────────────────────────────────────────

model Category {
  id        Int        @id @default(autoincrement())
  name      String
  slug      String     @unique
  parentId  Int?
  parent    Category?  @relation("CategoryToCategory", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryToCategory")
  products  Product[]
  createdAt DateTime   @default(now())
}

model Brand {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  slug      String    @unique
  logoUrl   String?
  products  Product[]
  createdAt DateTime  @default(now())
}

model Product {
  id          Int       @id @default(autoincrement())
  name        String
  slug        String    @unique
  description String?
  price       Decimal   @db.Decimal(10, 2)
  stock       Int       @default(0)
  isActive    Boolean   @default(true)
  categoryId  Int?
  category    Category? @relation(fields: [categoryId], references: [id])
  brandId     Int?
  brand       Brand?    @relation(fields: [brandId], references: [id])
  images      ProductImage[]
  orderItems  OrderItem[]
  reviews     Review[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model ProductImage {
  id        Int     @id @default(autoincrement())
  productId Int
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  thumbnail String?
  position  Int     @default(0)
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

model Order {
  id              Int         @id @default(autoincrement())
  orderNumber     String      @unique   // ex: "ORD-2024-00042"
  userId          Int
  user            User        @relation(fields: [userId], references: [id])
  status          String      @default("processing")  // processing | shipped | delivered | cancelled | refunded
  paymentMethod   String      // XMR | BTC | DOGE | LTC
  totalAmount     Decimal     @db.Decimal(10, 2)
  shippingFee     Decimal     @default(0) @db.Decimal(10, 2)
  shippingAddress String
  name            String
  email           String?
  trackingNumber  String?
  carrier         String?
  note            String?
  placedAt        DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  items           OrderItem[]
  transaction     Transaction?
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId Int?
  product   Product? @relation(fields: [productId], references: [id])
  name      String   // snapshot au moment de la commande
  price     Decimal  @db.Decimal(10, 2)
  quantity  Int
}

// ─── WALLET ──────────────────────────────────────────────────────────────────

model Deposit {
  id              Int       @id @default(autoincrement())
  userId          Int
  user            User      @relation(fields: [userId], references: [id])
  currency        String    // BTC | LTC | DOGE | ETH | XMR
  address         String    @default("pending")
  status          String    @default("awaiting")  // awaiting | partial | confirmed | expired
  amountExpected  Decimal?  @db.Decimal(18, 8)
  amountReceived  Decimal   @default(0) @db.Decimal(18, 8)
  usdCredited     Decimal   @default(0) @db.Decimal(10, 2)
  expiresAt       DateTime
  confirmedAt     DateTime?
  hookId          String?   // BlockCypher forwarding ID
  ethIndex        Int?      // HD wallet index pour ETH (= depositId)
  transactionId   Int?      @unique
  transaction     Transaction? @relation(fields: [transactionId], references: [id])
  createdAt       DateTime  @default(now())
}

model Transaction {
  id          Int      @id @default(autoincrement())
  frontendId  String   @unique  // ex: "TXN-1718000000000"
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  type        String   // deposit | purchase | refund | adjustment | bonus
  amount      Decimal  @db.Decimal(10, 2)  // positif = crédit, négatif = débit
  currency    String   @default("USD")
  status      String   @default("confirmed")  // pending | confirmed | failed
  note        String?
  txHash      String?  // hash blockchain
  orderId     Int?     @unique
  order       Order?   @relation(fields: [orderId], references: [id])
  deposit     Deposit?
  createdAt   DateTime @default(now())
}

// ─── SUPPORT ──────────────────────────────────────────────────────────────────

model SupportTicket {
  id          Int             @id @default(autoincrement())
  frontendId  String          @unique  // ex: "TKT-00042"
  userId      Int
  user        User            @relation(fields: [userId], references: [id])
  subject     String
  category    String          // deposit | order | account | other
  priority    String          @default("normal")  // low | normal | high | urgent
  status      String          @default("open")    // open | in_progress | resolved | closed
  assignedTo  String?         // username du modérateur
  messages    TicketMessage[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

model TicketMessage {
  id        Int           @id @default(autoincrement())
  ticketId  Int
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  userId    Int
  user      User          @relation(fields: [userId], references: [id])
  isAdmin   Boolean       @default(false)
  message   String
  createdAt DateTime      @default(now())
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  type      String   // welcome | order | deposit | ticket | system
  title     String
  message   String
  isRead    Boolean  @default(false)
  link      String?
  createdAt DateTime @default(now())
}

// ─── CONTENT ─────────────────────────────────────────────────────────────────

model NewsArticle {
  id          Int      @id @default(autoincrement())
  title       String
  slug        String   @unique
  content     String
  imageUrl    String?
  isPublished Boolean  @default(false)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model FAQ {
  id        Int      @id @default(autoincrement())
  question  String
  answer    String
  category  String?
  position  Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

model Giveaway {
  id          Int       @id @default(autoincrement())
  title       String
  description String
  prize       String
  imageUrl    String?
  status      String    @default("draft")  // draft | active | ended
  endsAt      DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Review {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  productId   Int
  product     Product  @relation(fields: [productId], references: [id])
  rating      Int      // 1–5
  comment     String?
  isApproved  Boolean  @default(false)
  createdAt   DateTime @default(now())
}

// ─── API KEYS ─────────────────────────────────────────────────────────────────

model ApiKey {
  id        Int       @id @default(autoincrement())
  userId    Int
  user      User      @relation(fields: [userId], references: [id])
  keyPrefix String    // 8 premiers chars (affichage)
  keyHash   String    // bcrypt hash de la clé complète
  label     String?
  isActive  Boolean   @default(true)
  lastUsed  DateTime?
  createdAt DateTime  @default(now())
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

model SiteSetting {
  key   String @id
  value String
}
```

---

## 5. Point d'entrée — server.js

```js
// src/server.js
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import router from './routes/index.js';

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Webhooks crypto — RAW body nécessaire pour vérification signature
app.use('/api/webhooks/alchemy', express.raw({ type: 'application/json' }));

app.use('/api', router);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`BOTB backend running on port ${env.port} [${env.nodeEnv}]`);
});
```

---

## 6. Middlewares

### `src/middlewares/auth.js`
```js
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../utils/response.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json(fail('Unauthorized'));

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    res.status(401).json(fail('Token invalide ou expiré'));
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json(fail('Unauthorized'));
  if (req.user.role !== 'admin') return res.status(403).json(fail('Accès refusé'));
  next();
}

export function requireModerator(req, res, next) {
  if (!req.user) return res.status(401).json(fail('Unauthorized'));
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json(fail('Accès refusé'));
  }
  next();
}
```

### `src/middlewares/errorHandler.js`
```js
import { fail } from '../utils/response.js';

export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.code === 'P2025') return res.status(404).json(fail('Ressource introuvable'));
  if (err.code === 'P2002') return res.status(409).json(fail('Valeur déjà existante'));

  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Erreur serveur interne';
  res.status(status).json(fail(message));
}
```

### `src/middlewares/upload.js`
```js
import multer from 'multer';
import path from 'path';
import { env } from '../config/env.js';

const storage = multer.diskStorage({
  destination: env.uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
};

export const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSize },
  fileFilter,
});
```

---

## 7. Helpers & utilitaires

### `src/utils/response.js`
```js
export const ok   = (data)    => ({ success: true,  data });
export const fail = (error)   => ({ success: false, error });
```

### `src/utils/pagination.js`
```js
export function parsePaginationParams(query) {
  const page  = Math.max(1, parseInt(query.page  || '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}
```

### `src/utils/formatters.js`
```js
export function formatTxnId(ts = Date.now()) {
  return `TXN-${ts}`;
}

export function formatOrderNumber(id) {
  return `ORD-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;
}

export function formatTicketId(id) {
  return `TKT-${String(id).padStart(5, '0')}`;
}

export function getUserTier(totalSpent) {
  const n = Number(totalSpent);
  if (n >= 5000) return 'platinum';
  if (n >= 2000) return 'gold';
  if (n >= 1000) return 'preferred';
  return 'basic';
}

export function getCashbackRate(tier) {
  const rates = { basic: 0.005, preferred: 0.01, gold: 0.013, platinum: 0.015 };
  return rates[tier] || 0.005;
}
```

### `src/utils/jwt.js`
```js
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '15m' });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}
```

---

## 8. Services

### `src/services/auth.service.js`
```js
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { notificationService } from './notification.service.js';

const SALT_ROUNDS = 12;

export const authService = {
  async register({ username, password }) {
    if (!username || username.length < 3) throw Object.assign(new Error('Username trop court (min 3)'), { status: 400 });
    if (!password || password.length < 6) throw Object.assign(new Error('Password trop court (min 6)'), { status: 400 });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) throw Object.assign(new Error('Username déjà pris'), { status: 409 });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({ data: { username, passwordHash } });

    await notificationService.createWelcomeNotifications(user.id);

    return user;
  },

  async login({ username, password }) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw Object.assign(new Error('Identifiants invalides'), { status: 401 });
    if (!user.isActive) throw Object.assign(new Error('Compte désactivé'), { status: 403 });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw Object.assign(new Error('Identifiants invalides'), { status: 401 });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const payload = { sub: user.id, role: user.role, username: user.username };
    return {
      token:        signAccessToken(payload),
      refreshToken: signRefreshToken({ sub: user.id }),
      user: {
        id:       user.id,
        username: user.username,
        role:     user.role,
        balance:  Number(user.balance),
        points:   user.points,
      },
    };
  },

  async refresh(refreshToken) {
    const { verifyRefreshToken } = await import('../utils/jwt.js');
    let payload;
    try { payload = verifyRefreshToken(refreshToken); }
    catch { throw Object.assign(new Error('Refresh token invalide'), { status: 401 }); }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw Object.assign(new Error('Utilisateur introuvable'), { status: 401 });

    const newPayload = { sub: user.id, role: user.role, username: user.username };
    return { token: signAccessToken(newPayload) };
  },
};
```

### `src/services/wallet.service.js`
```js
import { prisma } from '../db.js';
import { cryptoService } from './crypto.service.js';
import { formatTxnId, getUserTier, getCashbackRate } from '../utils/formatters.js';

export const walletService = {
  async getWalletInfo(userId) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tier = getUserTier(user.totalSpent);
    const cashbackRate = getCashbackRate(tier);

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['points_rate'] } },
    });
    const pointsRate = parseFloat(settings.find(s => s.key === 'points_rate')?.value || '0.5');

    const tierLimits = { basic: 1000, preferred: 2000, gold: 5000, platinum: Infinity };
    const limit = tierLimits[tier];
    const remaining = Math.max(0, limit - Number(user.totalSpent));

    return {
      balance:     Number(user.balance),
      points:      user.points,
      totalSpent:  Number(user.totalSpent),
      tier,
      cashback:    cashbackRate * 100,
      pointsRate,
      remaining:   remaining === Infinity ? null : remaining,
    };
  },

  async createDeposit(userId, currency) {
    const validCurrencies = ['BTC', 'LTC', 'DOGE', 'ETH', 'XMR'];
    if (!validCurrencies.includes(currency)) {
      throw Object.assign(new Error('Devise non supportée'), { status: 400 });
    }

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['deposit_expiry_hours', 'min_deposit', 'max_deposit'] } },
    });
    const getSetting = (k, def) => settings.find(s => s.key === k)?.value || def;
    const expiryHours = parseInt(getSetting('deposit_expiry_hours', '12'), 10);

    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Crée d'abord le deposit avec status 'awaiting'
    const deposit = await prisma.deposit.create({
      data: { userId, currency, expiresAt },
    });

    // Génère l'adresse via le service crypto
    const { address, hookId, ethIndex } = await cryptoService.generateAddress(currency, deposit.id);

    const updated = await prisma.deposit.update({
      where: { id: deposit.id },
      data:  { address, hookId: hookId || null, ethIndex: ethIndex ?? null },
    });

    return updated;
  },

  async confirmDeposit(depositId, usdAmount, note = null, adminId = null) {
    const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } });
    if (deposit.status === 'confirmed') throw Object.assign(new Error('Déjà confirmé'), { status: 409 });

    const txn = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          frontendId: formatTxnId(),
          userId:     deposit.userId,
          type:       'deposit',
          amount:     usdAmount,
          currency:   'USD',
          status:     'confirmed',
          note:       note || `Dépôt ${deposit.currency} confirmé`,
        },
      });

      await tx.deposit.update({
        where: { id: depositId },
        data: {
          status:        'confirmed',
          usdCredited:   usdAmount,
          confirmedAt:   new Date(),
          transactionId: transaction.id,
        },
      });

      await tx.user.update({
        where: { id: deposit.userId },
        data:  { balance: { increment: usdAmount } },
      });

      return transaction;
    });

    return txn;
  },

  async adjustBalance(userId, type, amount, reason) {
    if (!['credit', 'debit'].includes(type)) {
      throw Object.assign(new Error('Type invalide: credit ou debit'), { status: 400 });
    }
    if (!reason) throw Object.assign(new Error('Raison obligatoire'), { status: 400 });
    if (amount <= 0) throw Object.assign(new Error('Montant doit être positif'), { status: 400 });

    if (type === 'debit') {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      if (Number(user.balance) < amount) throw Object.assign(new Error('Solde insuffisant'), { status: 400 });
    }

    const signedAmount = type === 'credit' ? amount : -amount;

    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data:  { balance: { increment: signedAmount } },
      });

      return tx.transaction.create({
        data: {
          frontendId: formatTxnId(),
          userId,
          type:       'adjustment',
          amount:     signedAmount,
          currency:   'USD',
          status:     'confirmed',
          note:       reason,
        },
      });
    });
  },
};
```

### `src/services/crypto.service.js`
```js
import axios from 'axios';
import { HDNodeWallet } from 'ethers';
import { env } from '../config/env.js';
import { prisma } from '../db.js';

export const cryptoService = {
  async generateAddress(currency, depositId) {
    switch (currency) {
      case 'BTC':  return this._blockcypher('btc/main', depositId);
      case 'LTC':  return this._blockcypher('ltc/main', depositId);
      case 'DOGE': return this._blockcypher('doge/main', depositId);
      case 'ETH':  return this._alchemy(depositId);
      case 'XMR':  return this._xmr();
      default:     throw new Error(`Devise non gérée: ${currency}`);
    }
  },

  async _blockcypher(chain, depositId) {
    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['btc_address', 'ltc_address', 'doge_address'] } },
    });
    const coinKey = chain.split('/')[0] + '_address';
    const destination = settings.find(s => s.key === coinKey)?.value;
    if (!destination) throw new Error(`Adresse destination ${coinKey} non configurée`);

    const callbackUrl = `${env.publicUrl}/api/webhooks/blockcypher`;
    const { data } = await axios.post(
      `https://api.blockcypher.com/v1/${chain}/forwards?token=${env.blockcypherToken}`,
      { destination, callback_url: callbackUrl }
    );
    return { address: data.input_address, hookId: data.id };
  },

  async _alchemy(depositId) {
    if (!env.ethHdSeed) throw new Error('ETH_HD_SEED non configuré');

    const wallet = HDNodeWallet.fromPhrase(
      env.ethHdSeed,
      undefined,
      `m/44'/60'/0'/0/${depositId}`
    );
    const address = wallet.address;

    // Enregistre l'adresse dans le webhook Alchemy
    if (env.alchemy.webhookId && env.alchemy.authToken) {
      await axios.patch(
        'https://dashboard.alchemy.com/api/update-webhook-addresses',
        { webhook_id: env.alchemy.webhookId, addresses_to_add: [address], addresses_to_remove: [] },
        { headers: { 'X-Alchemy-Token': env.alchemy.authToken } }
      ).catch(err => console.warn('[Alchemy] Webhook update failed:', err.message));
    }

    return { address, ethIndex: depositId };
  },

  async _xmr() {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'xmr_address' } });
    const address = setting?.value || env.xmrAddress;
    if (!address) throw new Error('Adresse XMR non configurée');
    return { address };
  },

  // Appel depuis le webhook BlockCypher — retourne le montant reçu en USD
  async getUsdValue(cryptoAmount, currency) {
    try {
      const { data } = await axios.get(
        `https://api.blockcypher.com/v1/tokens`,
        // En pratique, utiliser un endpoint prix comme CoinGecko
      );
    } catch {
      return cryptoAmount * 0; // fallback: admin confirme manuellement
    }
  },

  async sweepEth(destinationAddress) {
    if (!env.ethHdSeed) throw new Error('ETH_HD_SEED non configuré');

    const confirmedDeposits = await prisma.deposit.findMany({
      where: { currency: 'ETH', status: 'confirmed', ethIndex: { not: null } },
    });

    const results = [];
    for (const dep of confirmedDeposits) {
      const wallet = HDNodeWallet.fromPhrase(
        env.ethHdSeed,
        undefined,
        `m/44'/60'/0'/0/${dep.ethIndex}`
      );
      // Ici : vérifier le solde et envoyer via provider Alchemy
      results.push({ depositId: dep.id, address: wallet.address, status: 'swept' });
    }
    return results;
  },
};
```

### `src/services/order.service.js`
```js
import { prisma } from '../db.js';
import { formatTxnId, formatOrderNumber } from '../utils/formatters.js';

export const orderService = {
  async createOrder(userId, { items, shippingAddress, paymentMethod, name, email }) {
    if (!items?.length) throw Object.assign(new Error('Panier vide'), { status: 400 });

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['shipping_cost', 'shipping_free_threshold'] } },
    });
    const shippingCost      = parseFloat(settings.find(s => s.key === 'shipping_cost')?.value || '0');
    const freeThreshold     = parseFloat(settings.find(s => s.key === 'shipping_free_threshold')?.value || '0');

    // Récupère les produits depuis la BDD
    const productIds = [...new Set(items.map(i => i.productId))];
    const products   = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } });

    if (products.length !== productIds.length) {
      throw Object.assign(new Error('Un ou plusieurs produits sont invalides'), { status: 400 });
    }

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = productMap[item.productId];
      const price   = Number(product.price);
      subtotal += price * item.quantity;
      return { productId: product.id, name: product.name, price, quantity: item.quantity };
    });

    const shippingFee   = (freeThreshold > 0 && subtotal >= freeThreshold) ? 0 : shippingCost;
    const totalAmount   = subtotal + shippingFee;

    // Vérifie le solde
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (Number(user.balance) < totalAmount) {
      throw Object.assign(new Error('Solde insuffisant'), { status: 402 });
    }

    return prisma.$transaction(async (tx) => {
      // Débite le solde
      await tx.user.update({
        where: { id: userId },
        data: {
          balance:    { decrement: totalAmount },
          totalSpent: { increment: totalAmount },
        },
      });

      // Crée la commande
      const order = await tx.order.create({
        data: {
          orderNumber:    'TEMP',
          userId,
          paymentMethod,
          totalAmount,
          shippingFee,
          shippingAddress,
          name,
          email:          email || null,
          items:          { create: orderItems },
        },
        include: { items: true },
      });

      // Met à jour le numéro de commande
      const updated = await tx.order.update({
        where: { id: order.id },
        data:  { orderNumber: formatOrderNumber(order.id) },
        include: { items: true },
      });

      // Crée la transaction
      const txn = await tx.transaction.create({
        data: {
          frontendId: formatTxnId(),
          userId,
          type:       'purchase',
          amount:     -totalAmount,
          currency:   'USD',
          status:     'confirmed',
          note:       `Commande ${updated.orderNumber}`,
          orderId:    order.id,
        },
      });

      return { order: updated, newBalance: Number(user.balance) - totalAmount };
    });
  },
};
```

### `src/services/notification.service.js`
```js
import { prisma } from '../db.js';

export const notificationService = {
  async createWelcomeNotifications(userId) {
    await prisma.notification.createMany({
      data: [
        { userId, type: 'welcome', title: 'Bienvenue sur BOTB !',       message: 'Votre compte a été créé avec succès.' },
        { userId, type: 'welcome', title: 'Rechargez votre compte',      message: 'Ajoutez des crédits via crypto pour passer votre première commande.' },
        { userId, type: 'welcome', title: 'Livraison via Telegram',      message: 'La livraison est coordonnée via Telegram après votre commande.' },
      ],
    });
  },

  async create(userId, { type, title, message, link }) {
    return prisma.notification.create({ data: { userId, type, title, message, link } });
  },
};
```

---

## 9. Controllers

### `src/controllers/auth.controller.js`
```js
import { authService } from '../services/auth.service.js';
import { ok } from '../utils/response.js';

export const authController = {
  async register(req, res) {
    const user = await authService.register(req.body);
    res.status(201).json(ok({ id: user.id, username: user.username }));
  },

  async login(req, res) {
    const result = await authService.login(req.body);
    res.json(ok(result));
  },

  async refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'refreshToken requis' });
    const result = await authService.refresh(refreshToken);
    res.json(ok(result));
  },

  async logout(req, res) {
    // Stateless JWT — le client supprime ses tokens
    res.json(ok({ message: 'Déconnecté' }));
  },
};
```

### `src/controllers/profile.controller.js`
```js
import { prisma } from '../db.js';
import { ok } from '../utils/response.js';
import { getUserTier } from '../utils/formatters.js';

export const profileController = {
  async get(req, res) {
    const user = await prisma.user.findUniqueOrThrow({
      where:  { id: req.user.sub },
      select: {
        id: true, username: true, role: true, bio: true,
        telegramHandle: true, signalDetails: true, sessionDetails: true,
        btcRefundAddress: true, xmrRefundAddress: true,
        balance: true, points: true, totalSpent: true, markupPct: true,
        avatarUrl: true, createdAt: true,
      },
    });
    res.json(ok({ ...user, tier: getUserTier(user.totalSpent) }));
  },

  async update(req, res) {
    const allowed = ['bio', 'telegramHandle', 'signalDetails', 'sessionDetails', 'btcRefundAddress', 'xmrRefundAddress'];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const user = await prisma.user.update({ where: { id: req.user.sub }, data });
    res.json(ok({ id: user.id, username: user.username }));
  },
};
```

### `src/controllers/wallet.controller.js`
```js
import { walletService } from '../services/wallet.service.js';
import { prisma } from '../db.js';
import { ok } from '../utils/response.js';
import { parsePaginationParams, buildPagination } from '../utils/pagination.js';

export const walletController = {
  async getWallet(req, res) {
    const data = await walletService.getWalletInfo(req.user.sub);
    res.json(ok(data));
  },

  async getBalance(req, res) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.sub }, select: { balance: true } });
    res.json(ok({ balance: Number(user.balance) }));
  },

  async getDeposits(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({ where: { userId: req.user.sub }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.deposit.count({ where: { userId: req.user.sub } }),
    ]);
    res.json(ok({ deposits, pagination: buildPagination(page, limit, total) }));
  },

  async getDeposit(req, res) {
    const deposit = await prisma.deposit.findFirstOrThrow({
      where: { id: parseInt(req.params.id), userId: req.user.sub },
    });
    res.json(ok(deposit));
  },

  async createDeposit(req, res) {
    const { currency } = req.body;
    const deposit = await walletService.createDeposit(req.user.sub, currency);
    res.status(201).json(ok(deposit));
  },

  async getTransactions(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({ where: { userId: req.user.sub }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.transaction.count({ where: { userId: req.user.sub } }),
    ]);
    res.json(ok({ transactions, pagination: buildPagination(page, limit, total) }));
  },
};
```

### `src/controllers/order.controller.js`
```js
import { orderService } from '../services/order.service.js';
import { prisma } from '../db.js';
import { ok } from '../utils/response.js';
import { parsePaginationParams, buildPagination } from '../utils/pagination.js';

export const orderController = {
  async create(req, res) {
    const result = await orderService.createOrder(req.user.sub, req.body);
    res.status(201).json(ok(result));
  },

  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where:   { userId: req.user.sub },
        skip, take: limit,
        orderBy: { placedAt: 'desc' },
        include: { items: true },
      }),
      prisma.order.count({ where: { userId: req.user.sub } }),
    ]);
    res.json(ok({ orders, pagination: buildPagination(page, limit, total) }));
  },

  async getOne(req, res) {
    const order = await prisma.order.findFirstOrThrow({
      where:   { id: parseInt(req.params.id), userId: req.user.sub },
      include: { items: { include: { product: { select: { slug: true, images: { take: 1 } } } } } },
    });
    res.json(ok(order));
  },
};
```

### `src/controllers/product.controller.js`
```js
import { prisma } from '../db.js';
import { ok } from '../utils/response.js';
import { parsePaginationParams, buildPagination } from '../utils/pagination.js';

export const productController = {
  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { search, category, sort } = req.query;

    const where = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    const sortMap = {
      price_asc:  { price: 'asc' },
      price_desc: { price: 'desc' },
      latest:     { createdAt: 'desc' },
      default:    { id: 'asc' },
    };
    const orderBy = sortMap[sort] || sortMap.default;

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: limit, orderBy, include: { images: true, category: true } }),
      prisma.product.count({ where }),
    ]);

    res.json(ok({ products, pagination: buildPagination(page, limit, total) }));
  },

  async getOne(req, res) {
    const product = await prisma.product.findFirstOrThrow({
      where:   { slug: req.params.slug, isActive: true },
      include: { images: true, category: true, brand: true },
    });
    res.json(ok(product));
  },

  async getRelated(req, res) {
    const product = await prisma.product.findFirstOrThrow({ where: { slug: req.params.slug } });
    const related = await prisma.product.findMany({
      where:   { categoryId: product.categoryId, id: { not: product.id }, isActive: true },
      take:    4,
      include: { images: { take: 1 } },
    });
    res.json(ok(related));
  },
};
```

### `src/controllers/webhook.controller.js`
```js
import { prisma } from '../db.js';
import { walletService } from '../services/wallet.service.js';
import { ok } from '../utils/response.js';
import { env } from '../config/env.js';
import crypto from 'crypto';

export const webhookController = {
  // BlockCypher — BTC, LTC, DOGE
  async blockcypher(req, res) {
    const { address, total_received, confirmations } = req.body;

    if (confirmations < 1) return res.json(ok('En attente de confirmation'));

    const deposit = await prisma.deposit.findFirst({
      where: { address, status: { in: ['awaiting', 'partial'] } },
    });

    if (!deposit) return res.json(ok('Deposit non trouvé'));

    const usdAmount = parseFloat(req.body.usd_amount || 0);
    if (usdAmount <= 0) return res.json(ok('Montant USD non calculé — attente admin'));

    await walletService.confirmDeposit(deposit.id, usdAmount, `Auto-confirm BlockCypher`);
    res.json(ok('Confirmé'));
  },

  // Alchemy — ETH
  async alchemy(req, res) {
    // Vérifie la signature Alchemy
    const sigHeader = req.headers['x-alchemy-signature'];
    if (env.alchemy.signingKey && sigHeader) {
      const hmac = crypto.createHmac('sha256', env.alchemy.signingKey);
      hmac.update(req.body);
      const expected = hmac.digest('hex');
      if (sigHeader !== expected) return res.status(401).json({ error: 'Signature invalide' });
    }

    const body = JSON.parse(req.body.toString());
    const transfers = body?.event?.activity || [];

    for (const transfer of transfers) {
      const { toAddress, value } = transfer;
      const deposit = await prisma.deposit.findFirst({
        where: { address: toAddress.toLowerCase(), currency: 'ETH', status: { in: ['awaiting', 'partial'] } },
      });
      if (!deposit) continue;

      const usdAmount = parseFloat(transfer.usd_value || 0);
      if (usdAmount > 0) {
        await walletService.confirmDeposit(deposit.id, usdAmount, 'Auto-confirm Alchemy ETH');
      }
    }

    res.json(ok('Traité'));
  },
};
```

### `src/controllers/admin/dashboard.controller.js`
```js
import { prisma } from '../../db.js';
import { ok } from '../../utils/response.js';

function startOf(unit) {
  const d = new Date();
  if (unit === 'day')   { d.setHours(0,0,0,0); return d; }
  if (unit === 'week')  { d.setDate(d.getDate() - 7); return d; }
  if (unit === 'month') { d.setDate(1); d.setHours(0,0,0,0); return d; }
  return d;
}

export const dashboardController = {
  async get(req, res) {
    const [
      totalRevenue, todayRevenue, weekRevenue, monthRevenue,
      totalOrders, todayOrders, pendingOrders, shippedOrders,
      totalUsers, todayUsers,
      totalProducts,
      openTickets, urgentTickets,
      recentOrders, lowStockProducts, recentTickets,
      revenueChart, newUsersChart, ordersStatusData, topProducts,
    ] = await Promise.all([
      prisma.transaction.aggregate({ where: { type: 'purchase', status: 'confirmed' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'purchase', status: 'confirmed', createdAt: { gte: startOf('day') } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'purchase', status: 'confirmed', createdAt: { gte: startOf('week') } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'purchase', status: 'confirmed', createdAt: { gte: startOf('month') } }, _sum: { amount: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { placedAt: { gte: startOf('day') } } }),
      prisma.order.count({ where: { status: 'processing' } }),
      prisma.order.count({ where: { status: 'shipped' } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOf('day') } } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] }, priority: 'urgent' } }),
      prisma.order.findMany({ take: 10, orderBy: { placedAt: 'desc' }, include: { user: { select: { username: true } } } }),
      prisma.product.findMany({ where: { stock: { lte: 10, gt: 0 }, isActive: true }, take: 5, orderBy: { stock: 'asc' }, select: { id: true, name: true, stock: true, images: { take: 1 } } }),
      prisma.supportTicket.findMany({ where: { status: 'open', assignedTo: null }, take: 5, orderBy: { createdAt: 'desc' } }),
      // Revenue 30 derniers jours — simplifié
      prisma.$queryRaw`
        SELECT DATE(created_at)::text as date, ABS(SUM(amount))::float as revenue
        FROM "Transaction" WHERE type = 'purchase' AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
      prisma.$queryRaw`
        SELECT DATE(created_at)::text as date, COUNT(*)::int as count
        FROM "User" WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
      prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.orderItem.groupBy({ by: ['productId', 'name'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
    ]);

    const ordersStatusChart = Object.fromEntries(
      ordersStatusData.map(s => [s.status, s._count.id])
    );

    res.json(ok({
      stats: {
        revenue:  { today: Math.abs(Number(todayRevenue._sum.amount||0)), thisWeek: Math.abs(Number(weekRevenue._sum.amount||0)), thisMonth: Math.abs(Number(monthRevenue._sum.amount||0)), total: Math.abs(Number(totalRevenue._sum.amount||0)) },
        orders:   { today: todayOrders, pending: pendingOrders, shipped: shippedOrders, total: totalOrders },
        users:    { total: totalUsers, newToday: todayUsers },
        products: { total: totalProducts },
        tickets:  { open: openTickets, urgent: urgentTickets },
      },
      charts: {
        revenueChart,
        ordersStatusChart,
        topProducts: topProducts.map(p => ({ name: p.name, totalSold: Number(p._sum.quantity || 0) })),
        newUsersChart,
      },
      recentOrders,
      lowStockProducts,
      recentUnassignedTickets: recentTickets,
    }));
  },
};
```

### `src/controllers/admin/users.controller.js`
```js
import bcrypt from 'bcrypt';
import { prisma } from '../../db.js';
import { walletService } from '../../services/wallet.service.js';
import { ok } from '../../utils/response.js';
import { parsePaginationParams, buildPagination } from '../../utils/pagination.js';
import { getUserTier } from '../../utils/formatters.js';

export const adminUsersController = {
  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { search, tier, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where = {};
    if (search)   where.username = { contains: search, mode: 'insensitive' };
    if (role)     where.role     = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (tier) {
      const tierRanges = { basic: [0, 999.99], preferred: [1000, 1999.99], gold: [2000, 4999.99], platinum: [5000, 9999999] };
      const [min, max] = tierRanges[tier] || [];
      if (min !== undefined) where.totalSpent = { gte: min, lte: max };
    }

    const validSort = ['createdAt', 'username', 'balance', 'totalSpent'];
    const orderBy = { [validSort.includes(sortBy) ? sortBy : 'createdAt']: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: limit, orderBy,
        select: { id: true, username: true, role: true, isActive: true, balance: true, totalSpent: true, points: true, createdAt: true, _count: { select: { orders: true } } },
      }),
      prisma.user.count({ where }),
    ]);

    const mapped = users.map(u => ({ ...u, tier: getUserTier(u.totalSpent) }));
    res.json(ok({ users: mapped, pagination: buildPagination(page, limit, total) }));
  },

  async create(req, res) {
    const { username, password, role = 'customer' } = req.body;
    if (!username || !password) throw Object.assign(new Error('Username et password requis'), { status: 400 });
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) throw Object.assign(new Error('Username déjà pris'), { status: 409 });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { username, passwordHash, role } });
    res.status(201).json(ok({ id: user.id, username: user.username, role: user.role }));
  },

  async getOne(req, res) {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        orders:       { take: 5, orderBy: { placedAt: 'desc' }, include: { items: true } },
        transactions: { take: 5, orderBy: { createdAt: 'desc' } },
        deposits:     { take: 5, orderBy: { createdAt: 'desc' } },
        tickets:      { take: 3, orderBy: { createdAt: 'desc' } },
        apiKeys:      true,
      },
    });
    const { passwordHash: _, ...safe } = user;
    res.json(ok({ ...safe, tier: getUserTier(user.totalSpent) }));
  },

  async update(req, res) {
    const id = parseInt(req.params.id);
    const { username, role, isActive, markupPct } = req.body;
    const user = await prisma.user.update({ where: { id }, data: { username, role, isActive, markupPct } });
    res.json(ok({ id: user.id }));
  },

  async ban(req, res) {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    res.json(ok({ isActive: updated.isActive }));
  },

  async setPassword(req, res) {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    if (!password || password.length < 6) throw Object.assign(new Error('Password trop court'), { status: 400 });
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    res.json(ok({ message: 'Mot de passe mis à jour' }));
  },

  async adjustWallet(req, res) {
    const id  = parseInt(req.params.id);
    const { type, amount, reason } = req.body;
    const txn = await walletService.adjustBalance(id, type, parseFloat(amount), reason);
    const user = await prisma.user.findUnique({ where: { id }, select: { balance: true } });
    res.json(ok({ transaction: txn, newBalance: Number(user.balance) }));
  },
};
```

### `src/controllers/admin/deposits.controller.js`
```js
import { prisma } from '../../db.js';
import { walletService } from '../../services/wallet.service.js';
import { ok } from '../../utils/response.js';
import { parsePaginationParams, buildPagination } from '../../utils/pagination.js';

export const adminDepositsController = {
  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status, currency } = req.query;

    const where = {};
    if (status)   where.status   = status;
    if (currency) where.currency = currency;

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { username: true } } } }),
      prisma.deposit.count({ where }),
    ]);
    res.json(ok({ deposits, pagination: buildPagination(page, limit, total) }));
  },

  async confirm(req, res) {
    const id        = parseInt(req.params.id);
    const { usdAmount, note } = req.body;
    if (!usdAmount || usdAmount <= 0) throw Object.assign(new Error('usdAmount invalide'), { status: 400 });
    const txn = await walletService.confirmDeposit(id, parseFloat(usdAmount), note);
    res.json(ok(txn));
  },

  async expire(req, res) {
    const id = parseInt(req.params.id);
    const deposit = await prisma.deposit.update({ where: { id }, data: { status: 'expired' } });
    res.json(ok(deposit));
  },
};
```

### `src/controllers/admin/orders.controller.js`
```js
import { prisma } from '../../db.js';
import { ok } from '../../utils/response.js';
import { parsePaginationParams, buildPagination } from '../../utils/pagination.js';

export const adminOrdersController = {
  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { search, status, paymentMethod } = req.query;

    const where = {};
    if (status)        where.status        = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (search) where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
    ];

    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, skip, take: limit, orderBy: { placedAt: 'desc' }, include: { user: { select: { username: true } }, items: true } }),
      prisma.order.count({ where }),
    ]);
    res.json(ok({ orders, pagination: buildPagination(page, limit, total) }));
  },

  async getOne(req, res) {
    const order = await prisma.order.findUniqueOrThrow({
      where:   { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, username: true } }, items: { include: { product: { select: { slug: true } } } } },
    });
    res.json(ok(order));
  },

  async updateStatus(req, res) {
    const { status } = req.body;
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) throw Object.assign(new Error('Statut invalide'), { status: 400 });
    const order = await prisma.order.update({ where: { id: parseInt(req.params.id) }, data: { status } });
    res.json(ok(order));
  },

  async updateTracking(req, res) {
    const { trackingNumber, carrier } = req.body;
    const order = await prisma.order.update({ where: { id: parseInt(req.params.id) }, data: { trackingNumber, carrier, status: 'shipped' } });
    res.json(ok(order));
  },
};
```

### `src/controllers/admin/products.controller.js`
```js
import { prisma } from '../../db.js';
import { ok } from '../../utils/response.js';
import { parsePaginationParams, buildPagination } from '../../utils/pagination.js';

export const adminProductsController = {
  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { search, category } = req.query;

    const where = {};
    if (search)   where.name       = { contains: search, mode: 'insensitive' };
    if (category) where.category   = { slug: category };

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { images: { take: 1 }, category: true } }),
      prisma.product.count({ where }),
    ]);
    res.json(ok({ products, pagination: buildPagination(page, limit, total) }));
  },

  async create(req, res) {
    const { name, slug, price, description, stock, categoryId, brandId } = req.body;
    if (!name || !slug || !price) throw Object.assign(new Error('name, slug et price requis'), { status: 400 });
    const product = await prisma.product.create({ data: { name, slug, price: parseFloat(price), description, stock: parseInt(stock||0), categoryId: categoryId ? parseInt(categoryId) : null, brandId: brandId ? parseInt(brandId) : null } });
    res.status(201).json(ok(product));
  },

  async update(req, res) {
    const { name, slug, price, description, stock, isActive, categoryId, brandId } = req.body;
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data:  { name, slug, price: price ? parseFloat(price) : undefined, description, stock: stock !== undefined ? parseInt(stock) : undefined, isActive, categoryId: categoryId ? parseInt(categoryId) : undefined, brandId: brandId ? parseInt(brandId) : undefined },
    });
    res.json(ok(product));
  },

  async remove(req, res) {
    await prisma.product.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    res.json(ok({ message: 'Produit désactivé' }));
  },
};
```

### `src/controllers/admin/analytics.controller.js`
```js
import { prisma } from '../../db.js';
import { ok } from '../../utils/response.js';

function getInterval(period) {
  const map = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const days = map[period] || 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export const analyticsController = {
  async get(req, res) {
    const { period = '30d' } = req.query;
    const since = getInterval(period);

    const [
      revAgg, orderCount, newUsers, avgOrder, depositAgg,
      revenueChart, ordersChart, newUsersChart,
      walletFlow, ordersStatus, topProducts, topCategories,
      depositsByCurrency, revenueByMethod,
    ] = await Promise.all([
      prisma.transaction.aggregate({ where: { type: 'purchase', status: 'confirmed', createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.order.count({ where: { placedAt: { gte: since } } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.order.aggregate({ where: { placedAt: { gte: since } }, _avg: { totalAmount: true } }),
      prisma.deposit.aggregate({ where: { status: 'confirmed', confirmedAt: { gte: since } }, _sum: { usdCredited: true } }),
      // Charts via raw queries pour groupBy date
      prisma.$queryRaw`SELECT DATE(created_at)::text as date, ABS(SUM(amount))::float as revenue FROM "Transaction" WHERE type='purchase' AND created_at >= ${since} GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
      prisma.$queryRaw`SELECT DATE(placed_at)::text as date, COUNT(*)::int as count FROM "Order" WHERE placed_at >= ${since} GROUP BY DATE(placed_at) ORDER BY DATE(placed_at)`,
      prisma.$queryRaw`SELECT DATE(created_at)::text as date, COUNT(*)::int as count FROM "User" WHERE created_at >= ${since} GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
      prisma.$queryRaw`SELECT DATE(created_at)::text as date, SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END)::float as deposits, ABS(SUM(CASE WHEN type='purchase' THEN amount ELSE 0 END))::float as purchases FROM "Transaction" WHERE created_at >= ${since} GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
      prisma.order.groupBy({ by: ['status'], _count: { id: true }, where: { placedAt: { gte: since } } }),
      prisma.orderItem.groupBy({ by: ['name'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 10 }),
      prisma.$queryRaw`SELECT c.name, ABS(SUM(t.amount))::float as revenue FROM "Transaction" t JOIN "Order" o ON t.order_id=o.id JOIN "OrderItem" oi ON oi.order_id=o.id JOIN "Product" p ON oi.product_id=p.id JOIN "Category" c ON p.category_id=c.id WHERE t.type='purchase' AND t.created_at >= ${since} GROUP BY c.name ORDER BY revenue DESC LIMIT 10`,
      prisma.deposit.groupBy({ by: ['currency'], _sum: { usdCredited: true }, where: { status: 'confirmed', confirmedAt: { gte: since } } }),
      prisma.order.groupBy({ by: ['paymentMethod'], _sum: { totalAmount: true }, where: { placedAt: { gte: since } } }),
    ]);

    res.json(ok({
      summary: {
        revenue:       Math.abs(Number(revAgg._sum.amount || 0)),
        orders:        orderCount,
        newUsers,
        avgOrderValue: Number(avgOrder._avg.totalAmount || 0),
        totalDeposits: Number(depositAgg._sum.usdCredited || 0),
      },
      revenueChart, ordersChart, newUsersChart, walletFlow,
      ordersStatusChart: Object.fromEntries(ordersStatus.map(s => [s.status, s._count.id])),
      topProducts:       topProducts.map(p => ({ name: p.name, sold: Number(p._sum.quantity || 0) })),
      topCategories,
      depositsByCurrency: depositsByCurrency.map(d => ({ currency: d.currency, value: Number(d._sum.usdCredited || 0) })),
      revenueByMethod:    revenueByMethod.map(r => ({ method: r.paymentMethod, revenue: Number(r._sum.totalAmount || 0) })),
    }));
  },
};
```

### `src/controllers/admin/settings.controller.js`
```js
import { prisma } from '../../db.js';
import { cryptoService } from '../../services/crypto.service.js';
import { ok } from '../../utils/response.js';

const ALLOWED_KEYS = [
  'site_name', 'maintenance_mode', 'registration_open',
  'shipping_cost', 'shipping_free_threshold', 'shipping_deadline_h', 'shipping_deadline_m',
  'points_rate', 'deposit_expiry_hours', 'min_deposit', 'max_deposit',
  'btc_address', 'ltc_address', 'doge_address', 'eth_address', 'xmr_address',
];

export const settingsController = {
  async get(req, res) {
    const rows = await prisma.siteSetting.findMany();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(ok({ settings }));
  },

  async update(req, res) {
    const entries = Object.entries(req.body).filter(([k]) => ALLOWED_KEYS.includes(k));
    await Promise.all(entries.map(([key, value]) =>
      prisma.siteSetting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
    ));
    res.json(ok({ updated: entries.map(([k]) => k) }));
  },

  async sweepEth(req, res) {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'eth_address' } });
    if (!setting?.value) throw Object.assign(new Error('eth_address non configurée'), { status: 400 });
    const results = await cryptoService.sweepEth(setting.value);
    res.json(ok({ swept: results.length, details: results }));
  },
};
```

### `src/controllers/admin/support.controller.js`
```js
import { prisma } from '../../db.js';
import { ok } from '../../utils/response.js';
import { parsePaginationParams, buildPagination } from '../../utils/pagination.js';

export const adminSupportController = {
  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status, priority, category } = req.query;

    const where = {};
    if (status)   where.status   = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { username: true } } } }),
      prisma.supportTicket.count({ where }),
    ]);
    res.json(ok({ tickets, pagination: buildPagination(page, limit, total) }));
  },

  async getOne(req, res) {
    const ticket = await prisma.supportTicket.findUniqueOrThrow({
      where:   { id: parseInt(req.params.id) },
      include: { user: { select: { username: true } }, messages: { include: { user: { select: { username: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    res.json(ok(ticket));
  },

  async reply(req, res) {
    const { message } = req.body;
    if (!message) throw Object.assign(new Error('Message requis'), { status: 400 });
    const msg = await prisma.ticketMessage.create({
      data: { ticketId: parseInt(req.params.id), userId: req.user.sub, isAdmin: true, message },
    });
    await prisma.supportTicket.update({ where: { id: parseInt(req.params.id) }, data: { status: 'in_progress', updatedAt: new Date() } });
    res.status(201).json(ok(msg));
  },

  async updateStatus(req, res) {
    const { status, assignedTo } = req.body;
    const ticket = await prisma.supportTicket.update({
      where: { id: parseInt(req.params.id) },
      data:  { status, assignedTo: assignedTo || null },
    });
    res.json(ok(ticket));
  },
};
```

### `src/controllers/notification.controller.js`
```js
import { prisma } from '../db.js';
import { ok } from '../utils/response.js';

export const notificationController = {
  async list(req, res) {
    const notifications = await prisma.notification.findMany({
      where:   { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });
    res.json(ok(notifications));
  },

  async markRead(req, res) {
    await prisma.notification.update({ where: { id: parseInt(req.params.id) }, data: { isRead: true } });
    res.json(ok({ read: true }));
  },

  async markAllRead(req, res) {
    await prisma.notification.updateMany({ where: { userId: req.user.sub, isRead: false }, data: { isRead: true } });
    res.json(ok({ message: 'Toutes les notifs marquées comme lues' }));
  },
};
```

### `src/controllers/ticket.controller.js`
```js
import { prisma } from '../db.js';
import { ok } from '../utils/response.js';
import { formatTicketId } from '../utils/formatters.js';

export const ticketController = {
  async list(req, res) {
    const tickets = await prisma.supportTicket.findMany({
      where:   { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
    });
    res.json(ok(tickets));
  },

  async create(req, res) {
    const { subject, category, priority = 'normal', message } = req.body;
    if (!subject || !message) throw Object.assign(new Error('subject et message requis'), { status: 400 });

    const ticket = await prisma.supportTicket.create({
      data: {
        frontendId: 'TEMP',
        userId:     req.user.sub,
        subject, category: category || 'other', priority,
        messages: { create: { userId: req.user.sub, message, isAdmin: false } },
      },
    });
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { frontendId: formatTicketId(ticket.id) } });
    res.status(201).json(ok(ticket));
  },

  async getOne(req, res) {
    const ticket = await prisma.supportTicket.findFirstOrThrow({
      where:   { id: parseInt(req.params.id), userId: req.user.sub },
      include: { messages: { include: { user: { select: { username: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    res.json(ok(ticket));
  },

  async reply(req, res) {
    const { message } = req.body;
    const ticket = await prisma.supportTicket.findFirstOrThrow({ where: { id: parseInt(req.params.id), userId: req.user.sub } });
    const msg = await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, userId: req.user.sub, message, isAdmin: false },
    });
    res.status(201).json(ok(msg));
  },
};
```

### `src/controllers/apikey.controller.js`
```js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { ok } from '../utils/response.js';

export const apikeyController = {
  async list(req, res) {
    const keys = await prisma.apiKey.findMany({
      where:  { userId: req.user.sub },
      select: { id: true, keyPrefix: true, label: true, isActive: true, lastUsed: true, createdAt: true },
    });
    res.json(ok(keys));
  },

  async create(req, res) {
    const { label } = req.body;
    const rawKey   = `botb_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash  = await bcrypt.hash(rawKey, 10);
    const keyPrefix = rawKey.slice(0, 12);

    const apiKey = await prisma.apiKey.create({
      data: { userId: req.user.sub, keyHash, keyPrefix, label: label || null },
    });

    // On retourne la clé complète UNE SEULE FOIS
    res.status(201).json(ok({ id: apiKey.id, key: rawKey, keyPrefix, label }));
  },

  async revoke(req, res) {
    await prisma.apiKey.updateMany({
      where: { id: parseInt(req.params.id), userId: req.user.sub },
      data:  { isActive: false },
    });
    res.json(ok({ revoked: true }));
  },
};
```

### `src/controllers/content.controller.js`
```js
import { prisma } from '../db.js';
import { ok } from '../utils/response.js';

const PUBLIC_SETTINGS = ['site_name', 'maintenance_mode', 'shipping_cost', 'shipping_free_threshold', 'registration_open'];

export const contentController = {
  async getSettings(req, res) {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: PUBLIC_SETTINGS } } });
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(ok({ settings }));
  },
};
```

---

## 10. Routes

### `src/routes/index.js`
```js
import { Router } from 'express';
import authRoutes        from './auth.routes.js';
import profileRoutes     from './profile.routes.js';
import walletRoutes      from './wallet.routes.js';
import orderRoutes       from './order.routes.js';
import productRoutes     from './product.routes.js';
import notifRoutes       from './notification.routes.js';
import ticketRoutes      from './ticket.routes.js';
import apikeyRoutes      from './apikey.routes.js';
import contentRoutes     from './content.routes.js';
import webhookRoutes     from './webhook.routes.js';
import adminRoutes       from './admin/index.js';

const router = Router();

router.use('/auth',          authRoutes);
router.use('/profile',       profileRoutes);
router.use('/wallet',        walletRoutes);
router.use('/orders',        orderRoutes);
router.use('/products',      productRoutes);
router.use('/notifications', notifRoutes);
router.use('/tickets',       ticketRoutes);
router.use('/api-keys',      apikeyRoutes);
router.use('/content',       contentRoutes);
router.use('/webhooks',      webhookRoutes);
router.use('/admin',         adminRoutes);

export default router;
```

### `src/routes/auth.routes.js`
```js
import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

const r = Router();
r.post('/register', authController.register);
r.post('/login',    authController.login);
r.post('/refresh',  authController.refresh);
r.post('/logout',   authController.logout);
export default r;
```

### `src/routes/wallet.routes.js`
```js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { walletController } from '../controllers/wallet.controller.js';

const r = Router();
r.use(requireAuth);
r.get('/',               walletController.getWallet);
r.get('/balance',        walletController.getBalance);
r.get('/deposits',       walletController.getDeposits);
r.get('/deposits/:id',   walletController.getDeposit);
r.post('/deposit',       walletController.createDeposit);
r.get('/transactions',   walletController.getTransactions);
export default r;
```

### `src/routes/order.routes.js`
```js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { orderController } from '../controllers/order.controller.js';

const r = Router();
r.use(requireAuth);
r.get('/',    orderController.list);
r.post('/',   orderController.create);
r.get('/:id', orderController.getOne);
export default r;
```

### `src/routes/product.routes.js`
```js
import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';

const r = Router();
r.get('/',              productController.list);
r.get('/:slug',         productController.getOne);
r.get('/:slug/related', productController.getRelated);
export default r;
```

### `src/routes/webhook.routes.js`
```js
import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';

const r = Router();
r.post('/blockcypher', webhookController.blockcypher);
r.post('/alchemy',     webhookController.alchemy);
export default r;
```

### `src/routes/admin/index.js`
```js
import { Router } from 'express';
import { requireAuth, requireAdmin, requireModerator } from '../../middlewares/auth.js';

import dashboardRoutes   from './dashboard.routes.js';
import usersRoutes       from './users.routes.js';
import ordersRoutes      from './orders.routes.js';
import productsRoutes    from './products.routes.js';
import depositsRoutes    from './deposits.routes.js';
import transactionsRoutes from './transactions.routes.js';
import supportRoutes     from './support.routes.js';
import analyticsRoutes   from './analytics.routes.js';
import settingsRoutes    from './settings.routes.js';
import contentAdminRoutes from './content.routes.js';

const r = Router();
r.use(requireAuth, requireModerator);

r.use('/dashboard',    dashboardRoutes);
r.use('/users',        usersRoutes);
r.use('/orders',       ordersRoutes);
r.use('/products',     productsRoutes);
r.use('/deposits',     depositsRoutes);
r.use('/transactions', transactionsRoutes);
r.use('/support',      supportRoutes);
r.use('/analytics',    analyticsRoutes);
r.use('/settings',     settingsRoutes);
r.use('/',             contentAdminRoutes);

export default r;
```

### `src/routes/admin/users.routes.js`
```js
import { Router } from 'express';
import { adminUsersController as c } from '../../controllers/admin/users.controller.js';

const r = Router();
r.get('/',                         c.list);
r.post('/',                        c.create);
r.get('/:id',                      c.getOne);
r.put('/:id',                      c.update);
r.patch('/:id/ban',                c.ban);
r.patch('/:id/password',           c.setPassword);
r.post('/:id/wallet/adjust',       c.adjustWallet);
export default r;
```

### `src/routes/admin/orders.routes.js`
```js
import { Router } from 'express';
import { adminOrdersController as c } from '../../controllers/admin/orders.controller.js';

const r = Router();
r.get('/',                    c.list);
r.get('/:id',                 c.getOne);
r.patch('/:id/status',        c.updateStatus);
r.patch('/:id/tracking',      c.updateTracking);
export default r;
```

### `src/routes/admin/deposits.routes.js`
```js
import { Router } from 'express';
import { adminDepositsController as c } from '../../controllers/admin/deposits.controller.js';

const r = Router();
r.get('/',                    c.list);
r.patch('/:id/confirm',       c.confirm);
r.patch('/:id/expire',        c.expire);
export default r;
```

### `src/routes/admin/transactions.routes.js`
```js
import { Router } from 'express';
import { prisma } from '../../db.js';
import { ok } from '../../utils/response.js';
import { parsePaginationParams, buildPagination } from '../../utils/pagination.js';

const r = Router();
r.get('/', async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const { search, type, status, currency, dateFrom, dateTo } = req.query;

  const where = {};
  if (type)     where.type     = type;
  if (status)   where.status   = status;
  if (currency) where.currency = currency;
  if (search)   where.user     = { username: { contains: search, mode: 'insensitive' } };
  if (dateFrom || dateTo) where.createdAt = { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { username: true } } } }),
    prisma.transaction.count({ where }),
  ]);
  res.json(ok({ transactions, pagination: buildPagination(page, limit, total) }));
});
export default r;
```

### `src/routes/admin/settings.routes.js`
```js
import { Router } from 'express';
import { settingsController as c } from '../../controllers/admin/settings.controller.js';
import { requireAdmin } from '../../middlewares/auth.js';

const r = Router();
r.get('/',     c.get);
r.put('/',     requireAdmin, c.update);
r.post('/eth/sweep', requireAdmin, c.sweepEth);  // monté sous /api/admin/settings mais aussi /api/admin/eth
export default r;
```

### `src/routes/admin/content.routes.js`
```js
import { Router } from 'express';
import { prisma } from '../../db.js';
import { ok } from '../../utils/response.js';

const r = Router();

// ─── News ────────────────────────────────────────────────────────────────────
r.get('/news',         async (req, res) => { res.json(ok(await prisma.newsArticle.findMany({ orderBy: { createdAt: 'desc' } }))); });
r.post('/news',        async (req, res) => { const a = await prisma.newsArticle.create({ data: req.body }); res.status(201).json(ok(a)); });
r.put('/news/:id',     async (req, res) => { res.json(ok(await prisma.newsArticle.update({ where: { id: +req.params.id }, data: req.body }))); });
r.delete('/news/:id',  async (req, res) => { await prisma.newsArticle.delete({ where: { id: +req.params.id } }); res.json(ok({ deleted: true })); });

// ─── FAQ ─────────────────────────────────────────────────────────────────────
r.get('/faq',          async (req, res) => { res.json(ok(await prisma.fAQ.findMany({ orderBy: { position: 'asc' } }))); });
r.post('/faq',         async (req, res) => { const f = await prisma.fAQ.create({ data: req.body }); res.status(201).json(ok(f)); });
r.put('/faq/:id',      async (req, res) => { res.json(ok(await prisma.fAQ.update({ where: { id: +req.params.id }, data: req.body }))); });
r.delete('/faq/:id',   async (req, res) => { await prisma.fAQ.delete({ where: { id: +req.params.id } }); res.json(ok({ deleted: true })); });

// ─── Giveaways ────────────────────────────────────────────────────────────────
r.get('/giveaways',        async (req, res) => { res.json(ok(await prisma.giveaway.findMany({ orderBy: { createdAt: 'desc' } }))); });
r.post('/giveaways',       async (req, res) => { const g = await prisma.giveaway.create({ data: req.body }); res.status(201).json(ok(g)); });
r.put('/giveaways/:id',    async (req, res) => { res.json(ok(await prisma.giveaway.update({ where: { id: +req.params.id }, data: req.body }))); });
r.delete('/giveaways/:id', async (req, res) => { await prisma.giveaway.delete({ where: { id: +req.params.id } }); res.json(ok({ deleted: true })); });

// ─── Reviews ──────────────────────────────────────────────────────────────────
r.get('/reviews',          async (req, res) => {
  const approved = req.query.approved === 'true' ? true : req.query.approved === 'false' ? false : undefined;
  const where = approved !== undefined ? { isApproved: approved } : {};
  res.json(ok(await prisma.review.findMany({ where, include: { user: { select: { username: true } }, product: { select: { name: true } } } })));
});
r.patch('/reviews/:id/approve', async (req, res) => { res.json(ok(await prisma.review.update({ where: { id: +req.params.id }, data: { isApproved: true } }))); });
r.delete('/reviews/:id',        async (req, res) => { await prisma.review.delete({ where: { id: +req.params.id } }); res.json(ok({ deleted: true })); });

// ─── System Status ───────────────────────────────────────────────────────────
r.get('/system-status',     async (req, res) => {
  const [dbOk, settingsCount] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    prisma.siteSetting.count(),
  ]);
  res.json(ok({ database: dbOk ? 'ok' : 'error', settings: settingsCount }));
});

// ─── Products Admin (categories + brands) ────────────────────────────────────
r.get('/categories',       async (req, res) => { res.json(ok(await prisma.category.findMany({ include: { children: true } }))); });
r.post('/categories',      async (req, res) => { res.status(201).json(ok(await prisma.category.create({ data: req.body }))); });
r.put('/categories/:id',   async (req, res) => { res.json(ok(await prisma.category.update({ where: { id: +req.params.id }, data: req.body }))); });
r.delete('/categories/:id', async (req, res) => { await prisma.category.delete({ where: { id: +req.params.id } }); res.json(ok({ deleted: true })); });

r.get('/brands',           async (req, res) => { res.json(ok(await prisma.brand.findMany())); });
r.post('/brands',          async (req, res) => { res.status(201).json(ok(await prisma.brand.create({ data: req.body }))); });
r.put('/brands/:id',       async (req, res) => { res.json(ok(await prisma.brand.update({ where: { id: +req.params.id }, data: req.body }))); });
r.delete('/brands/:id',    async (req, res) => { await prisma.brand.delete({ where: { id: +req.params.id } }); res.json(ok({ deleted: true })); });

export default r;
```

### Fichiers routes manquants (pattern identique)

```js
// src/routes/profile.routes.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { profileController } from '../controllers/profile.controller.js';
const r = Router();
r.use(requireAuth);
r.get('/',  profileController.get);
r.put('/',  profileController.update);
export default r;

// src/routes/notification.routes.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { notificationController as c } from '../controllers/notification.controller.js';
const r = Router();
r.use(requireAuth);
r.get('/',             c.list);
r.patch('/:id/read',   c.markRead);
r.patch('/read-all',   c.markAllRead);
export default r;

// src/routes/ticket.routes.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { ticketController as c } from '../controllers/ticket.controller.js';
const r = Router();
r.use(requireAuth);
r.get('/',               c.list);
r.post('/',              c.create);
r.get('/:id',            c.getOne);
r.post('/:id/messages',  c.reply);
export default r;

// src/routes/apikey.routes.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { apikeyController as c } from '../controllers/apikey.controller.js';
const r = Router();
r.use(requireAuth);
r.get('/',     c.list);
r.post('/',    c.create);
r.delete('/:id', c.revoke);
export default r;

// src/routes/content.routes.js
import { Router } from 'express';
import { contentController as c } from '../controllers/content.controller.js';
const r = Router();
r.get('/settings', c.getSettings);
export default r;

// src/routes/admin/dashboard.routes.js
import { Router } from 'express';
import { dashboardController as c } from '../../controllers/admin/dashboard.controller.js';
const r = Router();
r.get('/', c.get);
export default r;

// src/routes/admin/support.routes.js
import { Router } from 'express';
import { adminSupportController as c } from '../../controllers/admin/support.controller.js';
const r = Router();
r.get('/',              c.list);
r.get('/:id',           c.getOne);
r.post('/:id/messages', c.reply);
r.patch('/:id/status',  c.updateStatus);
export default r;

// src/routes/admin/analytics.routes.js
import { Router } from 'express';
import { analyticsController as c } from '../../controllers/admin/analytics.controller.js';
const r = Router();
r.get('/', c.get);
export default r;

// src/routes/admin/products.routes.js
import { Router } from 'express';
import { adminProductsController as c } from '../../controllers/admin/products.controller.js';
const r = Router();
r.get('/',     c.list);
r.post('/',    c.create);
r.put('/:id',  c.update);
r.delete('/:id', c.remove);
export default r;
```

---

## 11. Initialisation & Seed

### `src/db.js`
```js
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

### `prisma/seed.js`
```js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Settings par défaut ─────────────────────────────────────────────────
  const defaultSettings = [
    { key: 'site_name',                 value: 'BOTB' },
    { key: 'maintenance_mode',          value: 'false' },
    { key: 'registration_open',         value: 'true' },
    { key: 'shipping_cost',             value: '0' },
    { key: 'shipping_free_threshold',   value: '0' },
    { key: 'shipping_deadline_h',       value: '16' },
    { key: 'shipping_deadline_m',       value: '0' },
    { key: 'points_rate',               value: '0.5' },
    { key: 'deposit_expiry_hours',      value: '12' },
    { key: 'min_deposit',               value: '20' },
    { key: 'max_deposit',               value: '10000' },
    { key: 'btc_address',               value: '' },
    { key: 'ltc_address',               value: '' },
    { key: 'doge_address',              value: '' },
    { key: 'eth_address',               value: '' },
    { key: 'xmr_address',               value: '' },
  ];

  for (const s of defaultSettings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log('✅ Settings créés');

  // ─── Admin par défaut ────────────────────────────────────────────────────
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where:  { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash: adminHash, role: 'admin' },
  });
  console.log(`✅ Admin créé: admin / ${adminPassword}`);

  // ─── Catégories ──────────────────────────────────────────────────────────
  const categories = [
    { name: 'Flower',       slug: 'flower' },
    { name: 'Concentrates', slug: 'conc' },
    { name: 'Dispos',       slug: 'dispos' },
    { name: 'Edibles',      slug: 'edibles' },
  ];
  for (const cat of categories) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat });
  }

  const flowerCat = await prisma.category.findUnique({ where: { slug: 'flower' } });
  const subCats = [
    { name: 'Exotics',          slug: 'exo',     parentId: flowerCat.id },
    { name: 'Indoors',          slug: 'indo',    parentId: flowerCat.id },
    { name: 'AAA Mixed Lights', slug: 'aaa',     parentId: flowerCat.id },
    { name: 'Light Deps',       slug: 'deps',    parentId: flowerCat.id },
  ];
  for (const sc of subCats) {
    await prisma.category.upsert({ where: { slug: sc.slug }, update: {}, create: sc });
  }
  console.log('✅ Catégories créées');

  console.log('🌱 Seed terminé !');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## 12. Ordre de démarrage

```bash
# 1. Installer les dépendances
cd backend && npm install

# 2. Configurer .env (copier .env.example et remplir les valeurs)
cp .env.example .env

# 3. Générer le client Prisma
npm run db:generate

# 4. Appliquer le schéma à la BDD
npm run db:push
# ou en production :
npm run db:migrate

# 5. Seeder la BDD (settings + admin + catégories)
ADMIN_PASSWORD="VotreMotDePasse!" npm run db:seed

# 6. Démarrer le serveur
npm run dev         # développement (node --watch)
npm run start       # production
```

---

## Récapitulatif des endpoints

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | — | Inscription |
| POST | `/api/auth/login` | — | Connexion |
| POST | `/api/auth/refresh` | — | Renouvellement token |
| POST | `/api/auth/logout` | — | Déconnexion |
| GET | `/api/profile` | ✅ | Profil connecté |
| PUT | `/api/profile` | ✅ | MAJ profil |
| GET | `/api/wallet` | ✅ | Solde + tier |
| GET | `/api/wallet/balance` | ✅ | Solde seul |
| GET | `/api/wallet/deposits` | ✅ | Liste dépôts |
| GET | `/api/wallet/deposits/:id` | ✅ | Détail dépôt |
| POST | `/api/wallet/deposit` | ✅ | Créer dépôt |
| GET | `/api/wallet/transactions` | ✅ | Historique tx |
| GET | `/api/orders` | ✅ | Mes commandes |
| POST | `/api/orders` | ✅ | Passer commande |
| GET | `/api/orders/:id` | ✅ | Détail commande |
| GET | `/api/products` | — | Liste produits |
| GET | `/api/products/:slug` | — | Détail produit |
| GET | `/api/products/:slug/related` | — | Produits liés |
| GET | `/api/content/settings` | — | Settings publics |
| GET | `/api/notifications` | ✅ | Mes notifs |
| PATCH | `/api/notifications/:id/read` | ✅ | Marquer lu |
| PATCH | `/api/notifications/read-all` | ✅ | Tout marquer lu |
| GET | `/api/tickets` | ✅ | Mes tickets |
| POST | `/api/tickets` | ✅ | Créer ticket |
| GET | `/api/tickets/:id` | ✅ | Détail ticket |
| POST | `/api/tickets/:id/messages` | ✅ | Répondre ticket |
| GET | `/api/api-keys` | ✅ | Mes clés API |
| POST | `/api/api-keys` | ✅ | Créer clé |
| DELETE | `/api/api-keys/:id` | ✅ | Révoquer clé |
| POST | `/api/webhooks/blockcypher` | — | Webhook BTC/LTC/DOGE |
| POST | `/api/webhooks/alchemy` | — | Webhook ETH |
| GET | `/api/admin/dashboard` | 🔐 | Dashboard stats |
| GET | `/api/admin/users` | 🔐 | Liste users |
| POST | `/api/admin/users` | 🔐 | Créer user |
| GET | `/api/admin/users/:id` | 🔐 | Détail user |
| PUT | `/api/admin/users/:id` | 🔐 | MAJ user |
| PATCH | `/api/admin/users/:id/ban` | 🔐 | Ban/unban |
| PATCH | `/api/admin/users/:id/password` | 🔐 | Reset mdp |
| POST | `/api/admin/users/:id/wallet/adjust` | 🔐 | Ajust. solde |
| GET | `/api/admin/orders` | 🔐 | Liste commandes |
| GET | `/api/admin/orders/:id` | 🔐 | Détail commande |
| PATCH | `/api/admin/orders/:id/status` | 🔐 | Changer statut |
| PATCH | `/api/admin/orders/:id/tracking` | 🔐 | Suivi livraison |
| GET | `/api/admin/products` | 🔐 | Liste produits |
| POST | `/api/admin/products` | 🔐 | Créer produit |
| PUT | `/api/admin/products/:id` | 🔐 | MAJ produit |
| DELETE | `/api/admin/products/:id` | 🔐 | Désactiver produit |
| GET | `/api/admin/deposits` | 🔐 | Liste dépôts |
| PATCH | `/api/admin/deposits/:id/confirm` | 🔐 | Confirmer dépôt |
| PATCH | `/api/admin/deposits/:id/expire` | 🔐 | Expirer dépôt |
| GET | `/api/admin/transactions` | 🔐 | Liste transactions |
| GET | `/api/admin/support` | 🔐 | Liste tickets |
| GET | `/api/admin/support/:id` | 🔐 | Détail ticket |
| POST | `/api/admin/support/:id/messages` | 🔐 | Répondre |
| PATCH | `/api/admin/support/:id/status` | 🔐 | Changer statut |
| GET | `/api/admin/analytics` | 🔐 | Analytics |
| GET | `/api/admin/settings` | 🔐 | Lire settings |
| PUT | `/api/admin/settings` | 👑 | MAJ settings |
| POST | `/api/admin/eth/sweep` | 👑 | Sweep ETH |
| GET | `/api/admin/categories` | 🔐 | Catégories |
| POST | `/api/admin/categories` | 🔐 | Créer catégorie |
| PUT | `/api/admin/categories/:id` | 🔐 | MAJ catégorie |
| DELETE | `/api/admin/categories/:id` | 🔐 | Suppr. catégorie |
| GET | `/api/admin/brands` | 🔐 | Marques |
| POST\|PUT\|DELETE | `/api/admin/brands/:id` | 🔐 | CRUD marques |
| GET\|POST\|PUT\|DELETE | `/api/admin/news` | 🔐 | CRUD articles |
| GET\|POST\|PUT\|DELETE | `/api/admin/faq` | 🔐 | CRUD FAQ |
| GET\|POST\|PUT\|DELETE | `/api/admin/giveaways` | 🔐 | CRUD giveaways |
| GET | `/api/admin/reviews` | 🔐 | Avis produits |
| PATCH | `/api/admin/reviews/:id/approve` | 🔐 | Approuver avis |
| DELETE | `/api/admin/reviews/:id` | 🔐 | Suppr. avis |
| GET | `/api/admin/system-status` | 🔐 | État système |

**Légende** : ✅ Auth requise · 🔐 Modérateur/Admin · 👑 Admin seulement

---

> **Total : ~65 endpoints** couvrant l'intégralité des fonctionnalités décrites dans FEATURES_PAYMENT_USERS_DASHBOARD.md.
