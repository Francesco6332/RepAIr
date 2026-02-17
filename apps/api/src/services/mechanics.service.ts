import { MechanicCard } from '@repairo/shared';

const officialByMake: Record<string, string[]> = {
  BMW: ['BMW'],
  Mercedes: ['Mercedes-Benz', 'Mercedes'],
  Ford: ['Ford'],
  Citroen: ['Citroen']
};

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
  officialHints: string[] = []
): MechanicCard {
  const lat = p.lat ?? p.center?.lat ?? origin.lat;
  const lng = p.lon ?? p.center?.lon ?? origin.lng;
  const distanceKm = haversineKm(origin.lat, origin.lng, lat, lng);
  const name = p.tags?.name ?? `Workshop ${p.id}`;
  const lower = name.toLowerCase();

  const isOfficialDealer = officialHints.some((hint) => lower.includes(hint.toLowerCase()))
    && (lower.includes('dealer') || lower.includes('authorized') || lower.includes('service'));

  const city = p.tags?.['addr:city'];
  const street = p.tags?.['addr:street'];
  const housenumber = p.tags?.['addr:housenumber'];
  const address = [street, housenumber, city].filter(Boolean).join(' ') || 'Address unavailable';

  return {
    id: `${p.type}-${p.id}`,
    name,
    brandAuthorizedFor: isOfficialDealer && make ? [make] : [],
    rating: 0,
    reviewCount: 0,
    distanceKm,
    address,
    isOfficialDealer
  };
}

function buildOverpassQuery(input: { lat: number; lng: number; radius: number; brandPattern?: string }) {
  const filters = input.brandPattern
    ? `["name"~"${input.brandPattern}",i]`
    : '';
  return `
[out:json][timeout:25];
(
  node["shop"="car_repair"]${filters}(around:${input.radius},${input.lat},${input.lng});
  way["shop"="car_repair"]${filters}(around:${input.radius},${input.lat},${input.lng});
  node["amenity"="car_repair"]${filters}(around:${input.radius},${input.lat},${input.lng});
  way["amenity"="car_repair"]${filters}(around:${input.radius},${input.lat},${input.lng});
);
out center 120;
`;
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

function fallbackList(make?: string): MechanicCard[] {
  return [
    {
      id: 'fallback-1',
      name: make ? `${make} Authorized Service` : 'Prime Auto Diagnostics',
      brandAuthorizedFor: make ? [make] : [],
      rating: 4.8,
      reviewCount: 321,
      distanceKm: 1.4,
      address: '1200 Service Ave',
      isOfficialDealer: Boolean(make)
    },
    {
      id: 'fallback-2',
      name: 'Metro Mechanics',
      rating: 4.7,
      reviewCount: 201,
      distanceKm: 2.1,
      address: '88 Harbor Blvd',
      isOfficialDealer: false
    },
    {
      id: 'fallback-3',
      name: 'TorqueLab Garage',
      rating: 4.6,
      reviewCount: 180,
      distanceKm: 3.2,
      address: '225 Industrial Rd',
      isOfficialDealer: false
    }
  ];
}

export async function getNearbyMechanics(input: {
  lat: number;
  lng: number;
  make?: string;
}): Promise<MechanicCard[]> {
  try {
    const officialHints = input.make ? officialByMake[input.make] ?? [input.make] : [];
    const brandPattern = officialHints.length > 0 ? officialHints.join('|') : undefined;

    const [general, dealers] = await Promise.all([
      queryOverpass(buildOverpassQuery({ lat: input.lat, lng: input.lng, radius: 7000 })),
      queryOverpass(
        buildOverpassQuery({
          lat: input.lat,
          lng: input.lng,
          radius: 12000,
          brandPattern
        })
      )
    ]);

    const merged = [...dealers, ...general];
    const seen = new Set<string>();
    const normalized = merged
      .filter((p) => {
        const id = `${p.type}-${p.id}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((p) => normalizePlace(p, { lat: input.lat, lng: input.lng }, input.make, officialHints));

    if (normalized.length === 0) return fallbackList(input.make);

    return normalized.sort((a, b) => {
      if (a.isOfficialDealer !== b.isOfficialDealer) return a.isOfficialDealer ? -1 : 1;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.distanceKm - b.distanceKm;
    });
  } catch {
    return fallbackList(input.make);
  }
}
