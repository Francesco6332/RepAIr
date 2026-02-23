import { create } from 'zustand';
import { Vehicle } from '../services/vehicles';
import { PrediagnosisResult } from '@repairo/shared';

type State = {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  lastDiagnosis: PrediagnosisResult | null;
  setVehicles: (vehicles: Vehicle[]) => void;
  setSelectedVehicleId: (id: string) => void;
  setLastDiagnosis: (result: PrediagnosisResult) => void;
};

export const useVehicleStore = create<State>((set) => ({
  vehicles: [],
  selectedVehicleId: undefined,
  lastDiagnosis: null,
  setVehicles: (vehicles) =>
    set((state) => ({
      vehicles,
      selectedVehicleId: state.selectedVehicleId ?? vehicles[0]?.id
    })),
  setSelectedVehicleId: (id) => set({ selectedVehicleId: id }),
  setLastDiagnosis: (result) => set({ lastDiagnosis: result }),
}));
