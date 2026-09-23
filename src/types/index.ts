export interface ResidenceProject {
  id: string;
  name: string;
  tagline: string;
  silhouette: string;
  type: 'highrise' | 'courtyard' | 'villa';
  heightMeters: number;
  floorsCount: number;
  startingPrice: string;
  availability: string;
  completionDate: string;
  description: string;
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
  ceilingHeight: string;
  price: string;
  status: 'available' | 'reserved' | 'sold';
  features: string[];
  rooms: FloorPlanRoom[];
}

export interface FloorPlanRoom {
  id: string;
  name: string;
  dimensions: string;
  areaSqm: number;
  finish: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

export interface NeighborhoodPin {
  id: string;
  name: string;
  category: 'transit' | 'nature' | 'water' | 'culinary' | 'culture';
  walkTime: string;
  distance: string;
  coordinates: [number, number, number];
  description: string;
  highlights: string[];
}

export interface BuildPhase {
  number: string;
  code: string;
  title: string;
  scrollRange: [number, number];
  elevation: string;
  description: string;
  technicalSpecs: string[];
}
