import type { TeamId } from "../../../core/types/game";

export type QuestionStatus =
  | "unanswered"
  | "current"
  | "correct"
  | "wrong"
  | "skipped";

export type WarmupQuestion = {
  id: string;
  setId: string;
  order: number;
  question: string;
};

export type QuestionSet = {
  id: string;
  name: string;
  phase: "warmup";
  questions: WarmupQuestion[];
};

export type TeamQuestionSetMap = Record<TeamId, string | null>;