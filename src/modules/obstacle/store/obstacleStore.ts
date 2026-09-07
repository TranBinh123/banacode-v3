import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ObstaclePuzzle } from "../types/obstacle";

const DEFAULT_PUZZLE: ObstaclePuzzle = {
  id: "obstacle-demo",
  name: "Vượt chướng ngại vật – Demo",
  phase: "obstacle",
  verticalAnswer: "BA NA HILLS",
  timeLimitSeconds: 60,
  horizontalPoints: 10,
  verticalPoints: 50,
  clues: [
    { id: "c1", order: 1, question: "Tên gọi thân thuộc của khu du lịch?", answer: "CHAOMAT TROI", x: 5, y: 1, verticalIndex: 5 },
    { id: "c2", order: 2, question: "Tên tập đoàn?", answer: "SUN GROUP", x: 8, y: 2, verticalIndex: 3 },
    { id: "c3", order: 3, question: "Tên một đội chơi?", answer: "ANHBINHMINH", x: 6, y: 3, verticalIndex: 4 },
  ],
};

type ObstacleStore = {
  puzzles: ObstaclePuzzle[];
  setPuzzles: (puzzles: ObstaclePuzzle[]) => void;
  addPuzzle: (puzzle: ObstaclePuzzle) => void;
  updatePuzzle: (puzzle: ObstaclePuzzle) => void;
  deletePuzzle: (id: string) => void;
};

export const useObstacleStore = create<ObstacleStore>()(
  persist(
    (set) => ({
      puzzles: [DEFAULT_PUZZLE],
      setPuzzles: (puzzles) => set({ puzzles }),
      addPuzzle: (puzzle) => set((state) => ({ puzzles: [...state.puzzles, puzzle] })),
      updatePuzzle: (puzzle) => set((state) => ({ puzzles: state.puzzles.map((p) => p.id === puzzle.id ? puzzle : p) })),
      deletePuzzle: (id) => set((state) => ({ puzzles: state.puzzles.filter((p) => p.id !== id) })),
    }),
    { name: "olympia-obstacle-config" },
  ),
);
