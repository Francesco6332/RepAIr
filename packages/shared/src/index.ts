export type DiagnosisInputMode = 'text' | 'image' | 'audio';

export type UrgencyLevel = 'low' | 'medium' | 'high';

export interface VehicleContext {
  make: string;
  model: string;
  year: number;
  mileage?: number;
  fuelType?: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'cng';
}

export type CanDriveLevel = 'yes' | 'with_caution' | 'no';

export interface ProbableCause {
  cause: string;
  confidence: number;
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
  // Extended fields (Sprint 1 — structured professional report)
  canDrive?: CanDriveLevel;
  topCauses?: ProbableCause[];
  userChecks?: string[];
  ignoreRisks?: string;
  estimatedTimeMin?: number;
  estimatedTimeMax?: number;
  mechanicQuestions?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface FollowUpResponse {
  message: string;
  diagnosis: PrediagnosisResult;
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
  isVerifiedRepAIro?: boolean;
  phone?: string;
  website?: string;
  openingHours?: string;
}
