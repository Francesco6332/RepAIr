import { supabase } from './supabase';

export type MaintenanceType = 'service' | 'repair' | 'inspection' | 'other';

export interface MaintenanceEntry {
  id: string;
  vehicle_id: string;
  user_id: string;
  type: MaintenanceType;
  description: string;
  mileage_at: number | null;
  cost: number | null;
  workshop_name: string | null;
  date: string; // ISO date string 'YYYY-MM-DD'
  notes: string | null;
  from_diagnosis_id: string | null;
  created_at: string;
}

export async function listMaintenanceByVehicle(vehicleId: string): Promise<MaintenanceEntry[]> {
  const { data, error } = await supabase
    .from('maintenance_log')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as MaintenanceEntry[];
}

export async function addMaintenanceEntry(entry: {
  vehicleId: string;
  userId: string;
  type: MaintenanceType;
  description: string;
  date: string;
  mileage?: number;
  cost?: number;
  workshopName?: string;
  notes?: string;
  fromDiagnosisId?: string;
}): Promise<void> {
  const { error } = await supabase.from('maintenance_log').insert({
    vehicle_id: entry.vehicleId,
    user_id: entry.userId,
    type: entry.type,
    description: entry.description,
    date: entry.date,
    mileage_at: entry.mileage ?? null,
    cost: entry.cost ?? null,
    workshop_name: entry.workshopName ?? null,
    notes: entry.notes ?? null,
    from_diagnosis_id: entry.fromDiagnosisId ?? null,
  });
  if (error) throw error;
}
