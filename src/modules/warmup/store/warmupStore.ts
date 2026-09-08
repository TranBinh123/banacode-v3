import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../core/types/game";
import type { QuestionSet, QuestionStatus } from "../types/warmup";
import { DEFAULT_QUESTION_SETS } from "../data/defaultQuestionSets";

type WarmupStore = {
  questionSets: QuestionSet[];

  setQuestionSets: (sets: QuestionSet[]) => void;
  addSet: (set: QuestionSet) => void;
  updateSet: (set: QuestionSet) => void;
  deleteSet: (setId: string) => void;
};

export const useWarmupStore = create<WarmupStore>()(
  persist(
    (set) => ({
      questionSets: DEFAULT_QUESTION_SETS,

      setQuestionSets: (questionSets) =>
        set({ questionSets }),

      addSet: (questionSet) =>
        set((state) => ({
          questionSets: [
            ...state.questionSets,
            questionSet,
          ],
        })),

      updateSet: (questionSet) =>
        set((state) => ({
          questionSets: state.questionSets.map(
            (item) =>
              item.id === questionSet.id
                ? questionSet
                : item,
          ),
        })),

      deleteSet: (setId) =>
        set((state) => ({
          questionSets: state.questionSets.filter(
            (item) => item.id !== setId,
          ),
        })),
    }),
    {
      name: "olympia-warmup-config",
    },
  ),
);

export const QUESTION_STATUSES: QuestionStatus[] = [
  "unanswered",
  "current",
  "correct",
  "wrong",
  "skipped",
];

export const TEAM_IDS: TeamId[] = [
  "team-1",
  "team-2",
  "team-3",
  "team-4",
];
