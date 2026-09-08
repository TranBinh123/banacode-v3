import type {
  GamePhase,
  Team,
} from "../core/types/game";
import { useGameStore } from "../core/store/gameStore";

type Props = {
  teams: Team[];
  allowManualAdjust?: boolean;
  phase?: GamePhase;
};

export function Scoreboard({
  teams,
  allowManualAdjust = false,
  phase = "warmup",
}: Props) {
  const addScore =
    useGameStore(
      (state) => state.addScore,
    );

  return (
    <section className="scoreboard">
      <div className="section-label">
        BẢNG ĐIỂM CỘNG DỒN
      </div>

      <div className="score-grid">
        {teams.map((team) => {
          const canSubtract =
            team.phaseScores[phase] >= 10;

          return (
            <article
              key={team.id}
              className="score-card"
              style={{
                borderTopColor:
                  team.color,
              }}
            >
              <div className="score-team">
                {team.name}
              </div>

              <div className="score-value">
                {team.totalScore}
              </div>

              <div className="score-phase">
                V1{" "}
                {team.phaseScores.warmup}
                {" • "}
                V2{" "}
                {team.phaseScores.obstacle}
                {" • "}
                V3{" "}
                {team.phaseScores.acceleration}
                {" • "}
                V4{" "}
                {team.phaseScores.finish}
              </div>

              {allowManualAdjust && (
                <div className="manual-score-controls">
                  <div className="manual-score-label">
                    ĐIỀU CHỈNH ĐIỂM V1
                  </div>

                  <button
                    type="button"
                    className="manual-score-button minus"
                    disabled={
                      !canSubtract
                    }
                    aria-label={`Trừ 10 điểm cho ${team.name}`}
                    onClick={() =>
                      addScore(
                        team.id,
                        -10,
                        phase,
                      )
                    }
                  >
                    −
                    <span>
                      10
                    </span>
                  </button>

                  <button
                    type="button"
                    className="manual-score-button plus"
                    aria-label={`Cộng 10 điểm cho ${team.name}`}
                    onClick={() =>
                      addScore(
                        team.id,
                        10,
                        phase,
                      )
                    }
                  >
                    +
                    <span>
                      10
                    </span>
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
