# Analyse complète — Paiements, Gestion des Utilisateurs & Dashboard Admin
> Document de référence pour reproduire ces fonctionnalités dans un autre projet React + Express + PostgreSQL (Prisma).
> Chaque section indique le fichier source exact, les endpoints API, les champs de BDD et la logique métier.

---

## TABLE DES MATIÈRES
1. [Stack technique](#stack-technique)
2. [Authentification & Sessions](#authentification--sessions)
3. [Gestion des Utilisateurs (côté client)](#gestion-des-utilisateurs-côté-client)
4. [Gestion des Utilisateurs (côté admin)](#gestion-des-utilisateurs-côté-admin)
5. [Système de Paiement — Vue d'ensemble](#système-de-paiement--vue-densemble)
6. [Wallet utilisateur (dépôts de crédits)](#wallet-utilisateur-dépôts-de-crédits)
7. [Checkout — Paiement par solde interne](#checkout--paiement-par-solde-interne)
8. [Transactions](#transactions)
9. [Admin — Gestion des Dépôts](#admin--gestion-des-dépôts)
10. [Admin — Gestion des Transactions](#admin--gestion-des-transactions)
11. [Dashboard Admin — Vue principale](#dashboard-admin--vue-principale)
12. [Dashboard Admin — Analytics](#dashboard-admin--analytics)
13. [Dashboard Admin — Settings](#dashboard-admin--settings)
14. [Dashboard Admin — Layout & Navigation](#dashboard-admin--layout--navigation)
15. [Variables d'environnement](#variables-denvironnement)
16. [Endpoints API complets](#endpoints-api-complets)
17. [Schéma de base de données (entités clés)](#schéma-de-base-de-données-entités-clés)
18. [Dépendances npm clés](#dépendances-npm-clés)

---

## Stack Technique

| Couche     | Technologie                                              |
|------------|----------------------------------------------------------|
| Frontend   | React 18, React Router v6, Recharts, qrcode.react        |
| Backend    | Node.js + Express, express-async-errors, Prisma ORM      |
| Base de données | PostgreSQL                                          |
| Auth       | JWT (accessToken 15min) + refreshToken (localStorage)    |
| Crypto     | BlockCypher API (BTC/LTC/DOGE), Alchemy SDK (ETH), ethers.js HDNodeWallet |
| Images     | Cloudinary ou CDN local                                  |
| Emails     | SMTP (optionnel, non utilisé pour notifications)         |
| Notifications | Telegram QR code (pas d'email)                        |

**Convention API** : Toutes les réponses suivent l'enveloppe `{ success: true, data: {...} }` ou `{ success: false, error: "message" }`.

**Authentification admin** : Header `Authorization: Bearer <token>` — middleware `requireAuth` + `requireAdmin` sur toutes les routes `/api/admin/*`.

---

## Authentification & Sessions

### Fichiers sources
- `backend/src/controllers/auth.controller.js`
- `backend/src/services/auth.service.js`
- `frontend/src/context/AppContext.jsx`
- `frontend/src/utils/api.js`
- `frontend/src/pages/LoginPage.jsx`

### Endpoints
```
POST /api/auth/register   → crée un compte (username + password)
POST /api/auth/login      → retourne accessToken + refreshToken
POST /api/auth/refresh    → renouvelle l'accessToken depuis le refreshToken
POST /api/auth/logout     → logout côté serveur (stateless, vide le LS côté client)
```

### Flux de login
1. Formulaire : `username` + `password` (min 6 chars) + champ optionnel 2FA (prévu mais non implémenté côté backend actuellement)
2. POST `/api/auth/login` → vérifie `isActive`, compare hash bcrypt
3. Répons : `{ token, refreshToken, user: { id, username, role, balance, points } }`
4. Stockage : `localStorage.setItem('token', ...)` + `localStorage.setItem('refreshToken', ...)`
5. Ensuite `loadUserData()` est appelé : charge `/profile`, `/wallet`, `/categories`, `/content/settings` en parallèle (Promise.all)
6. Redirection vers `location.state?.from?.pathname || '/'`

### Renouvellement automatique du token
Le helper `api.js` intercepte les réponses HTTP 401 :
```js
// Si le user avait un token (hadToken=true) → tente le refresh
// Si le refresh échoue → logout() → redirect /login
```
L'accessToken expire en **15 minutes**. Le refreshToken n'expire pas côté serveur (JWT signé avec `JWT_REFRESH_SECRET`).

### Tokens JWT
```js
// Access token (15min)
jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' })
// Refresh token (pas d'expiration définie dans le code actuel)
jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET)
```

### Page Login (`LoginPage.jsx`)
- AgeGate modal affiché en overlay avant le formulaire (mémorisé dans `localStorage.age_verified`)
- Si token déjà présent → `<Navigate to={from} replace />`
- Bouton "Use Recovery Code" pour basculer entre 2FA token et code de récupération (UI prête, backend à implémenter)
- Show/hide password (SVG eye icon)

### Inscription
- POST `/api/auth/register` : `{ username, password }`
- Crée 3 notifications de bienvenue automatiquement
- Pas d'email de confirmation

### AppContext — État global auth
```js
const { user, balance, login, logout, loadUserData, loadingAuth } = useApp();
// user = { id, username, role, bio, telegramHandle, signalDetails, sessionDetails, btcRefundAddress, xmrRefundAddress, ... }
// balance = number (USD)
// loadingAuth = true pendant la vérification initiale du token
```

---

## Gestion des Utilisateurs (côté client)

### Profil utilisateur
**Fichier** : `frontend/src/pages/ProfilePage.jsx`

Sections affichées (lecture seule avec bouton Edit pour chaque bloc) :
1. **Private details** — Username + Markup %
2. **Signal details** — numéro/handle Signal
3. **Session details** — identifiant Session messenger
4. **BTC Refund** — adresse Bitcoin pour remboursements
5. **XMR Refund** — adresse Monero pour remboursements
6. **Telegram Details** — handle Telegram + bouton "Auto-Link Account"

> **Note** : Le site ne collecte pas d'email. L'identification se fait par username uniquement.

### Wallet / Crédits
**Fichier** : `frontend/src/pages/WalletPage.jsx`

3 onglets :
- **Credit Deposits** : historique des dépôts crypto avec colonnes Id / Status / Currency / Address / Created / Details
- **Credit History** : transactions (type, montant +/-, date, note)
- **Legacy Credit History** : vide (placeholder)

---

## Gestion des Utilisateurs (côté admin)

### Liste des utilisateurs
**Fichier** : `frontend/src/pages/admin/AdminUsers.jsx`  
**Endpoint** : `GET /api/admin/users?page=1&limit=20&search=…&tier=…`

Colonnes tableau :
| Colonne  | Description                                     |
|----------|-------------------------------------------------|
| User     | Avatar initiale + username                      |
| Role     | customer / moderator / admin                    |
| Tier     | basic / preferred / gold / platinum (StatusBadge) |
| Balance  | Solde USD formaté                               |
| Orders   | Nombre de commandes (`_count.orders`)           |
| Joined   | Date d'inscription                              |
| Actions  | Bouton "View" → detail page                     |

Filtres :
- SearchInput (recherche par username, insensible à la casse)
- Select "All tiers" | basic | preferred | gold | platinum

**Bouton "+ Create User"** → modal avec : username, password, role (customer/moderator/admin)  
Endpoint : `POST /api/admin/users` → `{ username, password, role }`

**Tiers basés sur `totalSpent`** (calculé côté backend) :
```
basic     : $0–$999
preferred : $1000–$1999
gold      : $2000–$4999
platinum  : $5000+
```

**Cashback par tier** (wallet.service.js) :
```
basic     : 0.5%
preferred : 1.0%
gold      : 1.3%
platinum  : 1.5%
```

### Détail d'un utilisateur
**Fichier** : `frontend/src/pages/admin/AdminUserDetail.jsx`  
**Endpoint** : `GET /api/admin/users/:id`

6 onglets :

#### Onglet Profile
2 cards côte à côte :
- **Account Info** : id, username, role, status (Active/Banned), tier, markupPct, points, totalSpent, balance, joined, lastLogin
- **Contact & Details** : telegramHandle, signalDetails, sessionDetails, btcRefundAddress, xmrRefundAddress, bio

#### Onglet Orders
Tableau : Order# / Total / Status / Date  
Clique sur une ligne → `/mario-dashboard/orders/:id`  
Données : 5 dernières commandes (`recentOrders`)

#### Onglet Transactions
Tableau : Type (StatusBadge) / Amount (vert si +, rouge si -) / Note / Date  
Données : 5 dernières transactions (`recentTransactions`)

#### Onglet Deposits
Tableau : Currency / USD Credited / Status / Date  
Données : 5 derniers dépôts (`recentDeposits`)

#### Onglet Tickets
Tableau : Subject / Status / Priority / Date  
Clique → `/mario-dashboard/support/:id`  
Données : 3 derniers tickets (`recentTickets`)

#### Onglet API Keys
Tableau : Label / Prefix… / Last Used / Active / Created  
Données : toutes les clés API du user (`apiKeys`)

### Actions disponibles sur un utilisateur

#### Ban / Unban
```
PATCH /api/admin/users/:id/ban
```
Toggle `isActive` (false = banni). Bouton rouge si actif, vert si banni.

#### Set Password (modal)
```
PATCH /api/admin/users/:id/password
Body: { password: "..." }  (min 6 chars)
```
Champ avec show/hide. Confirmation 2e champ. Message de succès 1.5s puis fermeture auto.

#### Edit User (modal)
```
PUT /api/admin/users/:id
Body: { username, role, isActive }
```
Champs : username (required), role (select), status (Active/Banned select).

#### Adjust Balance (modal)
```
POST /api/admin/users/:id/wallet/adjust
Body: { type: "credit"|"debit", amount: float, reason: string }
```
- `credit` : incrémente le solde + crée une transaction `adjustment` avec montant positif
- `debit` : décrémente le solde + crée une transaction `adjustment` avec montant négatif
- Vérifie que le solde est suffisant pour un débit
- `reason` obligatoire (string)

**Le résultat est immédiat** : la page recharge les données (`load()` appelé après succès).

---

## Système de Paiement — Vue d'ensemble

### Principe fondamental
Il n'y a **pas** de paiement en temps réel lors de la commande. Le modèle est :

1. L'utilisateur **recharge son solde interne** (crédits USD) via des dépôts crypto.
2. Lors du **checkout**, le montant est débité du solde interne.
3. Le checkout affiche une option de "Payment Method" mais c'est en réalité la méthode utilisée pour le dépôt initial, **pas un paiement direct**.

### Devises acceptées pour les dépôts
| Crypto | Mécanisme        | Confirmation | Temps     |
|--------|-----------------|--------------|-----------|
| BTC    | BlockCypher API  | Automatique  | 10–60 min |
| LTC    | BlockCypher API  | Automatique  | 5–30 min  |
| DOGE   | BlockCypher API  | Automatique  | 5–15 min  |
| ETH    | Alchemy webhook  | Automatique  | 1–5 min   |
| XMR    | Manuel           | Manuel (24h) | < 24h     |

### Méthodes affichées au checkout
XMR · BTC · DOGE · LTC (radio buttons). Ce champ est stocké comme `paymentMethod` sur la commande — informatif uniquement.

---

## Wallet Utilisateur (Dépôts de Crédits)

### Fichiers sources
- `frontend/src/pages/WalletPage.jsx`
- `backend/src/controllers/wallet.controller.js`
- `backend/src/services/wallet.service.js`
- `backend/src/services/crypto.service.js`

### Endpoints wallet
```
GET  /api/wallet           → { balance, points, totalSpent, tier, cashback, remaining, daysLeft }
GET  /api/wallet/balance   → { balance }
GET  /api/wallet/deposits  → { deposits: [...], pagination }
GET  /api/wallet/deposits/:id
POST /api/wallet/deposit   → { currency: "BTC"|"LTC"|"DOGE"|"ETH"|"XMR" }
GET  /api/wallet/transactions → { transactions: [...], pagination }
```

### Flux de création d'un dépôt (étape par étape)

#### Étape 1 — Modal "Add Funds"
1. User clique "Add Funds"
2. Modal Step 1 s'ouvre (`modalStep = 'select'`)
3. Sélection de la crypto (BTC/LTC/DOGE/ETH/XMR) avec badges colorés
4. Affichage des terms and conditions (liste de 10 clauses)
5. Checkbox "I have read and agree to the deposit terms" (obligatoire)
6. Clic "Generate Address" → POST `/api/wallet/deposit`

#### Étape 2 — Modal avec adresse + QR
1. `modalStep = 'address'` → Modal Step 2 s'ouvre
2. Affichage :
   - QR code (`qrcode.react` `QRCodeSVG`, taille 180px)
   - URI scheme : `bitcoin:ADDR`, `litecoin:ADDR`, `dogecoin:ADDR`, `ethereum:ADDR`, `monero:ADDR`
   - Adresse en `<code>` + bouton copier (clipboard API)
   - Countdown timer (HH:MM:SS) jusqu'à `expiresAt` (mis à jour toutes les secondes via `setInterval`)
   - Guide "How it works" avec badge vert `⚡ Auto-confirmed` ou orange `👤 Manual review`
   - Steps numérotés spécifiques à chaque crypto
   - Warning coloré (vert si auto, rouge si manuel)
   - Pour XMR : bouton lien vers `/support`

### Logique backend de génération d'adresse (`crypto.service.js`)

#### BTC / LTC / DOGE (BlockCypher)
```js
// 1. Récupère l'adresse destination depuis admin settings (btc_address / ltc_address / doge_address)
// 2. POST https://api.blockcypher.com/v1/{chain}/forwards?token=TOKEN
//    Body: { destination, callback_url: "https://your-domain/api/webhooks/blockcypher" }
// 3. Retourne input_address (adresse unique pour ce dépôt) + hookId
// Les fonds reçus sur input_address sont auto-forwardés à destination
```

#### ETH (Alchemy + HD Wallet)
```js
// 1. Dérive une adresse ETH unique depuis la seed phrase (BIP44)
//    HDNodeWallet.fromPhrase(ETH_HD_SEED, undefined, `m/44'/60'/0'/0/${depositId}`)
// 2. Enregistre cette adresse dans le webhook Alchemy
//    PATCH https://dashboard.alchemy.com/api/update-webhook-addresses
// 3. Alchemy notifie quand des fonds arrivent sur cette adresse
```

#### XMR (Manuel)
```js
// Retourne l'adresse XMR globale stockée dans admin settings (xmr_address)
// TOUTES les transactions XMR vont à la même adresse
// L'user doit ouvrir un ticket support avec son TX Hash
// L'admin confirme manuellement
```

### Données de la table `Deposit`
| Champ           | Type      | Description                                         |
|-----------------|-----------|-----------------------------------------------------|
| id              | int       | PK                                                  |
| userId          | int       | FK → User                                           |
| currency        | string    | BTC / LTC / DOGE / ETH / XMR                       |
| address         | string    | Adresse de dépôt (ou 'pending' pendant création)    |
| status          | string    | awaiting / partial / confirmed / expired            |
| amountExpected  | decimal?  | Montant crypto attendu                              |
| amountReceived  | decimal   | Montant crypto reçu                                 |
| usdCredited     | decimal   | USD crédité sur le compte                           |
| expiresAt       | datetime  | Date d'expiration (défaut: 12h configurables)       |
| confirmedAt     | datetime? | Date de confirmation                                |
| transactionId   | int?      | FK → Transaction créée lors de la confirmation     |
| hookId          | string?   | ID webhook BlockCypher (pour suppression ultérieure)|
| ethIndex        | int?      | Index HD wallet pour ETH (= depositId)              |
| createdAt       | datetime  |                                                     |

### Statuts de dépôt
```
awaiting  → adresse générée, en attente de réception
partial   → fonds partiellement reçus
confirmed → fonds confirmés, solde crédité
expired   → adresse expirée (après N heures sans paiement)
```

### Termes et conditions affichés (DEPOSIT_TERMS)
1. Age 21+ requis
2. Envoyer n'importe quel montant à l'adresse affichée
3. Crédit basé sur le taux de change au moment de la confirmation on-chain
4. Crédit en USD
5. Exemple : $50 en BTC = $50 de store credit
6. Annulation après 12h sans transaction
7. Ne pas réutiliser les adresses — 1 transaction seulement
8. Dépôts supplémentaires perdus définitivement
9. Ne pas envoyer vers une adresse annulée
10. Fonds vers adresse annulée perdus définitivement

---

## Checkout — Paiement par Solde Interne

### Fichier source
`frontend/src/pages/CheckoutPage.jsx`

### Endpoint
```
POST /api/orders
Body: {
  items: [{ productId, quantity }],
  shippingAddress: "123 Main St, City 10001",
  paymentMethod: "XMR"|"BTC"|"DOGE"|"LTC",
  name: string,
  email: string
}
```

### Flux complet
1. Vérification du solde avant soumission : `balance >= total`
2. Si insuffisant → message d'erreur rouge + lien `/wallet`
3. Formulaire en 2 sections :
   - **Delivery Information** : name, email, address, city, postal, country
   - **Payment Method** : radio buttons XMR / BTC / DOGE / LTC (icônes SVG inline)
4. `POST /api/orders` → backend :
   - Groupe les items du panier par productId
   - Débite `totalAmount` du solde utilisateur
   - Crée la commande + items
   - Retourne `{ order, newBalance }`
5. Succès → affiche écran de confirmation avec `order.id` (ou `order.orderId`)
6. `setCartItems([])` + `setBalance(data.newBalance)`

### Calcul du total
```js
subtotal = sum(item.price) // prix déjà formaté "$X.XX" → parseFloat
shippingFee = (freeThreshold > 0 && subtotal >= freeThreshold) ? 0 : shippingCost
total = subtotal + shippingFee
```
`shippingCost` et `shipping_free_threshold` viennent de `settings` (AppContext, chargé depuis `/api/content/settings`).

### Écran de confirmation
- Icône check verte (SVG 40x40)
- "Order Confirmed!"
- Numéro de commande
- Liens : "View Orders" + "Continue Shopping"

---

## Transactions

### Modèle Transaction (table `Transaction`)
| Champ       | Type    | Description                                          |
|-------------|---------|------------------------------------------------------|
| id          | int     | PK                                                   |
| frontendId  | string  | ID lisible généré par `formatTxnId(Date.now())`      |
| userId      | int     | FK → User                                            |
| type        | string  | deposit / purchase / refund / adjustment / bonus     |
| amount      | decimal | Positif = crédit, négatif = débit                    |
| currency    | string  | USD / BTC / DOGE / LTC / XMR / ETH                  |
| status      | string  | pending / confirmed / failed                         |
| note        | string? | Description lisible                                  |
| txHash      | string? | Hash blockchain (pour dépôts auto)                   |
| orderId     | int?    | FK → Order (pour type=purchase)                      |
| depositId   | int?    | FK → Deposit (pour type=deposit)                     |
| createdAt   | datetime|                                                      |

### Quand une transaction est créée
| Event               | Type       | Montant |
|---------------------|------------|---------|
| Dépôt confirmé      | deposit    | +USD    |
| Commande passée     | purchase   | -USD    |
| Remboursement       | refund     | +USD    |
| Ajustement admin    | adjustment | ±USD    |
| Bonus               | bonus      | +USD    |

---

## Admin — Gestion des Dépôts

### Fichier source
`frontend/src/pages/admin/AdminDeposits.jsx`

### Endpoint
```
GET  /api/admin/deposits?page=1&limit=20&status=…&currency=…
PATCH /api/admin/deposits/:id/confirm   → { usdAmount, note? }
PATCH /api/admin/deposits/:id/expire
```

### Tableau des dépôts
Colonnes : ID (8 chars) / User / Currency (badge coloré) / Address / Expected / Received / USD Credited / Status / Expires / Created / Actions

**Couleurs par crypto** :
```js
BTC:  bg rgba(247,147,26,.15) color #f7931a
ETH:  bg rgba(98,126,234,.15) color #627eea
DOGE: bg rgba(194,166,51,.15) color #c2a633
LTC:  bg rgba(52,93,157,.15)  color #345d9d
XMR:  bg rgba(255,102,0,.15)  color #ff6600
```

### Bandeau informatif (Process Reference Panel)
2 panels côte à côte :
- **Vert** "⚡ Auto-confirmed (BTC · LTC · DOGE · ETH)" : explication du flow webhook
- **Orange** "👤 Manual review required (XMR)" : checklist pour confirmer un dépôt XMR

### Actions par dépôt

#### Confirmer un dépôt (bouton vert "Confirm")
- Visible si status = `awaiting` ou `partial`
- Modal avec :
  - Pour XMR : encart orange "XMR manual confirmation checklist" (3 étapes)
  - Champ "USD Amount to Credit" (number, min 0.01)
  - Champ "Note" (optionnel)
  - Bouton "Confirm & Credit"
- Backend : crée une Transaction `deposit`, update Deposit → `confirmed`, incrémente le balance user

#### Expirer un dépôt (bouton rouge "Expire")
- Visible si status = `awaiting`
- ConfirmModal de confirmation (danger)
- Backend : update Deposit → `expired`

#### Voir l'adresse complète
- Clic sur l'adresse tronquée → modal avec adresse complète en `monospace`
- Bouton "Copy Address"

---

## Admin — Gestion des Transactions

### Fichier source
`frontend/src/pages/admin/AdminTransactions.jsx`

### Endpoint
```
GET /api/admin/transactions?page=1&limit=25&search=…&type=…&status=…&currency=…&dateFrom=…&dateTo=…
```

### Filtres disponibles
- **Search** (par username)
- **Type** : deposit / purchase / refund / adjustment / bonus
- **Status** : completed / pending / failed
- **Currency** : USD / BTC / DOGE / LTC / XMR
- **Date From / Date To** (inputs de type date)
- Bouton "✕ Clear" si au moins un filtre actif

### Colonnes du tableau
| Colonne    | Description                                          |
|------------|------------------------------------------------------|
| ID         | 8 premiers chars (monospace, gris)                   |
| User       | Username (bold)                                      |
| Type       | StatusBadge (deposit / purchase / refund / ...)      |
| Amount     | Vert si ≥ 0, rouge si < 0 (format $XX.XX)           |
| Currency   | Monospace gris                                       |
| Status     | StatusBadge (completed / pending / failed)           |
| Note       | Texte gris, max-width 160px                          |
| Related to | "Order #id" ou "Deposit #id" ou "—"                  |
| Date       | toLocaleString() (date + heure)                      |

---

## Dashboard Admin — Vue Principale

### Fichier source
`frontend/src/pages/admin/AdminDashboard.jsx`

### Endpoint
```
GET /api/admin/dashboard
```

### Réponse API (structure complète)
```json
{
  "stats": {
    "revenue":  { "today": 0, "thisWeek": 0, "thisMonth": 0, "total": 0 },
    "orders":   { "today": 0, "pending": 0, "shipped": 0, "total": 0 },
    "users":    { "total": 0, "newToday": 0, "active": 0 },
    "products": { "total": 0, "lowStock": 0, "outOfStock": 0 },
    "tickets":  { "open": 0, "urgent": 0 }
  },
  "charts": {
    "revenueChart":      [{ "date": "YYYY-MM-DD", "revenue": 0 }],  // 30 derniers jours
    "ordersStatusChart": { "processing": 0, "shipped": 0, "delivered": 0, "cancelled": 0 },
    "topProducts":       [{ "id", "name", "imageUrl", "totalSold", "totalRevenue" }],
    "newUsersChart":     [{ "date": "YYYY-MM-DD", "count": 0 }]  // 7 derniers jours
  },
  "recentOrders":           [{ "id", "orderNumber", "user": {"username"}, "total", "status", "placedAt" }],
  "lowStockProducts":       [{ "id", "name", "stock", "imageUrl" }],
  "recentUnassignedTickets":[{ "id", "frontendId", "subject", "category", "priority", "createdAt" }]
}
```

### Grille de StatCards (8 cartes)
| Label               | Icon     | Couleur  | Valeur                           | Sous-texte                |
|---------------------|----------|----------|----------------------------------|---------------------------|
| Total Revenue       | Dollar   | #4361ee  | `stats.revenue.total`            | `Today: $X`               |
| Total Orders        | Box      | #2196f3  | `stats.orders.total`             | `Today: N`                |
| Pending Orders      | Clock    | #ff9800  | `stats.orders.pending`           | —                         |
| Shipped Orders      | Truck    | #9c27b0  | `stats.orders.shipped`           | —                         |
| Total Users         | Users    | #43a047  | `stats.users.total`              | —                         |
| Products            | Bag      | #1a1a2e  | `stats.products.total`           | `Low stock: N`            |
| Open Tickets        | Ticket   | #e53935  | `stats.tickets.open`             | `Urgent: N`               |
| Revenue This Month  | Calendar | #4361ee  | `stats.revenue.thisMonth`        | —                         |

**Skeleton loading** : pendant le chargement, chaque valeur est remplacée par `<span class="admin-skel">` (animation grise).

### Charts (Recharts)

#### Row 1 — 2 colonnes
1. **Revenue — Last 30 Days** (`LineChart`)
   - Data : `charts.revenueChart` → `{ date, revenue }`
   - XAxis : `date.slice(5)` (MM-DD), YAxis : `$N`
   - Line : stroke `#4361ee`, strokeWidth 2, dot false
   - Tooltip : `$N.NN Revenue`

2. **Orders by Status** (`PieChart` donut)
   - Data : `Object.entries(ordersStatusChart)` → `[{ name, value }]`
   - innerRadius 55, outerRadius 85, paddingAngle 2
   - Couleurs : `processing=#2196f3, shipped=#ff9800, delivered=#43a047, cancelled=#e53935`
   - Legend + Tooltip

#### Row 2 — 2 colonnes
3. **Top 5 Products** (`BarChart` horizontal)
   - Data : `charts.topProducts` → `{ name, sold }` (ou `totalSold`)
   - Layout vertical, barSize 14, radius [0,4,4,0]
   - Fill `#4361ee`
   - Label tronqué à 14 chars

4. **New Users — Last 7 Days** (`BarChart` vertical)
   - Data : `charts.newUsersChart` → `{ date, count }`
   - barSize 22, radius [4,4,0,0], fill `#43a047`

### Tables en bas de page — 2 colonnes

#### Recent Orders
Colonnes : Order# (bold) / Customer (username) / Total ($) / Status (StatusBadge)  
10 dernières commandes

#### Low Stock Products
Colonnes : Product (name) / Stock  
Stock en orange si > 0, rouge si = 0  
5 produits avec stock le plus bas (0 < stock ≤ 10)

---

## Dashboard Admin — Analytics

### Fichier source
`frontend/src/pages/admin/AdminAnalytics.jsx`

### Endpoint
```
GET /api/admin/analytics?period=30d
Périodes : 7d | 30d | 90d | 1y
```

### Réponse API (structure complète)
```json
{
  "summary": {
    "revenue":       0,
    "orders":        0,
    "newUsers":      0,
    "avgOrderValue": 0,
    "totalDeposits": 0
  },
  "revenueChart":        [{ "date", "revenue" }],
  "ordersChart":         [{ "date", "count" }],
  "newUsersChart":       [{ "date", "count" }],
  "walletFlow":          [{ "date", "deposits", "purchases" }],
  "topProducts":         [{ "id", "name", "category", "revenue", "sold" }],
  "topCategories":       [{ "name", "revenue" }],
  "depositsByCurrency":  [{ "currency", "value" }],
  "ordersStatusChart":   { "processing": 0, "shipped": 0, "delivered": 0, "cancelled": 0, "refunded": 0 },
  "revenueByMethod":     [{ "method", "revenue" }]
}
```

### Sélecteur de période
4 boutons : 7 days | 30 days | 90 days | 1 year  
Style `admin-btn-primary` (actif) ou `admin-btn-secondary`  
Déclenche un nouvel appel API à chaque changement

### Summary Cards (5 cartes)
| Label           | Couleur   | Format    |
|-----------------|-----------|-----------|
| Revenue         | #4361ee   | $X ou $Xk |
| Orders          | #2196f3   | entier    |
| New Users       | #43a047   | entier    |
| Avg Order       | #ff9800   | $X ou $Xk |
| Deposits        | #9c27b0   | $X ou $Xk |

`fmtK(n)` : si n ≥ 1000 → `$X.Xk`, sinon `$X`

### Charts (8 graphiques)

#### Row 1 — Revenue + New Users (LineChart)
- CartesianGrid `strokeDasharray="3 3"` gris clair
- Revenue : stroke `#4361ee`, strokeWidth 2.5, activeDot r=4
- New Users : stroke `#43a047`

#### Row 2 — Orders by Status (Donut) + Revenue by Payment Method (Bar)
- Donut : innerRadius 60, outerRadius 90
- Bar revenue by method : barSize 24, radius [4,4,0,0], couleurs `CAT_COLORS[]` cycliques

#### Row 3 — Top 10 Products (Tableau)
Colonnes : # / Product (bold) / Category / Revenue (vert bold) / Units Sold

#### Row 4 — Revenue by Category (Bar horizontal) + Deposits by Currency (Donut)
- Category bar : layout vertical, barSize 16, radius [0,4,4,0]
- Deposits donut : innerRadius 50, outerRadius 80, couleurs crypto
- Couleurs dépôts : `{ BTC:#f7931a, ETH:#627eea, DOGE:#c2a633, LTC:#345d9d, XMR:#ff6600, USD:#4361ee }`

#### Row 5 — Wallet Flow (AreaChart)
- 2 aires superposées : deposits (vert) + purchases (rouge)
- `linearGradient` SVG pour effet dégradé transparent
- `gradDeposits` : #43a047, `gradPurchases` : #e53935

---

## Dashboard Admin — Settings

### Fichier source
`frontend/src/pages/admin/AdminSettings.jsx`

### Endpoints
```
GET /api/admin/settings        → { settings: { key: value, ... } }
PUT /api/admin/settings        → Body: { key: value, ... }
POST /api/admin/eth/sweep      → effectue le sweep ETH
```

### 5 onglets

#### Onglet General
| Clé setting         | Type     | Description                                              |
|---------------------|----------|----------------------------------------------------------|
| `site_name`         | string   | Nom du site                                              |
| `maintenance_mode`  | boolean  | Si true, le store est inaccessible aux clients           |
| `registration_open` | boolean  | Si false, les inscriptions sont désactivées              |

#### Onglet Shipping
| Clé setting                | Type   | Description                                         |
|----------------------------|--------|-----------------------------------------------------|
| `shipping_cost`            | float  | Coût de livraison ($)                               |
| `shipping_free_threshold`  | float  | Seuil pour livraison gratuite ($)                   |
| `shipping_deadline_h`      | int    | Heure limite commande same-day (heures)             |
| `shipping_deadline_m`      | int    | Heure limite commande same-day (minutes)            |

#### Onglet Loyalty
| Clé setting   | Type  | Description                            |
|---------------|-------|----------------------------------------|
| `points_rate` | float | Points par $1 dépensé (ex: 0.5)        |

Tableau read-only des tiers de fidélité :
```
Basic     : $0–$999    → 0% cashback
Preferred : $1000–$1999 → 1% cashback
Gold      : $2000–$4999 → 2.5% cashback
Platinum  : $5000+      → 5% cashback
```

#### Onglet Deposits
| Clé setting           | Type  | Description                                  |
|-----------------------|-------|----------------------------------------------|
| `deposit_expiry_hours`| int   | Durée de vie des adresses de dépôt (défaut 12h)|
| `min_deposit`         | float | Dépôt minimum ($)                            |
| `max_deposit`         | float | Dépôt maximum ($)                            |

#### Onglet Crypto — Adresses de destination
| Clé setting    | Crypto | Mécanisme                           |
|----------------|--------|-------------------------------------|
| `btc_address`  | BTC    | Auto-forwarded via BlockCypher      |
| `doge_address` | DOGE   | Auto-forwarded via BlockCypher      |
| `ltc_address`  | LTC    | Auto-forwarded via BlockCypher      |
| `eth_address`  | ETH    | Destination du sweep manuel         |
| `xmr_address`  | XMR    | Adresse unique partagée             |

**Important** : Ces adresses sont stockées en BDD (`SiteSetting`), **pas** dans les variables d'environnement (sauf XMR qui a un fallback env).

#### ETH Sweep
Bouton "Sweep ETH to my address" :
1. Confirmation inline (affiche l'adresse tronquée + bouton "Yes, sweep")
2. POST `/api/admin/eth/sweep`
3. Collecte tout l'ETH des adresses de dépôt confirmées
4. Affiche résultat : N address(es) swept + détails par adresse (amountEth, txHash tronqué)

**Logique sweep** : parcourt tous les deposits ETH `confirmed`, récupère le solde de chaque adresse HD wallet dérivée, signe et envoie la transaction vers `eth_address`.

---

## Dashboard Admin — Layout & Navigation

### Fichier source
`frontend/src/pages/admin/AdminLayout.jsx`

### URL de base
`/mario-dashboard` (à adapter selon votre projet)

### Structure HTML
```
.admin-layout
├── .admin-sidebar (aside)
│   ├── .admin-sidebar-logo (logo + "Admin Dashboard")
│   ├── nav.admin-nav
│   │   ├── .admin-nav-section (séparateurs)
│   │   └── NavLink.admin-nav-link (avec .active si sélectionné)
│   └── .admin-sidebar-footer (bouton Logout)
└── .admin-main
    ├── header.admin-header
    │   ├── Burger button (mobile)
    │   └── .admin-user-chip (avatar initiale + username)
    └── .admin-content
        └── <Outlet />
```

**Overlay mobile** : `.admin-sidebar-overlay` (div cliquable pour fermer le sidebar sur mobile).

### Navigation complète
```
── Overview ──────────────────────────────
Dashboard         /mario-dashboard         (end=true)

── Commerce ──────────────────────────────
Orders            /mario-dashboard/orders
Products          /mario-dashboard/products
Categories        /mario-dashboard/categories
Brands            /mario-dashboard/brands

── Users & Finance ───────────────────────
Users             /mario-dashboard/users
Deposits          /mario-dashboard/deposits
Transactions      /mario-dashboard/transactions

── Support ───────────────────────────────
Support Tickets   /mario-dashboard/support
Reviews           /mario-dashboard/reviews

── Content ───────────────────────────────
News              /mario-dashboard/news
FAQ               /mario-dashboard/faq
Giveaways         /mario-dashboard/giveaways

── System ────────────────────────────────
Analytics         /mario-dashboard/analytics
System Status     /mario-dashboard/system-status
Settings          /mario-dashboard/settings
```

### Icônes
Toutes les icônes sont des SVG inline (pas de lib externe) :
- Dashboard : 4 rectangles (grille)
- Orders : clipboard
- Products : sac shopping
- Categories : tag
- Brands : bookmark
- Users : silhouette groupe
- Deposits : carte bancaire
- Transactions : symbole dollar
- Support : bulle chat
- Reviews : étoile
- News : document
- FAQ : cercle point d'interrogation
- Giveaways : cadeau
- Analytics : graphe montant
- System Status : cercles concentriques (onde)
- Settings : engrenage
- Logout : porte de sortie

### Récupération du nom admin
Décodage du JWT en localStorage (without lib) :
```js
const payload = token.split('.')[1];
JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
// → { sub, role, username }
```

### Middleware de protection
```js
// backend/src/middlewares/auth.js
requireAuth  → vérifie Bearer token JWT
requireAdmin → vérifie role === 'admin' (ou 'moderator' selon les besoins)
```

### adminFetch helper
```js
// frontend/src/pages/admin/utils/api.js
async function adminFetch(endpoint, options = {}) {
  // Injecte automatiquement Authorization: Bearer <token>
  // Unwrap { success, data } envelope
  // Lance Error si success=false
}
```

---

## Variables d'Environnement

```env
# Core
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
FRONTEND_URL=http://localhost:3000

# Auth
JWT_SECRET=change_me_jwt_secret
JWT_REFRESH_SECRET=change_me_refresh_secret

# Upload / CDN
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880          # 5MB
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CDN_BASE_URL=https://your-cdn.com

# Public URL (pour les webhooks entrants BlockCypher)
RAILWAY_PUBLIC_URL=https://your-backend-domain.com

# Crypto — BlockCypher (BTC/LTC/DOGE auto-forward)
BLOCKCYPHER_TOKEN=your_token

# Crypto — Alchemy (ETH webhooks)
ALCHEMY_API_KEY=
ALCHEMY_SIGNING_KEY=            # pour vérifier les webhooks Alchemy
ALCHEMY_AUTH_TOKEN=             # pour enregistrer des adresses dans le webhook
ALCHEMY_WEBHOOK_ID=

# Crypto — ETH HD Wallet (génère une adresse unique par dépôt)
ETH_HD_SEED=your 12 word seed phrase here

# Note : les adresses BTC/LTC/DOGE/XMR/ETH destination sont dans Admin → Settings → Crypto
```

---

## Endpoints API Complets

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Wallet (authentifié)
```
GET  /api/wallet                    → balance + tier info
GET  /api/wallet/balance
GET  /api/wallet/deposits           → liste dépôts user
GET  /api/wallet/deposits/:id
POST /api/wallet/deposit            → { currency }
GET  /api/wallet/transactions
```

### Commandes (authentifié)
```
GET  /api/orders
POST /api/orders                    → { items, shippingAddress, paymentMethod, name, email }
GET  /api/orders/:id
```

### Profil (authentifié)
```
GET  /api/profile
PUT  /api/profile
```

### Admin (requireAuth + requireAdmin)
```
// Dashboard
GET  /api/admin/dashboard

// Users
GET  /api/admin/users?page&limit&search&tier&role&isActive&sortBy&sortOrder
POST /api/admin/users              → { username, password, role }
GET  /api/admin/users/:id
PUT  /api/admin/users/:id          → { username, role, isActive, markupPct }
PATCH /api/admin/users/:id/ban
PATCH /api/admin/users/:id/password → { password }
POST /api/admin/users/:id/wallet/adjust → { type, amount, reason }

// Deposits
GET  /api/admin/deposits?page&limit&status&currency
PATCH /api/admin/deposits/:id/confirm → { usdAmount, note? }
PATCH /api/admin/deposits/:id/expire

// Transactions
GET  /api/admin/transactions?page&limit&search&type&status&currency&dateFrom&dateTo

// Orders
GET  /api/admin/orders?page&limit&search&status&paymentMethod
PATCH /api/admin/orders/:id/status   → { status }
PATCH /api/admin/orders/:id/tracking → { trackingNumber, carrier }

// Analytics
GET  /api/admin/analytics?period=7d|30d|90d|1y

// Settings
GET  /api/admin/settings
PUT  /api/admin/settings            → { key: value, ... }

// ETH Sweep
POST /api/admin/eth/sweep

// System Status
GET  /api/admin/system-status
PUT  /api/admin/system-status/:id

// Webhooks (depuis BlockCypher/Alchemy)
POST /api/webhooks/blockcypher
POST /api/webhooks/alchemy
```

---

## Schéma de Base de Données (Entités Clés)

### User
```prisma
model User {
  id                Int       @id @default(autoincrement())
  username          String    @unique
  passwordHash      String
  role              String    @default("customer")  // customer | moderator | admin
  isActive          Boolean   @default(true)
  balance           Decimal   @default(0)           // solde USD
  points            Int       @default(0)           // points de fidélité
  totalSpent        Decimal   @default(0)           // total dépensé (pour calcul tier)
  markupPct         Decimal   @default(0)           // majoration prix affichés
  bio               String?
  telegramHandle    String?
  signalDetails     String?
  sessionDetails    String?
  btcRefundAddress  String?
  xmrRefundAddress  String?
  hidePrices        Boolean   @default(false)
  notifOrders       Boolean   @default(true)
  notifDeposits     Boolean   @default(true)
  notifTickets      Boolean   @default(true)
  notifNewProducts  Boolean   @default(true)
  notifLogins       Boolean   @default(true)
  tourCompleted     Boolean   @default(false)
  avatarUrl         String?
  lastLoginAt       DateTime?
  createdAt         DateTime  @default(now())
  orders            Order[]
  transactions      Transaction[]
  deposits          Deposit[]
  supportTickets    SupportTicket[]
  apiKeys           ApiKey[]
  notifications     Notification[]
}
```

### Deposit
```prisma
model Deposit {
  id             Int       @id @default(autoincrement())
  userId         Int
  user           User      @relation(fields: [userId], references: [id])
  currency       String    // BTC | LTC | DOGE | ETH | XMR
  address        String
  status         String    @default("awaiting")  // awaiting | partial | confirmed | expired
  amountExpected Decimal?
  amountReceived Decimal   @default(0)
  usdCredited    Decimal   @default(0)
  expiresAt      DateTime
  confirmedAt    DateTime?
  hookId         String?   // BlockCypher forwarding ID
  ethIndex       Int?      // HD wallet index pour ETH
  transactionId  Int?      // FK → Transaction
  transaction    Transaction? @relation(...)
  createdAt      DateTime  @default(now())
}
```

### Transaction
```prisma
model Transaction {
  id         Int      @id @default(autoincrement())
  frontendId String
  userId     Int
  user       User     @relation(...)
  type       String   // deposit | purchase | refund | adjustment | bonus
  amount     Decimal  // positif = crédit, négatif = débit
  currency   String   @default("USD")
  status     String   @default("confirmed")  // pending | confirmed | failed
  note       String?
  txHash     String?  // hash blockchain
  orderId    Int?
  depositId  Int?
  createdAt  DateTime @default(now())
}
```

### SiteSetting
```prisma
model SiteSetting {
  key   String @id
  value String
}
// Clés utilisées : site_name, maintenance_mode, registration_open,
// shipping_cost, shipping_free_threshold, shipping_deadline_h, shipping_deadline_m,
// points_rate, deposit_expiry_hours, min_deposit, max_deposit,
// btc_address, ltc_address, doge_address, eth_address, xmr_address
```

### ApiKey
```prisma
model ApiKey {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(...)
  keyPrefix String   // premiers chars de la clé (affichage)
  keyHash   String   // hash de la clé complète
  label     String?
  isActive  Boolean  @default(true)
  lastUsed  DateTime?
  createdAt DateTime @default(now())
}
```

---

## Dépendances npm Clés

### Frontend
```json
{
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "recharts": "^2.x",
  "qrcode.react": "^3.x"
}
```

### Backend
```json
{
  "express": "^4.x",
  "express-async-errors": "^3.x",
  "@prisma/client": "^5.x",
  "prisma": "^5.x",
  "jsonwebtoken": "^9.x",
  "bcrypt": "^5.x",
  "axios": "^1.x",
  "ethers": "^6.x",
  "dotenv": "^16.x",
  "multer": "^1.x"
}
```

---

## Notes importantes pour la reproduction

### Pattern de réponse API uniforme
Tous les endpoints retournent exactement :
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "message" }
```
Le helper frontend `api.js` unwrap automatiquement `data` et throw si `success=false`.

### StatusBadge — composant réutilisable
`frontend/src/components/admin/StatusBadge.jsx` gère les couleurs pour :
- Statuts commandes : processing (bleu), shipped (violet), delivered (vert), cancelled (rouge)
- Statuts dépôts : awaiting (orange), confirmed (vert), expired (gris), partial (jaune)
- Tiers user : basic (gris), preferred (bleu), gold (orange), platinum (violet)
- Rôles : customer, moderator, admin
- Types de transaction : deposit, purchase, refund, adjustment, bonus

### Skeleton loading
Pattern utilisé partout en admin : pendant le chargement, les cellules affichent `<span class="admin-skel">` (CSS animation pulse grise). Classe : `admin-skel` à définir en CSS.

### Pagination
Composant `Pagination.jsx` réutilisable : reçoit `page`, `totalPages`, `onChange`.  
Backend : `parsePaginationParams(req.query)` + `buildPagination(page, limit, total)`.

### Admin CSS
Tout le CSS admin est dans `admin.css` importé dans `AdminLayout.jsx`.  
Classes principales :
```
.admin-layout, .admin-sidebar, .admin-main, .admin-content, .admin-header
.admin-nav, .admin-nav-link, .admin-nav-link.active, .admin-nav-section
.admin-page-header, .admin-page-title, .admin-page-subtitle
.admin-stat-grid, .admin-stat-card
.admin-chart-wrap, .admin-chart-title
.admin-card, .admin-card-title
.admin-table-wrap, .admin-table, .admin-table-empty
.admin-filters, .admin-filter-select, .admin-filter-input
.admin-tabs, .admin-tab, .admin-tab.active
.admin-modal-overlay, .admin-modal, .admin-modal-title, .admin-modal-actions
.admin-btn, .admin-btn-primary, .admin-btn-secondary, .admin-btn-success, .admin-btn-danger, .admin-btn-sm
.admin-input, .admin-select, .admin-label, .admin-form-group
.admin-avatar (cercle avec initiale), .admin-badge
.admin-info-list, .admin-info-row, .admin-info-label, .admin-info-value
.admin-skel (animation skeleton)
```
