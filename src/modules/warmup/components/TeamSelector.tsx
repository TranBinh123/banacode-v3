import type {
  Team,
  TeamId,
} from "../../../core/types/game";

type Props = {
  teams: Team[];
  selectedTeamId: TeamId | null;
  locked: boolean;
  disabledTeamIds?: TeamId[];
  onSelect: (teamId: TeamId) => void;
};

export function TeamSelector({
  teams,
  selectedTeamId,
  locked,
  disabledTeamIds = [],
  onSelect,
}: Props) {
  return (
    <section className="warmup-team-selection">
      <div className="section-label">
        CHỌN ĐỘI THI
      </div>

      <div className="team-selector">
        {teams.map((team, index) => {
          const alreadyPlayed =
            disabledTeamIds.includes(
              team.id,
            );

          const disabled =
            locked || alreadyPlayed;

          return (
            <button
              key={team.id}
              className={`team-select team-${
                index + 1
              } ${
                selectedTeamId === team.id
                  ? "selected"
                  : ""
              } ${
                alreadyPlayed
                  ? "played"
                  : ""
              }`}
              disabled={disabled}
              onClick={() =>
                onSelect(team.id)
              }
            >
              <span>
                {index + 1}
              </span>

              <strong>
                {team.name}
              </strong>

              <small>
                {alreadyPlayed
                  ? "ĐÃ THI"
                  : selectedTeamId ===
                        team.id &&
                      locked
                    ? "ĐANG THI"
                    : "CHỌN ĐỘI"}
              </small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
