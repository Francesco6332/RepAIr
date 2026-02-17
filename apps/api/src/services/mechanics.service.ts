import { MechanicCard } from '@repairo/shared';

const officialByMake: Record<string, string[]> = {
  BMW: ['BMW Service Center Downtown', 'BMW Certified Autohaus'],
  Mercedes: ['Mercedes-Benz Service Hub'],
  Ford: ['Ford Authorized Service'],
  Citroen: ['Citroen Official Workshop']
};

export async function getNearbyMechanics(input: {
  lat: number;
  lng: number;
  make?: string;
}): Promise<MechanicCard[]> {
  const authorized = input.make ? officialByMake[input.make] ?? [] : [];

  const fallback: MechanicCard[] = [
    {
      id: 'm1',
      name: authorized[0] ?? 'Prime Auto Diagnostics',
      brandAuthorizedFor: input.make ? [input.make] : [],
      rating: 4.8,
      reviewCount: 321,
      distanceKm: 1.4,
      address: '1200 Service Ave',
      isOfficialDealer: Boolean(authorized[0])
    },
    {
      id: 'm2',
      name: 'Metro Mechanics',
      rating: 4.7,
      reviewCount: 201,
      distanceKm: 2.1,
      address: '88 Harbor Blvd',
      isOfficialDealer: false
    },
    {
      id: 'm3',
      name: authorized[1] ?? 'TorqueLab Garage',
      brandAuthorizedFor: input.make && authorized[1] ? [input.make] : [],
      rating: 4.6,
      reviewCount: 180,
      distanceKm: 3.2,
      address: '225 Industrial Rd',
      isOfficialDealer: Boolean(authorized[1])
    }
  ];

  return fallback.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.distanceKm - b.distanceKm;
  });
}
