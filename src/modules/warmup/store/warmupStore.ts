import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../core/types/game";
import type { QuestionSet, QuestionStatus, TeamQuestionSetMap } from "../types/warmup";
import { DEFAULT_QUESTION_SETS } from "../data/defaultQuestionSets";

type WarmupStore = {
  questionSets: QuestionSet[];
  teamQuestionSetMap: TeamQuestionSetMap;
  setQuestionSets: (sets: QuestionSet[]) => void;
  saveMapping: (mapping: TeamQuestionSetMap) => void;
  addSet: (set: QuestionSet) => void;
  updateSet: (set: QuestionSet) => void;
  deleteSet: (setId: string) => void;
};

const emptyMap: TeamQuestionSetMap = {
  "team-1": "set-a",
  "team-2": "set-b",
  "team-3": "set-c",
  "team-4": "set-d",
};

export const useWarmupStore = create<WarmupStore>()(
  persist(
    (set) => ({
      questionSets: DEFAULT_QUESTION_SETS,
      teamQuestionSetMap: emptyMap,
      setQuestionSets: (questionSets) => set({ questionSets }),
      saveMapping: (teamQuestionSetMap) => set({ teamQuestionSetMap }),
      addSet: (questionSet) =>
        set((state) => ({ questionSets: [...state.questionSets, questionSet] })),
      updateSet: (questionSet) =>
        set((state) => ({
          questionSets: state.questionSets.map((s) => (s.id === questionSet.id ? questionSet : s)),
        })),
      deleteSet: (setId) =>
        set((state) => ({
          questionSets: state.questionSets.filter((s) => s.id !== setId),
          teamQuestionSetMap: Object.fromEntries(
            Object.entries(state.teamQuestionSetMap).map(([teamId, mappedSetId]) => [
              teamId,
              mappedSetId === setId ? null : mappedSetId,
            ]),
          ) as TeamQuestionSetMap,
        })),
    }),
    { name: "olympia-warmup-config" },
  ),
);

export const QUESTION_STATUSES: QuestionStatus[] = [
  "unanswered",
  "current",
  "correct",
  "wrong",
  "skipped",
];

export const TEAM_IDS: TeamId[] = ["team-1", "team-2", "team-3", "team-4"];