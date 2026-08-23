export const STEP_NAMES = ['Party size', 'Getting there', 'When & where', 'Tickets & LL', 'Dining', 'Extras', 'Your estimate']
export const EST_TOTAL = 6

export const DEFAULT_S = {
  adults: 1, children: 0, nights: 1, parkdays: 1,
  season: 'value', resort: 'value', ticket: 'base', ll: 'none',
  qs: 2, ts: 1, character: 0, snacks: 2,
  souvenirs: 0, experiences: 0, travel: 'flying',
}

export const LIM = {
  adults: [1, 8], children: [0, 6], nights: [0, 14], parkdays: [1, 10],
  qs: [0, 5], ts: [0, 3], character: [0, 6], snacks: [0, 10],
}

export const RESORT_RATES = {
  value: { value: [130, 165], regular: [165, 215], peak: [215, 280] },
  moderate: { value: [220, 280], regular: [280, 360], peak: [360, 450] },
  deluxe: { value: [430, 560], regular: [560, 750], peak: [750, 1100] },
  villa: { value: [500, 680], regular: [680, 900], peak: [900, 1350] },
  offsite: { value: [100, 150], regular: [130, 200], peak: [175, 250] },
}

export const TPD = {
  value: { '1': [109, 129], '2-3': [105, 120], '4+': [88, 105] },
  regular: { '1': [139, 169], '2-3': [130, 150], '4+': [110, 135] },
  peak: { '1': [169, 209], '2-3': [155, 175], '4+': [130, 155] },
}

export const TPD_CHILD = {
  value: { '1': [104, 119], '2-3': [99, 114], '4+': [83, 99] },
  regular: { '1': [129, 159], '2-3': [124, 144], '4+': [104, 129] },
  peak: { '1': [159, 199], '2-3': [149, 169], '4+': [124, 149] },
}

export const PH = { base: [0, 0], hopper: [80, 100], wpas: [74, 80], hopperplus: [100, 130] }
export const LLR = { none: [0, 0], multipass: [15, 25], singles: [55, 90] }
export const MEAL = { qs: [12, 20], ts: [45, 75], character: [60, 95], snack: [6, 14] }

export const WDW = [28.3852, -81.5639]

export const CITIES = {
  'new york': [40.71, -74.01], 'nyc': [40.71, -74.01], 'chicago': [41.88, -87.63],
  'los angeles': [34.05, -118.24], 'la': [34.05, -118.24], 'houston': [29.76, -95.37],
  'phoenix': [33.45, -112.07], 'philadelphia': [39.95, -75.17], 'san antonio': [29.42, -98.49],
  'san diego': [32.72, -117.16], 'dallas': [32.78, -96.80], 'austin': [30.27, -97.74],
  'jacksonville': [30.33, -81.66], 'columbus': [39.96, -82.99], 'charlotte': [35.23, -80.84],
  'indianapolis': [39.77, -86.16], 'san francisco': [37.77, -122.42], 'sf': [37.77, -122.42],
  'seattle': [47.61, -122.33], 'denver': [39.74, -104.98], 'boston': [42.36, -71.06],
  'nashville': [36.17, -86.78], 'miami': [25.78, -80.21], 'atlanta': [33.75, -84.39],
  'minneapolis': [44.98, -93.27], 'portland': [45.52, -122.68], 'las vegas': [36.17, -115.14],
  'memphis': [35.15, -90.05], 'louisville': [38.25, -85.76], 'baltimore': [39.29, -76.61],
  'raleigh': [35.78, -78.64], 'tucson': [32.22, -110.93], 'sacramento': [38.58, -121.49],
  'kansas city': [39.10, -94.58], 'chapel hill': [35.91, -79.06], 'durham': [35.99, -78.90],
  'orlando': [28.54, -81.38], 'tampa': [27.95, -82.46], 'cincinnati': [39.10, -84.51],
  'pittsburgh': [40.44, -79.99], 'cleveland': [41.50, -81.69], 'detroit': [42.33, -83.05],
  'st louis': [38.63, -90.20], 'new orleans': [29.95, -90.07], 'richmond': [37.54, -77.44],
  'salt lake city': [40.76, -111.89], 'albuquerque': [35.08, -106.65], 'oklahoma city': [35.47, -97.52],
  'boise': [43.62, -116.21],
}

