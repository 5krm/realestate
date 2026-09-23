import { ResidenceProject, NeighborhoodPin, BuildPhase } from '../types';

/** Scroll map (600vh track):
 *  0.00–0.10 hero · 0.10–0.46 build · 0.46–0.62 residences
 *  0.62–0.76 district · 0.76–0.88 record · 0.88–1.00 contact */

export const BUILD_PHASES: BuildPhase[] = [
  { number: '01', code: 'DATUM', title: 'Foundations', elevation: '+0m' },
  { number: '02', code: 'RISE', title: 'Superstructure', elevation: '+85m' },
  { number: '03', code: 'FAÇADE', title: 'Glass & bronze', elevation: '+140m' },
  { number: '04', code: 'REALM', title: 'Parks & canal', elevation: '+165m' },
  { number: '05', code: 'LIFE', title: 'First residents', elevation: '2027' },
];

/* Build-phase scroll sub-ranges (global progress) */
export const PHASE_RANGES: [number, number][] = [
  [0.10, 0.18],
  [0.18, 0.27],
  [0.27, 0.36],
  [0.36, 0.42],
  [0.42, 0.46],
];

export const RESIDENCE_PROJECTS: ResidenceProject[] = [
  {
    id: 'spire',
    name: 'The Spire',
    tagline: '36 storeys · river glass tower',
    type: 'highrise',
    heightMeters: 165,
    floorsCount: 36,
    startingPrice: '€890K',
    availability: '8 left',
    completionDate: 'Q3 2027',
    blurb: 'Full-height solar glass, corner loggias, skyline forever.',
    anchor: [0, -16],
    floors: [
      {
        floorNumber: 34,
        name: 'Sky Penthouse',
        type: 'Penthouse',
        areaSqm: 295,
        bedrooms: 4,
        bathrooms: 4.5,
        orientation: 'Panoramic',
        price: '€4.85M',
        priceEUR: 4850000,
        status: 'available',
        features: ['Private lift foyer', '65 m² sky terrace', 'Plunge pool'],
        rooms: [
          { id: 'living', name: 'Grand Salon', areaSqm: 75.5, finish: 'Silver Travertine', at: [0, 4.2], size: [11.8, 6.4] },
          { id: 'suite', name: 'Primary Suite', areaSqm: 33.5, finish: 'Oak & Linen', at: [0, 0], size: [6.2, 4] },
          { id: 'kitchen', name: 'Kitchen', areaSqm: 21.8, finish: 'Calacatta & Bronze', at: [6.4, 0], size: [5.4, 4] },
          { id: 'terrace', name: 'Sky Terrace', areaSqm: 39.5, finish: 'Ash Decking', at: [11.8, 0], size: [3.2, 10.6] },
        ],
      },
      {
        floorNumber: 22,
        name: 'Corner River Home',
        type: '3-bed',
        areaSqm: 178,
        bedrooms: 3,
        bathrooms: 3,
        orientation: 'SE waterfront',
        price: '€2.15M',
        priceEUR: 2150000,
        status: 'available',
        features: ['Wrap-around glass', 'Private loggia', 'Wine wall'],
        rooms: [
          { id: 'living', name: 'Living & Dining', areaSqm: 53.4, finish: 'Chevron Oak', at: [0, 4], size: [9.2, 5.8] },
          { id: 'suite', name: 'Master', areaSqm: 22.7, finish: 'Wool & Oak', at: [0, 0], size: [5.4, 4] },
          { id: 'guest', name: 'Guest Suite', areaSqm: 16, finish: 'Lime Plaster', at: [5.4, 0], size: [4, 4] },
          { id: 'terrace', name: 'Loggia', areaSqm: 13.2, finish: 'Basalt', at: [9.2, 0], size: [2.4, 9.8] },
        ],
      },
      {
        floorNumber: 8,
        name: 'Parkside Loft',
        type: '1-bed loft',
        areaSqm: 72,
        bedrooms: 1,
        bathrooms: 1.5,
        orientation: 'Park & canal',
        price: '€890K',
        priceEUR: 890000,
        status: 'available',
        features: ['3.4 m ceilings', 'Full-height glass', 'Balcony'],
        rooms: [
          { id: 'living', name: 'Loft Living', areaSqm: 29.4, finish: 'Concrete & Oak', at: [0, 3.4], size: [6.4, 4.6] },
          { id: 'suite', name: 'Chamber', areaSqm: 14.3, finish: 'Fluted Timber', at: [0, 0], size: [4.2, 3.4] },
          { id: 'kitchen', name: 'Kitchen Atelier', areaSqm: 9.1, finish: 'Steel & Quartz', at: [4.2, 0], size: [2.2, 3.4] },
          { id: 'terrace', name: 'Balcony', areaSqm: 8, finish: 'Ipe Deck', at: [6.4, 3.4], size: [1.6, 4.6] },
        ],
      },
    ],
  },
  {
    id: 'skybridge',
    name: 'Skybridge One',
    tagline: 'Twin towers · pool in the sky',
    type: 'courtyard',
    heightMeters: 110,
    floorsCount: 28,
    startingPrice: '€740K',
    availability: '6 left',
    completionDate: 'Q1 2027',
    blurb: 'Two slender towers joined at level 20 by a glass sky club.',
    anchor: [-34, 2],
    floors: [
      {
        floorNumber: 20,
        name: 'Skybridge Residence',
        type: '3-bed',
        areaSqm: 198,
        bedrooms: 3,
        bathrooms: 3,
        orientation: 'Park overlook',
        price: '€2.49M',
        priceEUR: 2490000,
        status: 'available',
        features: ['Sky Club access', 'Double terrace', 'Wellness level'],
        rooms: [
          { id: 'living', name: 'Living Gallery', areaSqm: 57.6, finish: 'Oak & Stone', at: [0, 4.4], size: [9.6, 6] },
          { id: 'suite', name: 'Master Suite', areaSqm: 24.6, finish: 'Linen & Jura', at: [0, 0], size: [5.6, 4.4] },
          { id: 'kitchen', name: 'Island Kitchen', areaSqm: 19, finish: 'Quartzite', at: [5.6, 0], size: [5, 4.4] },
          { id: 'terrace', name: 'Sky Loggia', areaSqm: 31.7, finish: 'Frameless Glass', at: [10.6, 0], size: [3, 10.4] },
        ],
      },
      {
        floorNumber: 12,
        name: 'Park View Suite',
        type: '2-bed',
        areaSqm: 122,
        bedrooms: 2,
        bathrooms: 2,
        orientation: 'Central park',
        price: '€1.24M',
        priceEUR: 1240000,
        status: 'available',
        features: ['Herringbone oak', 'Smart shading', 'Dressing room'],
        rooms: [
          { id: 'living', name: 'Living Room', areaSqm: 39.5, finish: 'Herringbone Oak', at: [0, 3.8], size: [7.6, 5.2] },
          { id: 'suite', name: 'Primary', areaSqm: 18.2, finish: 'Linen Walls', at: [0, 0], size: [4.8, 3.8] },
          { id: 'guest', name: 'Guest Room', areaSqm: 13.6, finish: 'Warm Wash', at: [4.8, 0], size: [4, 3.8] },
          { id: 'terrace', name: 'Balcony', areaSqm: 8, finish: 'Granite', at: [7.6, 3.8], size: [1.6, 5.2] },
        ],
      },
    ],
  },
  {
    id: 'terraces',
    name: 'River Terraces',
    tagline: 'Stepped villas · private pools',
    type: 'villa',
    heightMeters: 45,
    floorsCount: 8,
    startingPrice: '€1.45M',
    availability: '3 left',
    completionDate: 'Q4 2026',
    blurb: 'Garden cascades stepping down to the canal. Berth included.',
    anchor: [34, 6],
    floors: [
      {
        floorNumber: 8,
        name: 'Terrace Villa',
        type: '4-bed villa',
        areaSqm: 310,
        bedrooms: 4,
        bathrooms: 4.5,
        orientation: 'Riverfront south',
        price: '€3.68M',
        priceEUR: 3680000,
        status: 'available',
        features: ['Rooftop pool', '80 m² cedar deck', 'Marina berth'],
        rooms: [
          { id: 'living', name: 'River Hall', areaSqm: 84.3, finish: 'Walnut & Limestone', at: [0, 5.2], size: [12.4, 6.8] },
          { id: 'suite', name: 'Master Suite', areaSqm: 35.4, finish: 'Arabescato', at: [0, 0], size: [6.8, 5.2] },
          { id: 'kitchen', name: 'Chef Kitchen', areaSqm: 25.5, finish: 'Smoked Glass', at: [6.8, 0], size: [5.6, 5.2] },
          { id: 'terrace', name: 'Pool Deck', areaSqm: 49, finish: 'Red Cedar', at: [12.4, 0], size: [4, 12] },
        ],
      },
    ],
  },
];

export const NEIGHBORHOOD_PINS: NeighborhoodPin[] = [
  { id: 'metro', name: 'Express Metro', short: 'Metro', category: 'transit', walkTime: '3 min', coordinates: [-40, -15.5] },
  { id: 'park', name: 'Central River Park', short: 'Park', category: 'nature', walkTime: '2 min', coordinates: [-8, -34] },
  { id: 'marina', name: 'Marina Promenade', short: 'Marina', category: 'water', walkTime: '1 min', coordinates: [16, 25] },
  { id: 'roastery', name: 'Avenue Roastery', short: 'Dining', category: 'culinary', walkTime: '2 min', coordinates: [22, -13] },
];

export const RECORD_STATS = [
  { kicker: 'EST. 2004', value: 22, suffix: '', label: 'Years' },
  { kicker: 'DELIVERED', value: 1240, suffix: '+', label: 'Homes' },
  { kicker: 'MASTERPLAN', value: 485, suffix: 'k m²', label: 'Built realm' },
  { kicker: 'PROTOCOL', value: 99.4, suffix: '%', label: 'On time' },
];

export const PROJECT_BY_ID = Object.fromEntries(RESIDENCE_PROJECTS.map((p) => [p.id, p]));
