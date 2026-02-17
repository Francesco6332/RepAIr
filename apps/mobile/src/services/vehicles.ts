import { supabase } from './supabase';

export type Vehicle = {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  current_mileage: number;
  fuel_type: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'cng' | null;
  is_primary: boolean;
};

export async function listVehicles(userId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Vehicle[];
}

export async function addVehicle(input: {
  userId: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  fuelType: Vehicle['fuel_type'];
}) {
  const { error } = await supabase.from('vehicles').insert({
    user_id: input.userId,
    make: input.make,
    model: input.model,
    year: input.year,
    current_mileage: input.mileage,
    fuel_type: input.fuelType,
    is_primary: false
  });

  if (error) throw error;
}
