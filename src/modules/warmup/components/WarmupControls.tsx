type Props = {
  disabled: boolean;
  paused: boolean;
  onCorrect: () => void;
  onWrong: () => void;
  onSkip: () => void;
  onPause: () => void;
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
      <button className="answer-button correct" disabled={disabled} onClick={onCorrect}>
        ✓ ĐÚNG <span>+10</span>
      </button>
      <button className="answer-button wrong" disabled={disabled} onClick={onWrong}>
        ✕ SAI <span>0</span>
      </button>
      <button className="answer-button skip" disabled={disabled} onClick={onSkip}>
        → CHUYỂN TIẾP <span>0</span>
      </button>
      <button className="pause-button" disabled={disabled} onClick={onPause}>
        {paused ? "▶ TIẾP TỤC" : "Ⅱ TẠM DỪNG"} <kbd>P</kbd>
      </button>
    </div>
  );
}