import { create } from 'zustand';

interface Player {
  id: string;
  seatNumber: number;
  isActive: boolean;
  hasSeen: boolean;
  isFolded: boolean;
  currentBet: number;
  totalBet: number;
  cards?: any[]; // Only visible for self
}

// Copied from backend types to keep in sync
export enum FestivalPhase {
  NONE = 'NONE',
  PHASE_1_FOUR_CARD = 'PHASE_1_FOUR_CARD',
  PHASE_2_IMAGINARY = 'PHASE_2_IMAGINARY',
  PHASE_3_LOWEST = 'PHASE_3_LOWEST',
  PHASE_4_JOKER = 'PHASE_4_JOKER',
}

export interface FestivalState {
  isActive: boolean;
  currentPhase: FestivalPhase;
  phasesRemaining: FestivalPhase[];
  triggerTrailValue: number | null;
  jokerValue: number | null;
}

interface GameState {
  tableId: string | null;
  roundId: string | null;
  phase: string;
  festivalState?: FestivalState; // Added field
  players: Player[];
  pot: number;
  currentBet: number;
  currentTurn: number | null;
  mySeat: number | null;
  myCards: any[];
  lastAction: string | null;
}

interface GameStore extends GameState {
  setGameState: (state: Partial<GameState>) => void;
  resetGame: () => void;
  setMySeat: (seat: number) => void;
}

const initialState: GameState = {
  tableId: null,
  roundId: null,
  phase: 'WAITING',
  players: [],
  pot: 0,
  currentBet: 0,
  currentTurn: null,
  mySeat: null,
  myCards: [],
  lastAction: null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  setGameState: (newState) => set((state) => ({ ...state, ...newState })),
  resetGame: () => set(initialState),
  setMySeat: (seat) => set({ mySeat: seat }),
}));
