import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BASE = 'https://bestofthebay.net/wp-content/uploads';

function img(path, name) {
  return {
    url:       `${BASE}/${path}/${name}.jpg`,
    thumbnail: `${BASE}/${path}/${name}-300x300.jpg`,
  };
}

// ─── Tous les produits (source: src/data/products.js) ────────────────────────
const PRODUCTS = [
  /* ── Flower · Indoors (indo) ─────────────────────────────────────────────── */
  { slug: 'black-amber',             name: 'Black Amber',                    price: 750,  category: 'indo',        images: [img('2026/06','black-1'), img('2026/06','black2-1'), img('2026/06','black3-1')],                description: 'https://t.me/NewSI420bot' },
  { slug: 'black-amber-smalls',      name: 'Black Amber Smalls',             price: 550,  category: 'indo',        images: [img('2026/06','black-smalls'), img('2026/06','black-smalls2')],                              description: 'https://t.me/NewSI420bot?start=p_5J1CKeIIh0XgsXHBw58zfR' },
  { slug: 'blackberry-runtz',        name: 'Blackberry Runtz',               price: 1025, category: 'indo',        images: [img('2026/06','blackberry'), img('2026/06','blackberry2'), img('2026/06','blackberry3')],      description: 'https://t.me/NewSI420bot' },
  { slug: 'blue-gumbo',              name: 'Blue Gumbo',                     price: 775,  category: 'indo',        images: [img('2026/06','blue-gumbo'), img('2026/06','blue-gumbo2'), img('2026/06','blue-gumbo3')],      description: 'https://t.me/NewSI420bot' },
  { slug: 'blue-tommyz',             name: 'Blue Tommyz',                    price: 850,  category: 'indo',        images: [img('2026/06','blue-tommyz'), img('2026/06','blue-tommyz2')],                                 description: 'https://t.me/NewSI420bot' },
  { slug: 'blue-yakuza',             name: 'Blue Yakuza',                    price: 900,  category: 'indo',        images: [img('2026/06','blue-yakuza'), img('2026/06','blue-yakuza2')],                                 description: 'https://t.me/NewSI420bot' },
  { slug: 'blueberry-glitterbomb',   name: 'Blueberry Glitterbomb',          price: 875,  category: 'indo',        images: [img('2026/06','blueberry-glitter'), img('2026/06','blueberry-glitter2')],                    description: 'https://t.me/NewSI420bot' },
  { slug: 'blueberry-lemon-drop',    name: 'Blueberry Lemon Drop',           price: 825,  category: 'indo',        images: [img('2026/06','blueberry-lemon'), img('2026/06','blueberry-lemon2')],                        description: 'https://t.me/NewSI420bot' },
  { slug: 'blueberry-runtz',         name: 'Blueberry Runtz',                price: 950,  category: 'indo',        images: [img('2026/06','blueberry-runtz'), img('2026/06','blueberry-runtz2')],                        description: 'https://t.me/NewSI420bot' },
  { slug: 'cadillac-runtz',          name: 'Cadillac Runtz',                 price: 1050, category: 'indo',        images: [img('2026/06','cadillac'), img('2026/06','cadillac2')],                                      description: 'https://t.me/NewSI420bot' },
  { slug: 'cherry-z',                name: 'Cherry Z',                       price: 800,  category: 'indo',        images: [img('2026/06','cherry-z'), img('2026/06','cherry-z2')],                                      description: 'https://t.me/NewSI420bot' },
  { slug: 'curelato',                name: 'Curelato',                       price: 850,  category: 'indo',        images: [img('2026/06','curelato'), img('2026/06','curelato2')],                                      description: 'https://t.me/NewSI420bot' },
  { slug: 'frozen-trufflez',         name: 'Frozen Trufflez',                price: 900,  category: 'indo',        images: [img('2026/06','frozen-trufflez'), img('2026/06','frozen-trufflez2')],                        description: 'https://t.me/NewSI420bot' },
  { slug: 'giraffe-puzzy',           name: 'Giraffe Puzzy',                  price: 775,  category: 'indo',        images: [img('2026/06','giraffe'), img('2026/06','giraffe2')],                                        description: 'https://t.me/NewSI420bot' },
  { slug: 'gumbo',                   name: 'Gumbo',                          price: 850,  category: 'indo',        images: [img('2026/06','gumbo'), img('2026/06','gumbo2')],                                            description: 'https://t.me/NewSI420bot' },
  { slug: 'himalayan-cherries',      name: 'Himalayan Cherries',             price: 925,  category: 'indo',        images: [img('2026/06','himalayan'), img('2026/06','himalayan2')],                                    description: 'https://t.me/NewSI420bot' },
  { slug: 'hood-candy',              name: 'Hood Candy',                     price: 750,  category: 'indo',        images: [img('2026/06','hood-candy'), img('2026/06','hood-candy2')],                                  description: 'https://t.me/NewSI420bot' },
  { slug: 'lemon-berry-runtz',       name: 'Lemon Berry Runtz',              price: 875,  category: 'indo',        images: [img('2026/06','lemon-berry'), img('2026/06','lemon-berry2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: 'mango-mintality',         name: 'Mango Mintality',                price: 825,  category: 'indo',        images: [img('2026/06','mango-mint'), img('2026/06','mango-mint2')],                                  description: 'https://t.me/NewSI420bot' },
  { slug: 'ny-cheesecake',           name: 'NY Cheesecake',                  price: 900,  category: 'indo',        images: [img('2026/06','ny-cheese'), img('2026/06','ny-cheese2')],                                    description: 'https://t.me/NewSI420bot' },
  { slug: 'peaches-n-cream',         name: "Peaches N' Cream",               price: 850,  category: 'indo',        images: [img('2026/06','peaches'), img('2026/06','peaches2')],                                        description: 'https://t.me/NewSI420bot' },
  { slug: 'pineapple-gas',           name: 'Pineapple Gas',                  price: 775,  category: 'indo',        images: [img('2026/06','pineapple'), img('2026/06','pineapple2')],                                    description: 'https://t.me/NewSI420bot' },
  { slug: 'pink-candy',              name: 'Pink Candy',                     price: 800,  category: 'indo',        images: [img('2026/06','pink-candy'), img('2026/06','pink-candy2')],                                  description: 'https://t.me/NewSI420bot' },
  { slug: 'purple-candy-meds',       name: 'Purple Candy Meds',              price: 750,  category: 'indo',        images: [img('2026/06','purple-candy'), img('2026/06','purple-candy2')],                              description: 'https://t.me/NewSI420bot' },
  { slug: 'purple-cream',            name: 'Purple Cream',                   price: 825,  category: 'indo',        images: [img('2026/06','purple-cream'), img('2026/06','purple-cream2')],                              description: 'https://t.me/NewSI420bot' },
  { slug: 'purple-pb-runtz',         name: 'Purple PB Runtz',                price: 900,  category: 'indo',        images: [img('2026/06','purple-pb'), img('2026/06','purple-pb2')],                                    description: 'https://t.me/NewSI420bot' },
  { slug: 'purple-zookies',          name: 'Purple Zookies',                 price: 775,  category: 'indo',        images: [img('2026/06','purple-3'), img('2026/06','purple2-3'), img('2026/06','purple3-2')],           description: 'https://t.me/NewSI420bot?start=p_3GIfvNCPgN6H4t0Gkx3Voa' },
  { slug: 'red-pillz',               name: 'Red Pillz',                      price: 850,  category: 'indo',        images: [img('2026/06','red-pillz'), img('2026/06','red-pillz2')],                                    description: 'https://t.me/NewSI420bot' },
  { slug: 'runtz-n-cream',           name: "Runtz N' Cream",                 price: 875,  category: 'indo',        images: [img('2026/06','runtz-cream'), img('2026/06','runtz-cream2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: 'runtzlato',               name: 'Runtzlato',                      price: 925,  category: 'indo',        images: [img('2026/06','runtzlato'), img('2026/06','runtzlato2')],                                    description: 'https://t.me/NewSI420bot' },
  { slug: 'slush-mints',             name: 'Slush Mints',                    price: 800,  category: 'indo',        images: [img('2026/06','slush'), img('2026/06','slush2')],                                            description: 'https://t.me/NewSI420bot' },
  { slug: 'strawberries-n-cream',    name: "Strawberries N' Cream",          price: 850,  category: 'indo',        images: [img('2026/06','strawberries'), img('2026/06','strawberries2')],                              description: 'https://t.me/NewSI420bot' },
  { slug: 'super-cherry-runtz',      name: 'Super Cherry Runtz',             price: 950,  category: 'indo',        images: [img('2026/06','super-cherry'), img('2026/06','super-cherry2')],                              description: 'https://t.me/NewSI420bot' },
  { slug: 'super-lemon-haze',        name: 'Super Lemon Haze',               price: 825,  category: 'indo',        images: [img('2026/06','super-lemon'), img('2026/06','super-lemon2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: 'sweetz-sushi-bar-prepackaged-exotic-flower', name: 'Sweetz Sushi Bar (Exotic)', price: 1100, category: 'indo', images: [img('2026/06','sushi'), img('2026/06','sushi2')],                                   description: 'https://t.me/NewSI420bot' },
  { slug: 'voodoo-cake',             name: 'Voodoo Cake',                    price: 850,  category: 'indo',        images: [img('2026/06','voodoo'), img('2026/06','voodoo2')],                                          description: 'https://t.me/NewSI420bot' },
  { slug: 'white-runtz',             name: 'White Runtz',                    price: 875,  category: 'indo',        images: [img('2026/06','white-runtz'), img('2026/06','white-runtz2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: 'white-truffle',           name: 'White Truffle',                  price: 575,  category: 'indo',        images: [img('2026/06','white-3'), img('2026/06','white2-3'), img('2026/06','white3-2')],              description: 'https://t.me/NewSI420bot?start=p_2pp4xasmNgkTp3Dfv3IIyk' },
  { slug: 'world-war-runtz',         name: 'World War Runtz',                price: 950,  category: 'indo',        images: [img('2026/06','world-war'), img('2026/06','world-war2')],                                    description: 'https://t.me/NewSI420bot' },
  { slug: 'zombie-cake',             name: 'Zombie Cake',                    price: 825,  category: 'indo',        images: [img('2026/06','zombie'), img('2026/06','zombie2')],                                          description: 'https://t.me/NewSI420bot' },

  /* ── Flower · Light Deps (deps) ──────────────────────────────────────────── */
  { slug: 'blue-candy-smalls',       name: 'Blue Candy Smalls',              price: 475,  category: 'deps',        images: [img('2026/06','blue-smalls'), img('2026/06','blue-smalls2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: 'guava-gas-smalls',        name: 'Guava Gas Smalls',               price: 425,  category: 'deps',        images: [img('2026/06','guava-smalls'), img('2026/06','guava-smalls2')],                              description: 'https://t.me/NewSI420bot' },
  { slug: 'mango-mintality-smalls',  name: 'Mango Mintality Smalls',         price: 450,  category: 'deps',        images: [img('2026/06','mango-mint-smalls'), img('2026/06','mango-mint-smalls2')],                   description: 'https://t.me/NewSI420bot' },
  { slug: 'mango-runtz-smalls',      name: 'Mango Runtz Smalls',             price: 450,  category: 'deps',        images: [img('2026/06','mango-smalls'), img('2026/06','mango-smalls2')],                              description: 'https://t.me/NewSI420bot' },
  { slug: 'purple-candy-runtz-smalls', name: 'Purple Candy Runtz Smalls',    price: 425,  category: 'deps',        images: [img('2026/06','purple-smalls'), img('2026/06','purple-smalls2')],                           description: 'https://t.me/NewSI420bot' },
  { slug: 'purple-punch-smalls',     name: 'Purple Punch Smalls',            price: 400,  category: 'deps',        images: [img('2026/06','purple-punch'), img('2026/06','purple-punch2')],                             description: 'https://t.me/NewSI420bot' },
  { slug: 'strawberry-mediums',      name: 'Strawberry Mediums',             price: 500,  category: 'deps',        images: [img('2026/06','strawberry-med'), img('2026/06','strawberry-med2')],                         description: 'https://t.me/NewSI420bot' },
  { slug: 'sugar-tart-mediums',      name: 'Sugar Tart Mediums',             price: 475,  category: 'deps',        images: [img('2026/06','sugar-tart'), img('2026/06','sugar-tart2')],                                  description: 'https://t.me/NewSI420bot' },
  { slug: 'white-truffle-smalls',    name: 'White Truffle Smalls',           price: 400,  category: 'deps',        images: [img('2026/06','white-smalls'), img('2026/06','white-smalls2')],                             description: 'https://t.me/NewSI420bot' },
  { slug: 'wild-cherry-glitterbomb-smalls', name: 'Wild Cherry Glitterbomb Smalls', price: 425, category: 'deps', images: [img('2026/06','wild-cherry-smalls'), img('2026/06','wild-cherry-smalls2')],                 description: 'https://t.me/NewSI420bot' },

  /* ── Flower · AAA Mixed Lights (mix) ─────────────────────────────────────── */
  { slug: 'animal-mints',            name: 'Animal Mints',                   price: 650,  category: 'mix',         images: [img('2026/06','animal'), img('2026/06','animal2'), img('2026/06','animal3')],                description: 'https://t.me/NewSI420bot?start=p_78r2reWDwyvw4hiD6Qrv8Q' },
  { slug: 'cherry-zoda',             name: 'Cherry Zoda',                    price: 785,  category: 'mix',         images: [img('2026/06','cherry-zoda'), img('2026/06','cherry-zoda2'), img('2026/06','cherry-zoda3')], description: 'https://t.me/NewSI420bot?start=p_149J4pAPT4yDZIk5Kx5dqD' },
  { slug: 'frozen-gushers',          name: 'Frozen Gushers',                 price: 675,  category: 'mix',         images: [img('2026/06','frozen'), img('2026/06','frozen2'), img('2026/06','frozen3')],               description: 'https://t.me/NewSI420bot?start=p_6uFcZ1CTDiL7SniVQstpTl' },
  { slug: 'guava-cookies',           name: 'Guava Cookies',                  price: 650,  category: 'mix',         images: [img('2026/06','guava'), img('2026/06','guava2'), img('2026/06','guava3')],                   description: 'https://t.me/NewSI420bot?start=p_6c4LYOatbAjwTI9Sz5WrLh' },
  { slug: 'guava-gas',               name: 'Guava Gas',                      price: 575,  category: 'mix',         images: [img('2026/06','guava-1'), img('2026/06','guava2-1'), img('2026/06','guava3-1')],            description: 'https://t.me/NewSI420bot?start=p_4PykarM0dhwylvvKJl9jiM' },
  { slug: 'mango-runtz',             name: 'Mango Runtz',                    price: 675,  category: 'mix',         images: [img('2026/05','mango-'), img('2026/05','mango2'), img('2026/05','mango3')],                  description: 'https://t.me/NewSI420bot?start=p_7VNufr8S8TEGNPJjDi0pLn' },
  { slug: 'mango-runtz-2',           name: 'Mango Runtz 2',                  price: 700,  category: 'mix',         images: [img('2026/05','mango-2'), img('2026/05','mango2-2')],                                       description: 'https://t.me/NewSI420bot' },
  { slug: 'wild-cherry-glitterbomb', name: 'Wild Cherry Glitterbomb',        price: 750,  category: 'mix',         images: [img('2026/06','wild-cherry'), img('2026/06','wild-cherry2')],                               description: 'https://t.me/NewSI420bot' },

  /* ── Flower · Exotics (exo) ──────────────────────────────────────────────── */
  { slug: 'grape-runtz',             name: 'Grape Runtz',                    price: 1200, category: 'exo',         images: [img('2026/06','grape'), img('2026/06','grape2')],                                           description: 'https://t.me/NewSI420bot' },
  { slug: 'sweetz-pixie-stix',       name: 'Sweetz Pixie Stix',              price: 1150, category: 'exo',         images: [img('2026/06','pixie'), img('2026/06','pixie2')],                                           description: 'https://t.me/NewSI420bot' },

  /* ── Concentrates · In-House (inhouse) ───────────────────────────────────── */
  { slug: 'bubble-hash',             name: 'Bubble Hash',                    price: 450,  category: 'inhouse',     images: [img('2026/04','bubble-hash'), img('2026/04','bubble-hash2')],                               description: 'https://t.me/NewSI420bot' },
  { slug: 'in-house-badder-b-tier',  name: 'In-House Badder (B-Tier)',       price: 350,  category: 'inhouse',     images: [img('2026/04','badder'), img('2026/04','badder2')],                                         description: 'https://t.me/NewSI420bot' },
  { slug: 'in-house-crumble-a-tier', name: 'In-House Crumble (A-Tier)',      price: 400,  category: 'inhouse',     images: [img('2026/04','crumble'), img('2026/04','crumble2')],                                       description: 'https://t.me/NewSI420bot' },
  { slug: 'mousse-hash',             name: 'Mousse Hash',                    price: 475,  category: 'inhouse',     images: [img('2026/04','mousse'), img('2026/04','mousse2')],                                         description: 'https://t.me/NewSI420bot' },

  /* ── Concentrates · Authentic (authenconc) ───────────────────────────────── */
  { slug: 'caviar-candy',            name: 'Caviar Candy',                   price: 600,  category: 'authenconc',  images: [img('2026/04','caviar'), img('2026/04','caviar2')],                                         description: 'https://t.me/NewSI420bot' },
  { slug: 'diamonds-in-sauce-b-tier', name: 'Diamonds in Sauce (B-Tier)',    price: 550,  category: 'authenconc',  images: [img('2026/04','diamonds'), img('2026/04','diamonds2')],                                     description: 'https://t.me/NewSI420bot' },
  { slug: 'shatter-b-tier',          name: 'Shatter (B-Tier)',               price: 300,  category: 'authenconc',  images: [img('2026/04','shatter'), img('2026/04','shatter2')],                                       description: 'https://t.me/NewSI420bot' },

  /* ── Disposables · Authentic (authendispos) ──────────────────────────────── */
  { slug: '2g-boutiq-switch-gum',    name: '2G Boutiq Switch Gum',           price: 1350, category: 'authendispos', images: [img('2026/03','boutiq-gum'), img('2026/03','boutiq-gum2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: '2g-boutiq-v5-switch-orb', name: '2G Boutiq V5 Switch ORB',        price: 1500, category: 'authendispos', images: [img('2026/03','Boutiq-V5-ORB-Edition4'), img('2026/03','Boutiq-V5-ORB-Edition4-2')],       description: 'https://t.me/NewSI420bot' },
  { slug: '2g-clean-carts',          name: '2G Clean Carts',                 price: 1400, category: 'authendispos', images: [img('2026/05','clean'), img('2026/05','clean2')],                                          description: 'https://t.me/NewSI420bot' },
  { slug: '2g-smoothie-blend-3-0-exotic-ed', name: '2G Smoothie Blend 3.0 Exotic Ed.', price: 1450, category: 'authendispos', images: [img('2026/05','smoothie'), img('2026/05','smoothie2')],                       description: 'https://t.me/NewSI420bot' },
  { slug: '2g-whole-melts-dual-chamber', name: '2G Whole Melts Dual Chamber', price: 1600, category: 'authendispos', images: [img('2026/05','whole-melts'), img('2026/05','whole-melts2')],                           description: 'https://t.me/NewSI420bot' },
  { slug: '3g-space-club',           name: '3G Space Club',                  price: 1100, category: 'authendispos', images: [img('2026/04','3g-space'), img('2026/04','3g-space2')],                                   description: 'https://t.me/NewSI420bot' },
  { slug: 'sherbinski-2g-quattro-live-resin', name: 'Sherbinski 2G Quattro Live Resin', price: 1800, category: 'authendispos', images: [img('2026/05','sherbinski'), img('2026/05','sherbinski2')],                  description: 'https://t.me/NewSI420bot' },
  { slug: 'toad-venom',              name: 'Toad Venom',                     price: 1300, category: 'authendispos', images: [img('2026/05','toad'), img('2026/05','toad2')],                                           description: 'https://t.me/NewSI420bot' },

  /* ── Edibles (edibles) ───────────────────────────────────────────────────── */
  { slug: '3000mg-cube-edibles',     name: '3000MG Cube Edibles',            price: 650,  category: 'edibles',     images: [img('2026/04','cube'), img('2026/04','cube2')],                                             description: 'https://t.me/NewSI420bot' },
  { slug: 'papaya-tarts',            name: 'Papaya Tarts',                   price: 600,  category: 'edibles',     images: [img('2026/04','papaya'), img('2026/04','papaya2')],                                         description: 'https://t.me/NewSI420bot' },
  { slug: 'cherry-fundip',           name: 'Cherry Fundip',                  price: 550,  category: 'edibles',     images: [img('2026/04','cherry-fundip'), img('2026/04','cherry-fundip2')],                          description: 'https://t.me/NewSI420bot' },
];

async function main() {
  console.log('🌱 Seeding BOTB database...\n');

  // ─── Settings par défaut ──────────────────────────────────────────────────
  const defaultSettings = [
    { key: 'site_name',               value: 'BOTB' },
    { key: 'maintenance_mode',        value: 'false' },
    { key: 'registration_open',       value: 'true' },
    { key: 'shipping_cost',           value: '0' },
    { key: 'shipping_free_threshold', value: '0' },
    { key: 'shipping_deadline_h',     value: '16' },
    { key: 'shipping_deadline_m',     value: '0' },
    { key: 'points_rate',             value: '0.5' },
    { key: 'deposit_expiry_hours',    value: '12' },
    { key: 'min_deposit',             value: '20' },
    { key: 'max_deposit',             value: '10000' },
    { key: 'btc_address',             value: '' },
    { key: 'ltc_address',             value: '' },
    { key: 'doge_address',            value: '' },
    { key: 'eth_address',             value: '' },
    { key: 'xmr_address',             value: '' },
  ];

  for (const s of defaultSettings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log('✅ Settings initialisés');

  // ─── Compte admin ─────────────────────────────────────────────────────────
  const ADMIN_USERNAME = 'duc237';
  const ADMIN_PASSWORD = 'admin@1234';
  const passwordHash   = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.user.upsert({
    where:  { username: ADMIN_USERNAME },
    update: { passwordHash, role: 'admin', isActive: true },
    create: { username: ADMIN_USERNAME, passwordHash, role: 'admin' },
  });
  console.log(`✅ Admin créé — login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);

  // ─── Catégories (arbre exact du frontend) ────────────────────────────────
  const rootCats = [
    { name: 'Flower',       slug: 'flower'  },
    { name: 'Concentrates', slug: 'conc'    },
    { name: 'Dispos',       slug: 'dispos'  },
    { name: 'Edibles',      slug: 'edibles' },
  ];

  for (const cat of rootCats) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: { name: cat.name }, create: cat });
  }

  const flower = await prisma.category.findUnique({ where: { slug: 'flower' } });
  const conc   = await prisma.category.findUnique({ where: { slug: 'conc'   } });
  const dispos = await prisma.category.findUnique({ where: { slug: 'dispos' } });

  const subCats = [
    { name: 'Exotics',                slug: 'exo',         parentId: flower.id },
    { name: 'Indoors',                slug: 'indo',        parentId: flower.id },
    { name: 'AAA Mixed Lights',       slug: 'mix',         parentId: flower.id },
    { name: 'Light Deps',             slug: 'deps',        parentId: flower.id },
    { name: 'In-House',               slug: 'inhouse',     parentId: conc.id   },
    { name: 'Authentic Concentrates', slug: 'authenconc',  parentId: conc.id   },
    { name: 'Authentic Disposables',  slug: 'authendispos', parentId: dispos.id },
    { name: 'Replica Disposables',    slug: 'reps',         parentId: dispos.id },
  ];

  for (const sc of subCats) {
    await prisma.category.upsert({
      where:  { slug: sc.slug },
      update: { name: sc.name, parentId: sc.parentId },
      create: sc,
    });
  }
  console.log('✅ Catégories créées (arbre complet)');

  // ─── Produits (78 produits identiques au frontend) ────────────────────────
  let created = 0;
  let updated = 0;

  for (const p of PRODUCTS) {
    const cat = await prisma.category.findUnique({ where: { slug: p.category } });
    if (!cat) {
      console.warn(`  ⚠️  Catégorie inconnue: ${p.category} pour ${p.slug}`);
      continue;
    }

    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });

    if (existing) {
      // Met à jour le prix, nom, description et catégorie
      await prisma.product.update({
        where: { slug: p.slug },
        data: {
          name:        p.name,
          price:       p.price,
          description: p.description,
          categoryId:  cat.id,
          isActive:    true,
        },
      });
      updated++;
    } else {
      // Crée le produit avec ses images
      await prisma.product.create({
        data: {
          name:        p.name,
          slug:        p.slug,
          price:       p.price,
          description: p.description,
          categoryId:  cat.id,
          stock:       99,   // toujours en stock par défaut
          isActive:    true,
          images: {
            create: p.images.map((img, i) => ({
              url:       img.url,
              thumbnail: img.thumbnail,
              position:  i,
            })),
          },
        },
      });
      created++;
    }
  }

  console.log(`✅ Produits: ${created} créés, ${updated} mis à jour (total: ${PRODUCTS.length})`);

  // ─── Résumé ───────────────────────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.user.count(),
  ]);

  console.log('\n🎉 Seed terminé avec succès !');
  console.log('─────────────────────────────────────────');
  console.log(`   Admin:      ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  console.log(`   Produits:   ${counts[0]} en base`);
  console.log(`   Catégories: ${counts[1]} en base`);
  console.log(`   Users:      ${counts[2]} en base`);
  console.log('─────────────────────────────────────────');
  console.log('   Lancez le serveur: npm run dev');
}

main()
  .catch((err) => { console.error('\n❌ Seed échoué:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
