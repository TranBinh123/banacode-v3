type Props = {
  disabled: boolean;
  paused: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  onSkip: () => void;
  onPause: () => void;
};

const darkText = {
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
        style={darkText}
      >
        ✓ ĐÚNG <span style={darkText}>+10</span>
      </button>

      <button
        className="answer-button wrong"
        disabled={disabled}
        onClick={onWrong}
        style={darkText}
      >
        ✕ SAI <span style={darkText}>0</span>
      </button>

      <button
        className="answer-button skip"
        disabled={disabled}
        onClick={onSkip}
        style={darkText}
      >
        → CHUYỂN TIẾP <span style={darkText}>0</span>
      </button>

      <button
        className="pause-button"
        disabled={disabled}
        onClick={onPause}
      >
        {paused ? "▶ TIẾP TỤC" : "Ⅱ TẠM DỪNG"}{" "}
        <kbd>P</kbd>
      </button>
    </div>
  );
}
