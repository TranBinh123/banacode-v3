import type { Team, TeamId } from "../../../core/types/game";

type Props = {
  teams: Team[];
  selectedTeamId: TeamId | null;
  locked: boolean;
  onSelect: (teamId: TeamId) => void;
};

export function TeamSelector({ teams, selectedTeamId, locked, onSelect }: Props) {
  return (
    <section>
      <div className="section-label">CHỌN ĐỘI THI</div>
      <div className="team-selector">
        {teams.map((team, index) => (
          <button
            key={team.id}
            className={`team-select team-${index + 1} ${selectedTeamId === team.id ? "selected" : ""}`}
            disabled={locked}
            onClick={() => onSelect(team.id)}
          >
            <span>{index + 1}</span>
            <strong>{team.name}</strong>
            <small>{locked && selectedTeamId === team.id ? "ĐANG THI" : "Chọn đội"}</small>
          </button>
        ))}
      </div>
    </section>
  );
}