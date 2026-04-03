import { create } from 'zustand';

interface StoreState {

  // User
  user: {
    id: string;
  }

  setUser: (user: { id: string }) => void;


  // Notifications
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  alertSetupHour: string | null;
  setAlertSetupHour: (hour: string | null) => void;
  alertSetupMinute: string | null;
  setAlertSetupMinute: (minute: string | null) => void;
  alertsEnabled: boolean;
  setAlertsEnabled: (enabled: boolean) => void;

  // Store management
  clearStore: () => void;
}

export const useStore = create<StoreState>((set) => ({

  // User
  user: {
    id: '',
  },
  setUser: (user) => set({ user }),

  // Notifications


  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  alertSetupHour: null,
  setAlertSetupHour: (string) => set({ alertSetupHour: string }),
  alertSetupMinute: null,
  setAlertSetupMinute: (string) => set({ alertSetupMinute: string }),
  alertsEnabled: false,
  setAlertsEnabled: (enabled) => set({ alertsEnabled: enabled }),

  // Store management
  clearStore: () => set({
    user: { id: '' },
    selectedDate: null,
    alertSetupHour: null,
    alertSetupMinute: null,
    alertsEnabled: false,
  }),
}));
