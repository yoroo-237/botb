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
  { slug: 'black-amber-smalls',      name: 'Black Amber Smalls',             price: 550,  category: 'indo',        images: [img('2026/06','black-smalls'), img('2026/06','black-smalls2')],                              description: 'https://t.me/NewSI420bot?start=p_5J1CKeIIh0XgsXHBw58zfR' },
  { slug: 'blue-gumbo',              name: 'Blue Gumbo',                     price: 775,  category: 'indo',        images: [img('2026/06','blue-gumbo'), img('2026/06','blue-gumbo2'), img('2026/06','blue-gumbo3')],      description: 'https://t.me/NewSI420bot' },
  { slug: 'blue-tommyz',             name: 'Blue Tommyz',                    price: 850,  category: 'indo',        images: [img('2026/06','blue-tommyz'), img('2026/06','blue-tommyz2')],                                 description: 'https://t.me/NewSI420bot' },
  { slug: 'blueberry-glitterbomb',   name: 'Blueberry Glitterbomb',          price: 875,  category: 'indo',        images: [img('2026/06','blueberry-glitter'), img('2026/06','blueberry-glitter2')],                    description: 'https://t.me/NewSI420bot' },
  { slug: 'blueberry-lemon-drop',    name: 'Blueberry Lemon Drop',           price: 825,  category: 'indo',        images: [img('2026/06','blueberry-lemon'), img('2026/06','blueberry-lemon2')],                        description: 'https://t.me/NewSI420bot' },
  { slug: 'blueberry-runtz',         name: 'Blueberry Runtz',                price: 950,  category: 'indo',        images: [img('2026/06','blueberry-runtz'), img('2026/06','blueberry-runtz2')],                        description: 'https://t.me/NewSI420bot' },
  { slug: 'cherry-z',                name: 'Cherry Z',                       price: 800,  category: 'indo',        images: [img('2026/06','cherry-z'), img('2026/06','cherry-z2')],                                      description: 'https://t.me/NewSI420bot' },
  { slug: 'gumbo',                   name: 'Gumbo',                          price: 850,  category: 'indo',        images: [img('2026/06','gumbo'), img('2026/06','gumbo2')],                                            description: 'https://t.me/NewSI420bot' },
  { slug: 'hood-candy',              name: 'Hood Candy',                     price: 750,  category: 'indo',        images: [img('2026/06','hood-candy'), img('2026/06','hood-candy2')],                                  description: 'https://t.me/NewSI420bot' },
  { slug: 'lemon-berry-runtz',       name: 'Lemon Berry Runtz',              price: 875,  category: 'indo',        images: [img('2026/06','lemon-berry'), img('2026/06','lemon-berry2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: 'pink-candy',              name: 'Pink Candy',                     price: 800,  category: 'indo',        images: [img('2026/06','pink-candy'), img('2026/06','pink-candy2')],                                  description: 'https://t.me/NewSI420bot' },
  { slug: 'purple-candy-meds',       name: 'Purple Candy Meds',              price: 750,  category: 'indo',        images: [img('2026/06','purple-candy'), img('2026/06','purple-candy2')],                              description: 'https://t.me/NewSI420bot' },
  { slug: 'strawberries-n-cream',    name: "Strawberries N' Cream",          price: 850,  category: 'indo',        images: [img('2026/06','strawberries'), img('2026/06','strawberries2')],                              description: 'https://t.me/NewSI420bot' },
  { slug: 'super-cherry-runtz',      name: 'Super Cherry Runtz',             price: 950,  category: 'indo',        images: [img('2026/06','super-cherry'), img('2026/06','super-cherry2')],                              description: 'https://t.me/NewSI420bot' },
  { slug: 'super-lemon-haze',        name: 'Super Lemon Haze',               price: 825,  category: 'indo',        images: [img('2026/06','super-lemon'), img('2026/06','super-lemon2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: 'white-runtz',             name: 'White Runtz',                    price: 875,  category: 'indo',        images: [img('2026/06','white-runtz'), img('2026/06','white-runtz2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: 'white-truffle',           name: 'White Truffle',                  price: 575,  category: 'indo',        images: [img('2026/06','white-3'), img('2026/06','white2-3'), img('2026/06','white3-2')],              description: 'https://t.me/NewSI420bot?start=p_2pp4xasmNgkTp3Dfv3IIyk' },

  /* ── Flower · Light Deps (deps) ──────────────────────────────────────────── */
  { slug: 'blue-candy-smalls',       name: 'Blue Candy Smalls',              price: 475,  category: 'deps',        images: [img('2026/06','blue-smalls'), img('2026/06','blue-smalls2')],                                description: 'https://t.me/NewSI420bot' },
  { slug: 'purple-candy-runtz-smalls', name: 'Purple Candy Runtz Smalls',    price: 425,  category: 'deps',        images: [img('2026/06','purple-smalls'), img('2026/06','purple-smalls2')],                           description: 'https://t.me/NewSI420bot' },
  { slug: 'white-truffle-smalls',    name: 'White Truffle Smalls',           price: 400,  category: 'deps',        images: [img('2026/06','white-smalls'), img('2026/06','white-smalls2')],                             description: 'https://t.me/NewSI420bot' },

  /* ── Flower · AAA Mixed Lights (mix) ─────────────────────────────────────── */
  { slug: 'cherry-zoda',             name: 'Cherry Zoda',                    price: 785,  category: 'mix',         images: [img('2026/06','cherry-zoda'), img('2026/06','cherry-zoda2'), img('2026/06','cherry-zoda3')], description: 'https://t.me/NewSI420bot?start=p_149J4pAPT4yDZIk5Kx5dqD' },
  { slug: 'frozen-gushers',          name: 'Frozen Gushers',                 price: 675,  category: 'mix',         images: [img('2026/06','frozen'), img('2026/06','frozen2'), img('2026/06','frozen3')],               description: 'https://t.me/NewSI420bot?start=p_6uFcZ1CTDiL7SniVQstpTl' },

  /* ── Flower · Exotics (exo) ──────────────────────────────────────────────── */

  /* ── Concentrates · In-House (inhouse) ───────────────────────────────────── */
  { slug: 'in-house-badder-b-tier',  name: 'In-House Badder (B-Tier)',       price: 350,  category: 'inhouse',     images: [img('2026/04','badder'), img('2026/04','badder2')],                                         description: 'https://t.me/NewSI420bot' },
  { slug: 'in-house-crumble-a-tier', name: 'In-House Crumble (A-Tier)',      price: 400,  category: 'inhouse',     images: [img('2026/04','crumble'), img('2026/04','crumble2')],                                       description: 'https://t.me/NewSI420bot' },

  /* ── Concentrates · Authentic (authenconc) ───────────────────────────────── */
  { slug: 'caviar-candy',            name: 'Caviar Candy',                   price: 600,  category: 'authenconc',  images: [img('2026/04','caviar'), img('2026/04','caviar2')],                                         description: 'https://t.me/NewSI420bot' },

  /* ── Disposables · Authentic (authendispos) ──────────────────────────────── */
  { slug: '2g-boutiq-switch-gum',    name: '2G Boutiq Switch Gum',           price: 1350, category: 'authendispos', images: [img('2026/03','boutiq-gum'), img('2026/03','boutiq-gum2')],                                description: 'https://t.me/NewSI420bot' },

  /* ── Edibles (edibles) ───────────────────────────────────────────────────── */
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

  // ─── Produits (identiques au frontend) ─────────────────────────────────────

  // Retire les anciens produits dont la photo source n'existe plus sur bestofthebay.net
  // (médiathèque du site réorganisée depuis le seed initial). Liste figée, volontairement
  // distincte de PRODUCTS pour ne jamais toucher aux produits créés depuis l'admin (Cloudinary).
  const STALE_IMAGE_SLUGS = [
    'black-amber', 'blackberry-runtz', 'blue-yakuza', 'cadillac-runtz', 'curelato',
    'frozen-trufflez', 'giraffe-puzzy', 'himalayan-cherries', 'mango-mintality', 'ny-cheesecake',
    'peaches-n-cream', 'pineapple-gas', 'purple-cream', 'purple-pb-runtz', 'purple-zookies',
    'red-pillz', 'runtz-n-cream', 'runtzlato', 'slush-mints', 'sweetz-sushi-bar-prepackaged-exotic-flower',
    'voodoo-cake', 'world-war-runtz', 'zombie-cake', 'guava-gas-smalls', 'mango-mintality-smalls',
    'mango-runtz-smalls', 'purple-punch-smalls', 'strawberry-mediums', 'sugar-tart-mediums',
    'wild-cherry-glitterbomb-smalls', 'animal-mints', 'guava-cookies', 'guava-gas', 'mango-runtz',
    'mango-runtz-2', 'wild-cherry-glitterbomb', 'grape-runtz', 'sweetz-pixie-stix', 'bubble-hash',
    'mousse-hash', 'diamonds-in-sauce-b-tier', 'shatter-b-tier', '2g-boutiq-v5-switch-orb',
    '2g-clean-carts', '2g-smoothie-blend-3-0-exotic-ed', '2g-whole-melts-dual-chamber', '3g-space-club',
    'sherbinski-2g-quattro-live-resin', 'toad-venom', '3000mg-cube-edibles', 'papaya-tarts', 'cherry-fundip',
  ];
  const staleProducts = await prisma.product.findMany({ where: { slug: { in: STALE_IMAGE_SLUGS } } });
  if (staleProducts.length) {
    const staleIds = staleProducts.map(p => p.id);
    await prisma.productImage.deleteMany({ where: { productId: { in: staleIds } } });
    await prisma.product.deleteMany({ where: { id: { in: staleIds } } });
    console.log(`🗑️  ${staleProducts.length} produit(s) obsolète(s) supprimé(s) (image source introuvable)`);
  }

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
