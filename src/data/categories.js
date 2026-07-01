export const categories = [
  {
    slug: 'flower',
    name: 'Flower',
    children: [
      { slug: 'exo',  name: 'Exotics',          path: '/product-category/exo' },
      { slug: 'indo', name: 'Indoors',           path: '/product-category/indo' },
      { slug: 'mix',  name: 'AAA Mixed Lights',  path: '/product-category/mix' },
      { slug: 'deps', name: 'Light Deps',         path: '/product-category/flower/deps' },
    ],
    path: '/product-category/flower',
  },
  {
    slug: 'conc',
    name: 'Concentrates',
    children: [
      { slug: 'inhouse',     name: 'In-House',  path: '/product-category/conc/inhouse' },
      { slug: 'authenconc',  name: 'Authentic', path: '/product-category/conc/authenconc' },
    ],
    path: '/product-category/conc',
  },
  {
    slug: 'dispos',
    name: 'Dispos',
    children: [
      { slug: 'authendispos', name: 'Authentic', path: '/product-category/dispos/authendispos' },
      { slug: 'reps',         name: 'Replicas',  path: '/product-category/dispos/reps' },
    ],
    path: '/product-category/dispos',
  },
  {
    slug: 'edibles',
    name: 'Edibles',
    children: [],
    path: '/product-category/edibles',
  },
]

/** Returns array of all category slugs that belong under a given slug (inclusive) */
export function getCategorySlugs(slug) {
  const map = {
    flower:       ['flower', 'exo', 'indo', 'mix', 'deps'],
    exo:          ['exo'],
    indo:         ['indo'],
    mix:          ['mix'],
    deps:         ['deps'],
    conc:         ['conc', 'inhouse', 'authenconc'],
    inhouse:      ['inhouse'],
    authenconc:   ['authenconc'],
    dispos:       ['dispos', 'authendispos', 'reps'],
    authendispos: ['authendispos'],
    reps:         ['reps'],
    edibles:      ['edibles'],
  }
  return map[slug] || [slug]
}

export function getCategoryLabel(slug) {
  const flat = {
    flower: 'Flower', exo: 'Exotics', indo: 'Indoors', mix: 'AAA Mixed Lights',
    deps: 'Light Deps', conc: 'Concentrates', inhouse: 'In-House',
    authenconc: 'Authentic Concentrates', dispos: 'Disposables',
    authendispos: 'Authentic Disposables', reps: 'Replica Disposables',
    edibles: 'Edibles',
  }
  return flat[slug] || slug
}
