export type DiagnosisInputMode = 'text' | 'image' | 'audio';

export type UrgencyLevel = 'low' | 'medium' | 'high';

export interface VehicleContext {
  make: string;
  model: string;
  year: number;
  mileage?: number;
  fuelType?: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'cng';
}

export interface PrediagnosisResult {
  probableIssue: string;
  confidence: number;
  urgency: UrgencyLevel;
  estimatedCostMin: number;
  estimatedCostMax: number;
  safetyAdvice: string;
  nextChecks: string[];
  disclaimer: string;
}

export interface MechanicCard {
  id: string;
  name: string;
  brandAuthorizedFor?: string[];
  rating: number;
  reviewCount: number;
  distanceKm: number;
  address: string;
  isOfficialDealer: boolean;
}