export const EXPERIENCES = [
  { id: 'memorymaker', name: 'Memory Maker', park: 'All parks', desc: 'Unlimited digital downloads of ride photos & PhotoPass shots for your whole trip.', price: '$199–$299 total', val: 249 },
  { id: 'bbb', name: 'Bibbidi Bobbidi Boutique', park: 'MK / Disney Springs', desc: 'Hair, makeup & costume transformation for kids at the castle salon.', price: '$75–$450', val: 262 },
  { id: 'pirates', name: 'Pirates League', park: 'MK', desc: 'Pirate-themed makeover with face paint, bandana & sword for kids.', price: '$60–$130', val: 95 },
  { id: 'mnsshp', name: "Mickey's Not-So-Scary Halloween Party", park: 'MK', desc: 'After-hours hard-ticket event with trick-or-treating, parade & fireworks.', price: '$99–$184/pp', val: 141, pp: true, seasonal: 'Aug–Oct' },
  { id: 'mvmcp', name: "Mickey's Very Merry Christmas Party", park: 'MK', desc: 'After-hours holiday party with snow, parade & exclusive fireworks.', price: '$99–$189/pp', val: 144, pp: true, seasonal: 'Nov–Dec' },
  { id: 'afterhours', name: 'Disney After Hours', park: 'MK / HS / AK', desc: 'Low-crowd after-hours access with free snacks & short-to-no lines.', price: '$139–$184/pp', val: 161, pp: true, seasonal: 'Select nights' },
  { id: 'fireworksdp', name: 'Fireworks Dessert Party', park: 'MK', desc: 'Reserved viewing area plus desserts for the nighttime fireworks show.', price: '$99–$159/pp', val: 129, pp: true },
  { id: 'savis', name: "Savi's Workshop", park: 'HS', desc: "Build-your-own custom lightsaber experience in Galaxy's Edge.", price: '$250 flat', val: 250 },
  { id: 'droid', name: 'Droid Depot', park: 'HS', desc: "Build-your-own custom droid companion in Galaxy's Edge.", price: '$120 flat', val: 120 },
  { id: 'wat', name: 'Wild Africa Trek', park: 'AK', desc: 'Guided backstage safari walk over the savanna with a harnessed bridge crossing.', price: '$189–$249/pp', val: 219, pp: true },
  { id: 'giants', name: 'Caring for Giants', park: 'AK', desc: "Small-group up-close experience learning about the park's elephants.", price: '$35–$45/pp', val: 40, pp: true },
  { id: 'seeds', name: 'Behind the Seeds', park: 'EPCOT', desc: 'Guided greenhouse tour of the growing labs behind The Land pavilion.', price: '$30–$35/pp', val: 32, pp: true },
  { id: 'epcotdp', name: 'EPCOT Dessert Party', park: 'EPCOT', desc: "Reserved viewing plus desserts for EPCOT's nighttime spectacular.", price: '$99–$139/pp', val: 119, pp: true },
  { id: 'viptour', name: 'VIP Tour', park: 'All parks', desc: 'Private guide who plans your day and gets your party to the front of lines.', price: '$450–$900/hr', val: 675 },
]

export const RESORT_LABELS = { value: 'Value resort', moderate: 'Moderate resort', deluxe: 'Deluxe resort', villa: 'Deluxe Villa', offsite: 'Offsite hotel' }
export const TICKET_LABELS = { base: 'Base (one park/day)', hopper: 'Park Hopper', wpas: 'Water Park & Sports', hopperplus: 'Hopper Plus' }
export const LL_LABELS = { none: 'None', multipass: 'Multi Pass', singles: 'MP + Singles' }
