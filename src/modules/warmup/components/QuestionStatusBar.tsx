import type { QuestionStatus } from "../types/warmup";

type Props = {
  statuses: QuestionStatus[];
  currentIndex: number;
};

const symbol: Record<QuestionStatus, string> = {
  unanswered: "",
  current: "●",
  correct: "✓",
  wrong: "✕",
  skipped: "→",
};

export function QuestionStatusBar({ statuses, currentIndex }: Props) {
  return (
    <div className="status-row">
      {statuses.map((status, index) => (
        <div
          key={index}
          className={`status-cell status-${status} ${index === currentIndex ? "active" : ""}`}
          title={`Câu ${index + 1}: ${status}`}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <b>{symbol[status]}</b>
        </div>
      ))}
    </div>
  );
}