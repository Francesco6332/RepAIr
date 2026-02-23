import { supabase } from './supabase';
import { PrediagnosisResult } from '@repairo/shared';

export type DiagnosisRecord = {
  id: string;
  vehicle_id: string;
  type: 'text' | 'photo' | 'audio';
  summary: string | null;
  confidence: number | null;
  urgency: 'low' | 'medium' | 'high' | null;
  cost_min: number | null;
  cost_max: number | null;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  vehicles: { make: string; model: string; year: number } | null;
};

export async function saveDiagnosis(input: {
  userId: string;
  vehicleId: string;
  type: 'text' | 'photo' | 'audio';
  result: PrediagnosisResult;
}): Promise<void> {
  const { error } = await supabase.from('diagnoses').insert({
    user_id: input.userId,
    vehicle_id: input.vehicleId,
    type: input.type,
    summary: input.result.probableIssue,
    confidence: input.result.confidence,
    urgency: input.result.urgency,
    cost_min: input.result.estimatedCostMin,
    cost_max: input.result.estimatedCostMax,
    status: 'open',
  });

  if (error) throw error;
}

export async function listDiagnoses(userId: string): Promise<DiagnosisRecord[]> {
  const { data, error } = await supabase
    .from('diagnoses')
    .select('*, vehicles(make, model, year)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as DiagnosisRecord[];
}

export async function listDiagnosesByVehicle(vehicleId: string): Promise<DiagnosisRecord[]> {
  const { data, error } = await supabase
    .from('diagnoses')
    .select('*, vehicles(make, model, year)')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as DiagnosisRecord[];
}
