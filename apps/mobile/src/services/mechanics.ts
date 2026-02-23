import { MechanicCard } from '@repairo/shared';
import { supabase } from './supabase';

export const ADDRESS_UNAVAILABLE = 'Indirizzo non disponibile';

type VerifiedWorkshop = {
  id: string;
  brand: string;
  workshop_name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

async function fetchVerifiedWorkshops(lat: number, lng: number): Promise<VerifiedWorkshop[]> {
  // ~10 km bounding box at Italian latitudes
  const delta = 0.09;
  const { data } = await supabase
    .from('authorized_workshops')
    .select('id, brand, workshop_name, address, lat, lng')
    .gte('lat', lat - delta)
    .lte('lat', lat + delta)
    .gte('lng', lng - delta)
    .lte('lng', lng + delta)
    .limit(50);

  const nearby = (data ?? []) as VerifiedWorkshop[];
  if (nearby.length > 0) return nearby;

  // Fallback: if no geo-matched records are available, return a small generic set.
  // Useful when seed data has no coordinates yet.
  const { data: generic } = await supabase
    .from('authorized_workshops')
    .select('id, brand, workshop_name, address, lat, lng')
    .limit(20);

  return (generic ?? []) as VerifiedWorkshop[];
}

function isVerifiedMatch(osmName: string, verified: VerifiedWorkshop[]): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lower = normalize(osmName);
  return verified.some((v) => {
    const vName = normalize(v.workshop_name);
    return lower.includes(vName) || vName.includes(lower);
  });
}

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
  make?: string,
  verified: VerifiedWorkshop[] = []
): MechanicCard {
  const lat = p.lat ?? p.center?.lat ?? origin.lat;
  const lng = p.lon ?? p.center?.lon ?? origin.lng;
  const distanceKm = haversineKm(origin.lat, origin.lng, lat, lng);
  const name = p.tags?.name ?? `Officina ${p.id}`;
  const lower = name.toLowerCase();

  const isOfficialDealer =
    make !== undefined &&
    lower.includes(make.toLowerCase()) &&
    (lower.includes('dealer') || lower.includes('authorized') || lower.includes('service'));

  const street = p.tags?.['addr:street'];
  const housenumber = p.tags?.['addr:housenumber'];
  const city = p.tags?.['addr:city'];
  const address = [street, housenumber, city].filter(Boolean).join(' ') || ADDRESS_UNAVAILABLE;

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
    isVerifiedRepAIro: isVerifiedMatch(name, verified),
    phone: p.tags?.phone,
    website: p.tags?.website,
    openingHours: p.tags?.['opening_hours']
  };
}

function normalizeVerifiedWorkshop(
  workshop: VerifiedWorkshop,
  origin: { lat: number; lng: number },
  make?: string
): MechanicCard {
  const lat = workshop.lat ?? origin.lat;
  const lng = workshop.lng ?? origin.lng;
  const isOfficialDealer =
    make !== undefined &&
    workshop.brand.toLowerCase().includes(make.toLowerCase());

  return {
    id: `verified-${workshop.id}`,
    name: workshop.workshop_name,
    brandAuthorizedFor: isOfficialDealer && make ? [make] : [],
    rating: 4.0,
    reviewCount: 0,
    distanceKm: haversineKm(origin.lat, origin.lng, lat, lng),
    address: workshop.address ?? ADDRESS_UNAVAILABLE,
    isOfficialDealer,
    isVerifiedRepAIro: true,
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

  // Fetch OSM results and verified workshops in parallel.
  // If Overpass fails, we still try to return verified workshops from Supabase.
  const [overpass, verified] = await Promise.all([
    queryOverpass(buildOverpassQuery(input.lat, input.lng, radius))
      .then((elements) => ({ ok: true as const, elements }))
      .catch(() => ({ ok: false as const, elements: [] as OverpassElement[] })),
    fetchVerifiedWorkshops(input.lat, input.lng).catch(() => [] as VerifiedWorkshop[]),
  ]);

  const seen = new Set<string>();
  const results = overpass.elements
    .filter((p) => {
      const id = `${p.type}-${p.id}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((p) => normalizePlace(p, { lat: input.lat, lng: input.lng }, input.make, verified));

  // Include verified workshops not present in OSM result set.
  const verifiedOnly = verified
    .filter((v) => !results.some((item) => isVerifiedMatch(item.name, [v])))
    .map((v) => normalizeVerifiedWorkshop(v, { lat: input.lat, lng: input.lng }, input.make));

  const merged = [...results, ...verifiedOnly];

  // Verified workshops bubble to the top, then sort by distance
  return merged.sort((a, b) => {
    if (a.isVerifiedRepAIro && !b.isVerifiedRepAIro) return -1;
    if (!a.isVerifiedRepAIro && b.isVerifiedRepAIro) return 1;
    return a.distanceKm - b.distanceKm;
  });
}
