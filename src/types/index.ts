export interface ResidenceProject {
  id: string;
  name: string;
  tagline: string;
  type: 'highrise' | 'courtyard' | 'villa';
  heightMeters: number;
  floorsCount: number;
  startingPrice: string;
  availability: string;
  completionDate: string;
  blurb: string;
  /** 3D anchor: world position of the tower base center */
  anchor: [number, number];
  floors: ResidenceFloor[];
}

export interface ResidenceFloor {
  floorNumber: number;
  name: string;
  type: string;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  orientation: string;
  price: string;
  priceEUR: number;
  status: 'available' | 'reserved' | 'sold';
  features: string[];
  rooms: FloorPlanRoom[];
}

export interface FloorPlanRoom {
  id: string;
  name: string;
  areaSqm: number;
  finish: string;
  /** plan layout: [x, y] top-left in plan units, [w, d] size */
  at: [number, number];
  size: [number, number];
}

export type AmenityCategory = 'transit' | 'nature' | 'water' | 'culinary';

export interface NeighborhoodPin {
  id: string;
  name: string;
  short: string;
  category: AmenityCategory;
  walkTime: string;
  coordinates: [number, number];
}

export interface BuildPhase {
  number: string;
  code: string;
  title: string;
  elevation: string;
}

export type SectionId = 'hero' | 'build' | 'residences' | 'district' | 'record' | 'contact';

export type TimePreference = 'auto' | 'day' | 'golden' | 'night';
