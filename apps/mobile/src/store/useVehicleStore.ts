import { create } from 'zustand';
import { Vehicle } from '../services/vehicles';

type State = {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  setVehicles: (vehicles: Vehicle[]) => void;
  setSelectedVehicleId: (id: string) => void;
};

export const useVehicleStore = create<State>((set) => ({
  vehicles: [],
  selectedVehicleId: undefined,
  setVehicles: (vehicles) =>
    set((state) => ({
      vehicles,
      selectedVehicleId: state.selectedVehicleId ?? vehicles[0]?.id
    })),
  setSelectedVehicleId: (id) => set({ selectedVehicleId: id })
}));
