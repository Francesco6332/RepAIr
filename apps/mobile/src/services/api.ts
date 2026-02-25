import { ChatMessage, FollowUpResponse, PrediagnosisResult, VehicleContext } from '@repairo/shared';
import { supabase } from './supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function createPrediagnosis(payload: {
  mode: 'text' | 'image' | 'audio';
  prompt: string;
  vehicle: VehicleContext;
  region?: string;
  language?: 'it' | 'en';
}): Promise<PrediagnosisResult> {
  const response = await fetch(`${BASE_URL}/api/diagnose`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error('Unable to diagnose issue right now.');
  return response.json();
}

export async function analyzePhoto(payload: {
  imageBase64: string;
  mimeType: string;
  vehicle: VehicleContext;
  region?: string;
  language?: 'it' | 'en';
}) {
  const response = await fetch(`${BASE_URL}/api/media/analyze-photo`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error('Photo analysis failed.');
  return response.json() as Promise<PrediagnosisResult>;
}

export async function analyzeAudio(payload: {
  audioTranscript: string;
  vehicle: VehicleContext;
  region?: string;
  language?: 'it' | 'en';
}) {
  const response = await fetch(`${BASE_URL}/api/media/analyze-audio`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error('Audio analysis failed.');
  return response.json() as Promise<PrediagnosisResult>;
}

export async function sendFollowUp(payload: {
  messages: ChatMessage[];
  vehicle: VehicleContext;
  region?: string;
  language?: 'it' | 'en';
}): Promise<FollowUpResponse> {
  const response = await fetch(`${BASE_URL}/api/diagnose/followup`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error('Follow-up failed. Please try again.');
  return response.json();
}

export async function lookupDtc(payload: {
  code: string;
  vehicle: VehicleContext;
  region?: string;
  language?: 'it' | 'en';
}): Promise<PrediagnosisResult> {
  const response = await fetch(`${BASE_URL}/api/dtc/lookup`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error('DTC lookup failed. Check the code format (e.g. P0420).');
  return response.json();
}

export async function deleteAccount(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/user`, {
    method: 'DELETE',
    headers: await authHeaders()
  });

  if (!response.ok) throw new Error('Account deletion failed.');
}

