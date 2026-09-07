export type GamePhase = "warmup" | "obstacle" | "acceleration" | "finish";

export type TeamId = "team-1" | "team-2" | "team-3" | "team-4";

export type Team = {
  id: TeamId;
  name: string;
  color: string;
  totalScore: number;
  phaseScores: Record<GamePhase, number>;
};