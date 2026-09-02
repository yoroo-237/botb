const BASE = 'https://bestofthebay.net/wp-content/uploads'
const PH   = 'https://bestofthebay.net/wp-content/uploads/woocommerce-placeholder.webp'

function img(path, name) {
  return {
    src: `${BASE}/${path}/${name}.jpg`,
    thumbnail: `${BASE}/${path}/${name}-300x300.jpg`,
  }
}

export const products = [
  {
    id: 2403, slug: 'black-amber-smalls',   name: 'Black Amber Smalls',
    price: 550, category: 'indo',
    images: [img('2026/06','black-smalls'), img('2026/06','black-smalls2')],
    description: 'https://t.me/NewSI420bot?start=p_5J1CKeIIh0XgsXHBw58zfR',
  },
  {
    id: 1688, slug: 'blue-gumbo',           name: 'Blue Gumbo',
    price: 775, category: 'indo',
    images: [img('2026/06','blue-gumbo'), img('2026/06','blue-gumbo2'), img('2026/06','blue-gumbo3')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1700, slug: 'blue-tommyz',          name: 'Blue Tommyz',
    price: 850, category: 'indo',
    images: [img('2026/06','blue-tommyz'), img('2026/06','blue-tommyz2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1702, slug: 'blueberry-glitterbomb', name: 'Blueberry Glitterbomb',
    price: 875, category: 'indo',
    images: [img('2026/06','blueberry-glitter'), img('2026/06','blueberry-glitter2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1703, slug: 'blueberry-lemon-drop', name: 'Blueberry Lemon Drop',
    price: 825, category: 'indo',
    images: [img('2026/06','blueberry-lemon'), img('2026/06','blueberry-lemon2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1704, slug: 'blueberry-runtz',      name: 'Blueberry Runtz',
    price: 950, category: 'indo',
    images: [img('2026/06','blueberry-runtz'), img('2026/06','blueberry-runtz2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1706, slug: 'cherry-z',             name: 'Cherry Z',
    price: 800, category: 'indo',
    images: [img('2026/06','cherry-z'), img('2026/06','cherry-z2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1710, slug: 'gumbo',               name: 'Gumbo',
    price: 850, category: 'indo',
    images: [img('2026/06','gumbo'), img('2026/06','gumbo2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1712, slug: 'hood-candy',           name: 'Hood Candy',
    price: 750, category: 'indo',
    images: [img('2026/06','hood-candy'), img('2026/06','hood-candy2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1713, slug: 'lemon-berry-runtz',    name: 'Lemon Berry Runtz',
    price: 875, category: 'indo',
    images: [img('2026/06','lemon-berry'), img('2026/06','lemon-berry2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1718, slug: 'pink-candy',           name: 'Pink Candy',
    price: 800, category: 'indo',
    images: [img('2026/06','pink-candy'), img('2026/06','pink-candy2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1719, slug: 'purple-candy-meds',    name: 'Purple Candy Meds',
    price: 750, category: 'indo',
    images: [img('2026/06','purple-candy'), img('2026/06','purple-candy2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1726, slug: 'strawberries-n-cream', name: "Strawberries N' Cream",
    price: 850, category: 'indo',
    images: [img('2026/06','strawberries'), img('2026/06','strawberries2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1727, slug: 'super-cherry-runtz',   name: 'Super Cherry Runtz',
    price: 950, category: 'indo',
    images: [img('2026/06','super-cherry'), img('2026/06','super-cherry2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1728, slug: 'super-lemon-haze',     name: 'Super Lemon Haze',
    price: 825, category: 'indo',
    images: [img('2026/06','super-lemon'), img('2026/06','super-lemon2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1731, slug: 'white-runtz',          name: 'White Runtz',
    price: 875, category: 'indo',
    images: [img('2026/06','white-runtz'), img('2026/06','white-runtz2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 2401, slug: 'white-truffle',        name: 'White Truffle',
    price: 575, category: 'indo',
    images: [img('2026/06','white-3'), img('2026/06','white2-3'), img('2026/06','white3-2')],
    description: 'https://t.me/NewSI420bot?start=p_2pp4xasmNgkTp3Dfv3IIyk',
  },
  {
    id: 2119, slug: 'blue-candy-smalls',    name: 'Blue Candy Smalls',
    price: 475, category: 'deps',
    images: [img('2026/06','blue-smalls'), img('2026/06','blue-smalls2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1737, slug: 'purple-candy-runtz-smalls', name: 'Purple Candy Runtz Smalls',
    price: 425, category: 'deps',
    images: [img('2026/06','purple-smalls'), img('2026/06','purple-smalls2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1741, slug: 'white-truffle-smalls', name: 'White Truffle Smalls',
    price: 400, category: 'deps',
    images: [img('2026/06','white-smalls'), img('2026/06','white-smalls2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1690, slug: 'cherry-zoda',          name: 'Cherry Zoda',
    price: 785, category: 'mix',
    images: [img('2026/06','cherry-zoda'), img('2026/06','cherry-zoda2'), img('2026/06','cherry-zoda3')],
    description: 'https://t.me/NewSI420bot?start=p_149J4pAPT4yDZIk5Kx5dqD',
  },
  {
    id: 2003, slug: 'frozen-gushers',       name: 'Frozen Gushers',
    price: 675, category: 'mix',
    images: [img('2026/06','frozen'), img('2026/06','frozen2'), img('2026/06','frozen3')],
    description: 'https://t.me/NewSI420bot?start=p_6uFcZ1CTDiL7SniVQstpTl',
  },
  {
    id: 1748, slug: 'in-house-badder-b-tier', name: 'In-House Badder (B-Tier)',
    price: 350, category: 'inhouse',
    images: [img('2026/04','badder'), img('2026/04','badder2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1749, slug: 'in-house-crumble-a-tier', name: 'In-House Crumble (A-Tier)',
    price: 400, category: 'inhouse',
    images: [img('2026/04','crumble'), img('2026/04','crumble2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1751, slug: 'caviar-candy',         name: 'Caviar Candy',
    price: 600, category: 'authenconc',
    images: [img('2026/04','caviar'), img('2026/04','caviar2')],
    description: 'https://t.me/NewSI420bot',
  },
  {
    id: 1754, slug: '2g-boutiq-switch-gum', name: '2G Boutiq Switch Gum',
    price: 1350, category: 'authendispos',
    images: [img('2026/03','boutiq-gum'), img('2026/03','boutiq-gum2')],
    description: 'https://t.me/NewSI420bot',
  },

]

/** Get product by slug */
export function getProduct(slug) {
  return products.find(p => p.slug === slug)
}

/** Get product thumbnail (first image 300x300) */
export function getThumb(product) {
  const img = product?.images?.[0]
  if (!img) return PH
  // A video has no still-image representation of its own — never fall back
  // to its raw file URL as an <img> src, only to an explicit thumbnail.
  if (img.mediaType === 'video') return img.thumbnail || PH
  return img.thumbnail || img.url || img.src || PH
}

/** Format price as $X,XXX.XX */
export function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(price)
}
