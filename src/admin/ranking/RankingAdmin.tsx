import { useState } from "react";
import { useGameStore } from "../../core/store/gameStore";

type TeamWithRank = {
  id: string;
  name: string;
  color: string;
  totalScore: number;
  rank: number;
  medal: string;
};

const STORAGE_KEY = "olympia-ranking-scores";

export function RankingAdmin() {
  const teams = useGameStore((state) => state.teams);

  const [scores, setScores] = useState<Record<string, { round1: number; round2: number }>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  const [inputValues, setInputValues] = useState<Record<string, { round1: string; round2: string }>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const initial: Record<string, { round1: string; round2: string }> = {};
        Object.keys(parsed).forEach((key) => {
          initial[key] = {
            round1: parsed[key].round1?.toString() || "0",
            round2: parsed[key].round2?.toString() || "0",
          };
        });
        return initial;
      } catch {
        return {};
      }
    }
    return {};
  });

  const [showRanking, setShowRanking] = useState(false);
  const [rankingTeams, setRankingTeams] = useState<TeamWithRank[]>([]);

  const updateScore = (teamId: string, round: 'round1' | 'round2', value: number) => {
    const current = scores[teamId] || { round1: 0, round2: 0 };
    const newValue = Math.max(0, value);
    const newScores = {
      ...scores,
      [teamId]: {
        ...current,
        [round]: newValue,
      },
    };
    setScores(newScores);
    setInputValues((prev) => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || { round1: "0", round2: "0" }),
        [round]: newValue.toString(),
      },
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newScores));
  };

  const resetScores = (teamId: string) => {
    const newScores = { ...scores };
    delete newScores[teamId];
    setScores(newScores);
    setInputValues((prev) => {
      const newInput = { ...prev };
      delete newInput[teamId];
      return newInput;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newScores));
  };

  const getTotalScore = (teamId: string): number => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return 0;
    const round1 = scores[teamId]?.round1 || 0;
    const round2 = scores[teamId]?.round2 || 0;
    const round3 = team.totalScore;
    return round1 + round2 + round3;
  };

  const getRoundScores = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return {
      round1: scores[teamId]?.round1 || 0,
      round2: scores[teamId]?.round2 || 0,
      round3: team?.totalScore || 0,
    };
  };

  const calculateRanking = () => {
    const ranked = teams
      .map((team) => ({
        ...team,
        totalScore: getTotalScore(team.id),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    const medals = ["🥇", "🥈", "🥉", "🎖️"];
    const result = ranked.map((team, index) => ({
      ...team,
      rank: index + 1,
      medal: medals[index] || "🎖️",
    }));

    setRankingTeams(result);
    setShowRanking(true);
  };

  const resetRanking = () => {
    setShowRanking(false);
    setRankingTeams([]);
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "#FFD700";
      case 2:
        return "#C0C0C0";
      case 3:
        return "#CD7F32";
      default:
        return "#8A9BA8";
    }
  };

  return (
    <main className="admin-page ranking-admin">
      <div className="ranking-background">
        <div className="ranking-flower-left">🌷</div>
        <div className="ranking-flower-right">🌷</div>
        <div className="ranking-flower-center">🌷</div>
      </div>

      <header className="admin-header ranking-header">
        <div>
          <div className="eyebrow">🏆 ADMIN • TỔNG HỢP ĐIỂM</div>
          <h1>XẾP HẠNG CHUNG CUỘC</h1>
          <p>
            Tổng điểm sẽ được tính bằng tổng số điểm các Đội đã giành được sau 3 vòng thi: Khám Phá - Lên Cáp & Chạm Đỉnh
          </p>
        </div>
      </header>

      <div className="ranking-grid">
        {teams.map((team) => {
          const roundScores = getRoundScores(team.id);
          const total = getTotalScore(team.id);
          const inputVals = inputValues[team.id] || { round1: "0", round2: "0" };

          return (
            <div key={team.id} className="ranking-team-card" style={{ borderTopColor: team.color }}>
              <div className="ranking-team-header">
                <span className="ranking-team-color" style={{ background: team.color }} />
                <span className="ranking-team-name">{team.name}</span>
              </div>

              <div className="ranking-score-display">
                <div className="ranking-score-item">
                  <span>Khám phá</span>
                  <input
                    type="number"
                    className="ranking-score-input"
                    value={inputVals.round1}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputValues((prev) => ({
                        ...prev,
                        [team.id]: { ...(prev[team.id] || { round1: "0", round2: "0" }), round1: val },
                      }));
                    }}
                    onBlur={() => {
                      const val = parseFloat(inputVals.round1);
                      if (!isNaN(val) && val >= 0) {
                        updateScore(team.id, 'round1', val);
                      }
                    }}
                    placeholder="0"
                    step="0.1"
                    min="0"
                  />
                </div>

                <div className="ranking-score-item">
                  <span>Lên cáp</span>
                  <input
                    type="number"
                    className="ranking-score-input"
                    value={inputVals.round2}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputValues((prev) => ({
                        ...prev,
                        [team.id]: { ...(prev[team.id] || { round1: "0", round2: "0" }), round2: val },
                      }));
                    }}
                    onBlur={() => {
                      const val = parseFloat(inputVals.round2);
                      if (!isNaN(val) && val >= 0) {
                        updateScore(team.id, 'round2', val);
                      }
                    }}
                    placeholder="0"
                    step="0.1"
                    min="0"
                  />
                </div>

                <div className="ranking-score-item highlight">
                  <span>Chạm đỉnh</span>
                  <strong className="round3-score">{roundScores.round3}</strong>
                </div>

                <div className="ranking-score-item total">
                  <span>Tổng điểm</span>
                  <strong>{total}</strong>
                </div>
              </div>

              <div className="ranking-controls">
                <button
                  className="ranking-btn reset"
                  onClick={() => resetScores(team.id)}
                  disabled={!scores[team.id] || (scores[team.id]?.round1 === 0 && scores[team.id]?.round2 === 0)}
                >
                  Reset điểm
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ranking-actions">
        <button className="primary-button ranking-calculate" onClick={calculateRanking}>
          🏆 XẾP HẠNG
        </button>
        <button className="ghost-button" onClick={resetRanking}>
          ẨN KẾT QUẢ
        </button>
      </div>

      {showRanking && (
        <div className="ranking-result">
          <div className="ranking-result-header">
            <div className="eyebrow">KẾT QUẢ CHUNG CUỘC</div>
            <h2>🏆 BẢNG XẾP HẠNG</h2>
          </div>

          <div className="ranking-podium">
            {rankingTeams.map((team, index) => (
              <div
                key={team.id}
                className={`ranking-item rank-${team.rank}`}
                style={{
                  animationDelay: `${index * 0.15}s`,
                  borderColor: getMedalColor(team.rank),
                }}
              >
                <div className="ranking-item-medal">{team.medal}</div>
                <div className="ranking-item-rank">#{team.rank}</div>
                <div className="ranking-item-name" style={{ color: team.color }}>
                  {team.name}
                </div>
                <div className="ranking-item-score">{team.totalScore}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
