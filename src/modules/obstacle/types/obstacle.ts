import type { TeamId } from "../../../core/types/game";

export type ObstacleClueStatus = "available" | "active" | "solved" | "missed" | "audience-active" | "audience-solved" | "audience-missed";
export type ObstaclePhase = "teams" | "audience" | "finished";

export type ObstacleClue = {
  id: string;
  order: number;
  question: string;
  answer: string;
  x: number;
  y: number;
  verticalIndex: number;
};

export type ObstaclePuzzle = {
  id: string;
  name: string;
  phase: "obstacle";
  verticalAnswer: string;
  /** Absolute column (0-based) used by the vertical answer. Backward compatible with old configs. */
  verticalColumn?: number;
  clues: ObstacleClue[];
  timeLimitSeconds: number;
  horizontalPoints: number;
  verticalPoints: number;
};

export type TeamAnswer = "correct" | "wrong" | "unanswered";
export type TeamAnswerMap = Record<TeamId, TeamAnswer>;
