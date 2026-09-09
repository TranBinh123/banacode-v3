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

// Lưu trữ điểm cộng dồn thủ công từ các ngày trước
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

  // Cập nhật điểm cộng thêm cho một đội
  const updateExtraPoints = (teamId: string, points: number) => {
    const newExtra = { ...extraPoints, [teamId]: Math.max(0, (extraPoints[teamId] || 0) + points) };
    setExtraPoints(newExtra);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newExtra));
  };

  // Reset điểm cộng thêm của một đội
  const resetExtraPoints = (teamId: string) => {
    const newExtra = { ...extraPoints };
    delete newExtra[teamId];
    setExtraPoints(newExtra);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newExtra));
  };

  // Tính tổng điểm (điểm hiện tại + điểm cộng thêm)
  const getTotalScoreWithExtra = (teamId: string): number => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return 0;
    return team.totalScore + (extraPoints[teamId] || 0);
  };

  // Xếp hạng
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

  // Reset ranking
  const resetRanking = () => {
    setShowRanking(false);
    setRankingTeams([]);
  };

  // Medal colors
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
      <header className="admin-header">
        <div>
          <div className="eyebrow">ADMIN • TỔNG HỢP ĐIỂM</div>
          <h1>XẾP HẠNG CHUNG CUỘC</h1>
          <p>
            Cộng dồn điểm thủ công từ các ngày thi trước (Ngày 1, Ngày 2,...) để tính tổng điểm xếp hạng.
            Sau khi cộng đủ, bấm "Xếp hạng" để hiển thị kết quả.
          </p>
        </div>
      </header>

      <div className="ranking-grid">
        {teams.map((team) => {
          const extra = extraPoints[team.id] || 0;
          const total = getTotalScoreWithExtra(team.id);

          return (
            <div key={team.id} className="ranking-team-card" style={{ borderTopColor: team.color }}>
              <div className="ranking-team-header">
                <span className="ranking-team-color" style={{ background: team.color }} />
                <span className="ranking-team-name">{team.name}</span>
              </div>

              <div className="ranking-score-display">
                <div className="ranking-current-score">
                  <span>Điểm hôm nay</span>
                  <strong>{team.totalScore}</strong>
                </div>
                <div className="ranking-extra-score">
                  <span>Điểm cộng thêm</span>
                  <strong>{extra}</strong>
                </div>
                <div className="ranking-total-score">
                  <span>Tổng điểm</span>
                  <strong>{total}</strong>
                </div>
              </div>

              <div className="ranking-controls">
                <div className="ranking-extra-controls">
                  <button
                    className="ranking-extra-btn minus"
                    onClick={() => updateExtraPoints(team.id, -10)}
                    disabled={extra < 10}
                  >
                    −10
                  </button>
                  <button
                    className="ranking-extra-btn plus"
                    onClick={() => updateExtraPoints(team.id, 10)}
                  >
                    +10
                  </button>
                  <button
                    className="ranking-extra-btn reset"
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
            <h2>BẢNG XẾP HẠNG</h2>
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
            <div className="ranking-summary-item">
              <span>🥇 Nhất:</span>
              <strong>{rankingTeams[0]?.name}</strong>
              <span>{rankingTeams[0]?.totalScore} điểm</span>
            </div>
            <div className="ranking-summary-item">
              <span>🥈 Nhì:</span>
              <strong>{rankingTeams[1]?.name}</strong>
              <span>{rankingTeams[1]?.totalScore} điểm</span>
            </div>
            <div className="ranking-summary-item">
              <span>🥉 Ba:</span>
              <strong>{rankingTeams[2]?.name}</strong>
              <span>{rankingTeams[2]?.totalScore} điểm</span>
            </div>
            <div className="ranking-summary-item">
              <span>🎖️ Khuyến khích:</span>
              <strong>{rankingTeams[3]?.name}</strong>
              <span>{rankingTeams[3]?.totalScore} điểm</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
