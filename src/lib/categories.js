export const CATEGORY_META = {
  travel: { label: 'Travel', icon: 'ti-plane', color: 'var(--sky)' },
  accommodations: { label: 'Accommodations', icon: 'ti-building-castle', color: 'var(--night)' },
  tickets: { label: 'Tickets', icon: 'ti-ticket', color: 'var(--sky-dark)' },
  lightning_lane: { label: 'Lightning Lane', icon: 'ti-bolt', color: 'var(--gold-dark)' },
  dining: { label: 'Dining', icon: 'ti-tools-kitchen-2', color: 'var(--coral)' },
  snacks: { label: 'Snacks', icon: 'ti-ice-cream', color: 'var(--teal-dark)' },
  experiences: { label: 'Experiences', icon: 'ti-stars', color: 'var(--gold-dark)' },
  souvenirs: { label: 'Souvenirs', icon: 'ti-gift', color: 'var(--coral)' },
  transport: { label: 'Transport', icon: 'ti-car', color: 'var(--sky-dark)' },
  misc: { label: 'Misc', icon: 'ti-dots', color: 'rgba(13,35,64,0.5)' },
}

export const CATEGORY_ORDER = ['travel', 'accommodations', 'tickets', 'lightning_lane', 'dining', 'snacks', 'experiences', 'souvenirs', 'transport', 'misc']

export function categoryMeta(cat) {
  return CATEGORY_META[cat] || { label: cat, icon: 'ti-dots', color: 'var(--text-tertiary)' }
}
