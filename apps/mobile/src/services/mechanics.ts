import { MechanicCard } from '@repairo/shared';

type OverpassElement = {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizePlace(
  p: OverpassElement,
  origin: { lat: number; lng: number },
  make?: string
): MechanicCard {
  const lat = p.lat ?? p.center?.lat ?? origin.lat;
  const lng = p.lon ?? p.center?.lon ?? origin.lng;
  const distanceKm = haversineKm(origin.lat, origin.lng, lat, lng);
  const name = p.tags?.name ?? `Workshop ${p.id}`;
  const lower = name.toLowerCase();

  const isOfficialDealer =
    make !== undefined &&
    lower.includes(make.toLowerCase()) &&
    (lower.includes('dealer') || lower.includes('authorized') || lower.includes('service'));

  const street = p.tags?.['addr:street'];
  const housenumber = p.tags?.['addr:housenumber'];
  const city = p.tags?.['addr:city'];
  const address = [street, housenumber, city].filter(Boolean).join(' ') || 'Address unavailable';

  // OSM doesn't provide ratings — use opening_hours/phone presence as a quality proxy
  const hasDetails = Boolean(p.tags?.phone || p.tags?.['opening_hours'] || p.tags?.website);

  return {
    id: `${p.type}-${p.id}`,
    name,
    brandAuthorizedFor: isOfficialDealer && make ? [make] : [],
    rating: hasDetails ? 4.0 : 0,
    reviewCount: 0,
    distanceKm,
    address,
    isOfficialDealer,
    phone: p.tags?.phone,
    website: p.tags?.website,
    openingHours: p.tags?.['opening_hours']
  };
}

function buildOverpassQuery(lat: number, lng: number, radius: number) {
  return `[out:json][timeout:25];
(
  node["shop"="car_repair"](around:${radius},${lat},${lng});
  way["shop"="car_repair"](around:${radius},${lat},${lng});
  node["amenity"="car_repair"](around:${radius},${lat},${lng});
  way["amenity"="car_repair"](around:${radius},${lat},${lng});
  node["craft"="car_repair"](around:${radius},${lat},${lng});
  way["craft"="car_repair"](around:${radius},${lat},${lng});
);
out center 100;`;
}

async function queryOverpass(query: string): Promise<OverpassElement[]> {
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query
  });
  if (!response.ok) throw new Error(`Overpass error ${response.status}`);
  const data = (await response.json()) as { elements?: OverpassElement[] };
  return data.elements ?? [];
}

export async function findMechanicsNearby(input: {
  lat: number;
  lng: number;
  make?: string;
  radiusKm?: number;
}): Promise<MechanicCard[]> {
  const radius = (input.radiusKm ?? 10) * 1000;
  const elements = await queryOverpass(buildOverpassQuery(input.lat, input.lng, radius));

  const seen = new Set<string>();
  const results = elements
    .filter((p) => {
      const id = `${p.type}-${p.id}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((p) => normalizePlace(p, { lat: input.lat, lng: input.lng }, input.make));

  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}
