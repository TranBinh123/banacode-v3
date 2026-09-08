import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccelerationConfig, AccelerationQuestion } from "../types/acceleration";

const DEFAULT_CONFIG: AccelerationConfig = {
  id: "acceleration-main",
  name: "Tăng tốc",
  timeLimitSeconds: 30,
  points: 10,
  questions: [
    { id: "a1", order: 1, imageUrl: "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=1600&q=85", answer: "Cầu Vàng" },
  ],
};

type AccelerationStore = {
  config: AccelerationConfig;
  setConfig: (config: AccelerationConfig) => void;
  addQuestion: () => void;
  updateQuestion: (id: string, patch: Partial<AccelerationQuestion>) => void;
  deleteQuestion: (id: string) => void;
};

export const useAccelerationStore = create<AccelerationStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      setConfig: (config) => set({ config }),
      addQuestion: () => set((state) => ({
        config: {
          ...state.config,
          questions: [...state.config.questions, { id: `a-${Date.now()}`, order: state.config.questions.length + 1, imageUrl: "", answer: "" }],
        },
      })),
      updateQuestion: (id, patch) => set((state) => ({
        config: { ...state.config, questions: state.config.questions.map((q) => q.id === id ? { ...q, ...patch } : q) },
      })),
      deleteQuestion: (id) => set((state) => ({
        config: { ...state.config, questions: state.config.questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i + 1 })) },
      })),
    }),
    { name: "olympia-acceleration-config" },
  ),
);
