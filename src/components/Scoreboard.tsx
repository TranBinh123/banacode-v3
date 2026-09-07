import type { Team } from "../core/types/game";

export function Scoreboard({ teams }: { teams: Team[] }) {
  return (
    <section className="scoreboard">
      <div className="section-label">BẢNG ĐIỂM</div>
      <div className="score-grid">
        {teams.map((team) => (
          <article key={team.id} className="score-card" style={{ borderTopColor: team.color }}>
            <div className="score-team">{team.name}</div>
            <div className="score-value">{team.totalScore}</div>
            <div className="score-phase">Khởi động: {team.phaseScores.warmup}</div>
          </article>
        ))}
      </div>
    </section>
  );
}