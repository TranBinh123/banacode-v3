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

const STORAGE_KEY = "olympia-ranking-extra-points";

export function RankingAdmin() {
  const teams = useGameStore((state) => state.teams);
  const [extraPoints, setExtraPoints] = useState<Record<string, number>>(() => {
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

  const [showRanking, setShowRanking] = useState(false);
  const [rankingTeams, setRankingTeams] = useState<TeamWithRank[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const initial: Record<string, string> = {};
        Object.keys(parsed).forEach((key) => {
          initial[key] = parsed[key].toString();
        });
        return initial;
      } catch {
        return {};
      }
    }
    return {};
  });

  const setExtraPointsDirect = (teamId: string, value: number) => {
    const newValue = Math.max(0, value);
    const newExtra = { ...extraPoints, [teamId]: newValue };
    setExtraPoints(newExtra);
    setInputValues((prev) => ({ ...prev, [teamId]: newValue.toString() }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newExtra));
  };

  const resetExtraPoints = (teamId: string) => {
    const newExtra = { ...extraPoints };
    delete newExtra[teamId];
    setExtraPoints(newExtra);
    setInputValues((prev) => {
      const newInput = { ...prev };
      delete newInput[teamId];
      return newInput;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newExtra));
  };

  const getTotalScoreWithExtra = (teamId: string): number => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return 0;
    return team.totalScore + (extraPoints[teamId] || 0);
  };

  const calculateRanking = () => {
    const ranked = teams
      .map((team) => ({
        ...team,
        totalScore: getTotalScoreWithExtra(team.id),
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
        </div>
      </header>

      <div className="ranking-grid">
        {teams.map((team) => {
          const extra = extraPoints[team.id] || 0;
          const total = getTotalScoreWithExtra(team.id);
          const inputValue = inputValues[team.id] || extra.toString();

          return (
            <div key={team.id} className="ranking-team-card" style={{ borderTopColor: team.color }}>
              <div className="ranking-team-header">
                <span className="ranking-team-color" style={{ background: team.color }} />
                <span className="ranking-team-name">{team.name}</span>
              </div>

              <div className="ranking-score-display">
                <div className="ranking-score-item">
                  <span>Điểm hôm nay</span>
                  <strong>{team.totalScore}</strong>
                </div>
                <div className="ranking-score-item">
                  <span>Điểm cộng thêm</span>
                  <strong className="extra-points">{extra}</strong>
                </div>
                <div className="ranking-score-item total">
                  <span>Tổng điểm</span>
                  <strong>{total}</strong>
                </div>
              </div>

              <div className="ranking-controls">
                <div className="ranking-input-group">
                  <input
                    type="number"
                    className="ranking-input"
                    value={inputValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputValues((prev) => ({ ...prev, [team.id]: val }));
                    }}
                    placeholder="Nhập điểm"
                    step="0.5"
                    min="0"
                  />
                  <button
                    className="ranking-btn set"
                    onClick={() => {
                      const val = parseFloat(inputValue);
                      if (!isNaN(val) && val >= 0) {
                        setExtraPointsDirect(team.id, val);
                      }
                    }}
                  >
                    Cập nhật
                  </button>
                  <button
                    className="ranking-btn reset"
                    onClick={() => resetExtraPoints(team.id)}
                    disabled={extra === 0}
                  >
                    Reset
                  </button>
                </div>
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

          <div className="ranking-summary">
            <div className="ranking-summary-item gold">
              <span>🥇 Nhất</span>
              <strong>{rankingTeams[0]?.name}</strong>
              <span>{rankingTeams[0]?.totalScore} điểm</span>
            </div>
            <div className="ranking-summary-item silver">
              <span>🥈 Nhì</span>
              <strong>{rankingTeams[1]?.name}</strong>
              <span>{rankingTeams[1]?.totalScore} điểm</span>
            </div>
            <div className="ranking-summary-item bronze">
              <span>🥉 Ba</span>
              <strong>{rankingTeams[2]?.name}</strong>
              <span>{rankingTeams[2]?.totalScore} điểm</span>
            </div>
            <div className="ranking-summary-item fourth">
              <span>🎖️ Khuyến khích</span>
              <strong>{rankingTeams[3]?.name}</strong>
              <span>{rankingTeams[3]?.totalScore} điểm</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
