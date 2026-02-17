import { MechanicCard, PrediagnosisResult, VehicleContext } from '@repairo/shared';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

type DiagnosePayload = {
  mode: 'text' | 'image' | 'audio';
  prompt?: string;
  vehicle: VehicleContext;
  region?: string;
};

export async function createPrediagnosis(payload: DiagnosePayload): Promise<PrediagnosisResult> {
  const response = await fetch(`${BASE_URL}/api/diagnose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Unable to diagnose issue right now.');
  }

  return response.json();
}

export async function findNearbyMechanics(input: {
  lat: number;
  lng: number;
  make?: string;
}): Promise<MechanicCard[]> {
  const response = await fetch(`${BASE_URL}/api/mechanics/nearby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error('Unable to load mechanics.');
  }

  return response.json();
}
