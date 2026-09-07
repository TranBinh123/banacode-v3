import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GamePhase, Team, TeamId } from "../types/game";

const phaseScores = (): Record<GamePhase, number> => ({
  warmup: 0,
  obstacle: 0,
  acceleration: 0,
  finish: 0,
});

export const TEAM_NAMES: Record<TeamId, string> = {
  "team-1": "Đội 1",
  "team-2": "Đội 2",
  "team-3": "Đội 3",
  "team-4": "Đội 4",
};

const initialTeams: Team[] = [
  { id: "team-1", name: TEAM_NAMES["team-1"], color: "#22c55e", totalScore: 0, phaseScores: phaseScores() },
  { id: "team-2", name: TEAM_NAMES["team-2"], color: "#ef4444", totalScore: 0, phaseScores: phaseScores() },
  { id: "team-3", name: TEAM_NAMES["team-3"], color: "#eab308", totalScore: 0, phaseScores: phaseScores() },
  { id: "team-4", name: TEAM_NAMES["team-4"], color: "#3b82f6", totalScore: 0, phaseScores: phaseScores() },
];

type GameStore = {
  teams: Team[];
  addScore: (teamId: TeamId, points: number, phase: GamePhase) => void;
  resetScores: () => void;
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      teams: initialTeams,
      addScore: (teamId, points, phase) =>
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id !== teamId
              ? team
              : {
                  ...team,
                  totalScore: team.totalScore + points,
                  phaseScores: {
                    ...team.phaseScores,
                    [phase]: team.phaseScores[phase] + points,
                  },
                },
          ),
        })),
      resetScores: () => set({ teams: initialTeams }),
    }),
    { name: "olympia-core-game" },
  ),
);