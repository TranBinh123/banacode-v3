type Props = {
  disabled: boolean;
  paused: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  onSkip: () => void;
  onPause: () => void;
};

const answerTextStyle: React.CSSProperties = {
  color: "#003B4D",
  fontWeight: 900,
  textShadow: "0 1px 0 rgba(255,255,255,0.45)",
};

const scoreTextStyle: React.CSSProperties = {
  color: "#003B4D",
  fontWeight: 900,
};

export function WarmupControls({
  disabled,
  paused,
  onCorrect,
  onWrong,
  onSkip,
  onPause,
}: Props) {
  return (
    <div className="warmup-controls">
      <button
        className="answer-button correct"
        disabled={disabled}
        onClick={onCorrect}
        style={answerTextStyle}
      >
        ✓ ĐÚNG{" "}
        <span style={scoreTextStyle}>+10</span>
      </button>

      <button
        className="answer-button wrong"
        disabled={disabled}
        onClick={onWrong}
        style={answerTextStyle}
      >
        ✕ SAI{" "}
        <span style={scoreTextStyle}>0</span>
      </button>

      <button
        className="answer-button skip"
        disabled={disabled}
        onClick={onSkip}
        style={answerTextStyle}
      >
        → CHUYỂN TIẾP{" "}
        <span style={scoreTextStyle}>0</span>
      </button>

      <button
        className="pause-button"
        disabled={disabled}
        onClick={onPause}
      >
        {paused ? "▶ TIẾP TỤC" : "Ⅱ TẠM DỪNG"} <kbd>P</kbd>
      </button>
    </div>
  );
}
