import { useCallback, useEffect, useMemo, useState } from "react";
import { addScore } from "../../../core/scoring/scoring";
import { useGameStore } from "../../../core/store/gameStore";
import type { TeamId } from "../../../core/types/game";
import { Scoreboard } from "../../../components/Scoreboard";
import { useObstacleStore } from "../store/obstacleStore";
import type {
  ObstacleClueStatus,
  ObstaclePhase,
  TeamAnswerMap,
} from "../types/obstacle";

const TEAM_IDS: TeamId[] = ["team-1", "team-2", "team-3", "team-4"];

const CELL_STEP_X = 40;
const ROW_CELL_OFFSET_X = 36;
const ROW_STEP_Y = 64;
const BOARD_LEFT = 72;
const BOARD_TOP = 16;

const teamShort = (name: string) =>
  name.replace("BAN DO GIÁM ĐỐC QUẢN LÝ", "BAN GĐ QUẢN LÝ");

const emptyAnswers = (): TeamAnswerMap => ({
  "team-1": "unanswered",
  "team-2": "unanswered",
  "team-3": "unanswered",
  "team-4": "unanswered",
});

export function ObstaclePage() {
  const teams = useGameStore((s) => s.teams);
  const { puzzles } = useObstacleStore();
  const puzzle = puzzles[0];

  const [phase, setPhase] = useState<ObstaclePhase>("teams");
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    puzzle?.timeLimitSeconds ?? 60,
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const [statusMap, setStatusMap] = useState<
    Record<string, ObstacleClueStatus>
  >({});
  const [answers, setAnswers] = useState<TeamAnswerMap>(emptyAnswers);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [verticalSolved, setVerticalSolved] = useState(false);
  const [verticalModal, setVerticalModal] = useState(false);
  const [verticalTeam, setVerticalTeam] = useState<TeamId | null>(null);
  const [verticalResultOpen, setVerticalResultOpen] = useState(false);
  const [verticalAwarded, setVerticalAwarded] = useState(false);

  const selectedClue = puzzle?.clues.find(
    (clue) => clue.id === selectedClueId,
  );

  const sortedClues = useMemo(
    () => [...(puzzle?.clues ?? [])].sort((a, b) => a.order - b.order),
    [puzzle],
  );

  const verticalLetters = useMemo(() => {
    if (!puzzle) return [];

    const letters = puzzle.verticalAnswer.replace(/\s/g, "").split("");

    const rows = [...puzzle.clues].sort(
      (a, b) => a.y - b.y || a.order - b.order,
    );

    return letters.map((char, index) => ({
      char,
      clue: rows[index],
      index,
    }));
  }, [puzzle]);

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timerRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && timerRunning) {
      setTimerRunning(false);
    }
  }, [secondsLeft, timerRunning]);

  const openClue = useCallback(
    (id: string) => {
      if (phase === "finished") return;

      const current = statusMap[id];

      const allowed =
        phase === "teams"
          ? current === undefined || current === "available"
          : current === undefined ||
            current === "available" ||
            current === "active" ||
            current === "missed" ||
            current === "audience-missed";

      if (!allowed) return;

      setSelectedClueId(id);
      setQuestionOpen(true);
      setSecondsLeft(puzzle?.timeLimitSeconds ?? 60);
      setTimerRunning(true);

      setStatusMap((map) => ({
        ...map,
        [id]:
          phase === "audience"
            ? "audience-active"
            : "active",
      }));

      setAnswers(emptyAnswers());
    },
    [phase, statusMap, puzzle?.timeLimitSeconds],
  );

  const finishQuestion = useCallback(
    (mode: "solve" | "miss") => {
      if (!selectedClueId) return;

      setTimerRunning(false);
      setQuestionOpen(false);

      setStatusMap((map) => ({
        ...map,
        [selectedClueId]:
          mode === "solve"
            ? phase === "audience"
              ? "audience-solved"
              : "solved"
            : phase === "audience"
              ? "audience-missed"
              : "missed",
      }));
    },
    [selectedClueId, phase],
  );

  const awardHorizontal = useCallback(() => {
    if (!selectedClue || !puzzle) return;

    TEAM_IDS.forEach((teamId) => {
      if (
        answers[teamId] === "correct" &&
        phase === "teams"
      ) {
        addScore(
          teamId,
          puzzle.horizontalPoints,
          "obstacle",
        );
      }
    });

    finishQuestion("solve");
  }, [
    selectedClue,
    puzzle,
    answers,
    phase,
    finishQuestion,
  ]);

  const markNoTeamCorrect = useCallback(
    () => finishQuestion("miss"),
    [finishQuestion],
  );

  const enterAudience = useCallback(() => {
    setPhase("audience");
    setQuestionOpen(false);
    setTimerRunning(false);
    setSelectedClueId(null);
    setAnswers(emptyAnswers());

    setStatusMap((map) => {
      const next = { ...map };

      Object.keys(next).forEach((id) => {
        if (next[id] === "active") {
          next[id] = "available";
        }
      });

      return next;
    });
  }, []);

  const startVertical = () => {
    setVerticalModal(true);
    setVerticalTeam(null);
  };

  const resolveVertical = (correct: boolean) => {
    setVerticalModal(false);

    if (!correct || !verticalTeam || !puzzle) return;

    if (!verticalAwarded) {
      addScore(
        verticalTeam,
        puzzle.verticalPoints,
        "obstacle",
      );
    }

    setVerticalAwarded(true);
    setVerticalSolved(true);
    setVerticalResultOpen(true);
  };

  const resetGame = () => {
    setPhase("teams");
    setSelectedClueId(null);
    setQuestionOpen(false);
    setTimerRunning(false);
    setSecondsLeft(puzzle?.timeLimitSeconds ?? 60);
    setStatusMap({});
    setVerticalSolved(false);
    setVerticalAwarded(false);
    setVerticalResultOpen(false);
    setVerticalModal(false);
    setVerticalTeam(null);
    setAnswers(emptyAnswers());
  };

  if (!puzzle) {
    return (
      <main className="game-page">
        <div className="ready-panel">
          <h2>Chưa có bộ ô chữ</h2>
          <p>Vào Admin Part 2 để tạo bộ ô chữ.</p>
        </div>
      </main>
    );
  }

  const timerText = `${String(
    Math.floor(secondsLeft / 60),
  ).padStart(2, "0")}:${String(
    secondsLeft % 60,
  ).padStart(2, "0")}`;

  const isAudienceActive = selectedClue
    ? statusMap[selectedClue.id] === "audience-active"
    : false;

  return (
    <main className="game-page obstacle-game">
      <header className="game-header obstacle-header">
        <div>
          <div className="eyebrow">
            GAME SHOW • VÒNG 2
          </div>

          <h1>VƯỢT CHƯỚNG NGẠI VẬT</h1>
        </div>

        <div
          className={`timer ${
            secondsLeft <= 10 && timerRunning
              ? "danger"
              : ""
          }`}
        >
          {timerText}
        </div>
      </header>

      <div className="scoreboard-toggle-row">
        <button
          className="ghost-button scoreboard-toggle"
          onClick={() =>
            setShowScoreboard((value) => !value)
          }
        >
          {showScoreboard
            ? "ẨN BẢNG ĐIỂM"
            : "BẢNG ĐIỂM"}
        </button>
      </div>

      {showScoreboard && (
        <div className="scoreboard-collapsible">
          <Scoreboard teams={teams} />
        </div>
      )}

      <section className="obstacle-stage">
        <div className="stage-toolbar">
          <div>
            <span className="section-label">
              {phase === "audience"
                ? "🎤 PHẦN THI KHÁN GIẢ"
                : "BẢNG Ô CHỮ"}
            </span>

            <small>
              {verticalSolved
                ? " • HÀNG DỌC ĐÃ ĐƯỢC GIẢI"
                : ""}
            </small>
          </div>

          <div className="stage-actions">
            <button
              className="vertical-button"
              onClick={startVertical}
              disabled={
                verticalSolved ||
                phase === "finished"
              }
            >
              ↕ HÀNG DỌC
            </button>

            {phase === "teams" && (
              <button
                className="audience-button"
                onClick={enterAudience}
              >
                🎤 CHUYỂN SANG KHÁN GIẢ
              </button>
            )}

            {phase === "audience" && (
              <button
                className="primary-button"
                onClick={() =>
                  setPhase("finished")
                }
              >
                KẾT THÚC
              </button>
            )}

            {phase === "finished" && (
              <button
                className="primary-button"
                onClick={resetGame}
              >
                ↻ VÁN MỚI
              </button>
            )}
          </div>
        </div>

        <div className="puzzle-board">
          {/*
            HÀNG DỌC ĐƯỢC ĐẶT TRỰC TIẾP TRÊN Ô GIAO.

            Không tính một "verticalColumn" độc lập nữa.
            Mỗi chữ lấy chính clue.x + clue.verticalIndex
            của hàng ngang tương ứng.

            Công thức này dùng cùng CELL_STEP_X và
            ROW_CELL_OFFSET_X với hàng ngang nên hai ô
            có cùng tọa độ tuyệt đối.
          */}
          <div className="vertical-answer">
            {verticalLetters.map(
              ({ char, clue, index }) => {
                if (!clue) return null;

                const crossingLeft =
                  BOARD_LEFT +
                  clue.x * CELL_STEP_X +
                  ROW_CELL_OFFSET_X +
                  clue.verticalIndex *
                    CELL_STEP_X;

                const crossingTop =
                  BOARD_TOP +
                  clue.y * ROW_STEP_Y;

                return (
                  <span
                    key={`${clue.id}-${index}`}
                    className={
                      verticalSolved
                        ? "revealed"
                        : "hidden-letter"
                    }
                    style={{
                      left: `${crossingLeft}px`,
                      top: `${crossingTop}px`,
                    }}
                  >
                    {verticalSolved
                      ? char
                      : ""}
                  </span>
                );
              },
            )}
          </div>

          {sortedClues.map((clue) => {
            const status =
              statusMap[clue.id] ??
              "available";

            const isVisible =
              status === "solved" ||
              status ===
                "audience-solved";

            const isDim =
              status === "missed" ||
              status ===
                "audience-missed";

            const canOpen =
              phase === "teams"
                ? status === "available"
                : status ===
                      "available" ||
                    status ===
                      "active" ||
                    status ===
                      "missed" ||
                    status ===
                      "audience-missed";

            const letters = clue.answer
              .replace(/\s/g, "")
              .split("");

            return (
              <button
                key={clue.id}
                className={`puzzle-row ${
                  isVisible
                    ? "solved"
                    : ""
                } ${
                  isDim
                    ? "dimmed"
                    : ""
                } ${
                  status === "active" ||
                  status ===
                    "audience-active"
                    ? "active"
                    : ""
                }`}
                style={{
                  left:
                    clue.x *
                      CELL_STEP_X +
                    BOARD_LEFT,
                  top:
                    clue.y *
                      ROW_STEP_Y +
                    BOARD_TOP,
                }}
                disabled={!canOpen}
                onClick={() =>
                  openClue(clue.id)
                }
                title={`Hàng ngang ${clue.order}`}
              >
                <b>
                  {String(
                    clue.order,
                  ).padStart(2, "0")}
                </b>

                <span className="cells">
                  {letters.map(
                    (
                      letter,
                      index,
                    ) => (
                      <i
                        key={index}
                        className="cell"
                      >
                        {isVisible
                          ? letter
                          : ""}
                      </i>
                    ),
                  )}
                </span>
              </button>
            );
          })}

          {phase === "finished" && (
            <div className="finished-overlay">
              <div>🏁</div>

              <strong>
                HOÀN THÀNH Ô CHỮ
              </strong>

              <button
                className="primary-button"
                onClick={resetGame}
              >
                CHƠI VÁN MỚI
              </button>
            </div>
          )}
        </div>
      </section>

      {questionOpen &&
        selectedClue && (
          <div className="stage-modal">
            <section className="question-stage-card">
              <div className="eyebrow">
                HÀNG NGANG{" "}
                {String(
                  selectedClue.order,
                ).padStart(2, "0")}
                {isAudienceActive
                  ? " • KHÁN GIẢ"
                  : ""}
              </div>

              <div className="big-timer">
                {timerText}
              </div>

              <h2>
                {selectedClue.question ||
                  "Chưa nhập câu hỏi"}
              </h2>

              <button
                className="primary-button"
                onClick={() =>
                  setTimerRunning(
                    (value) => !value,
                  )
                }
              >
                {timerRunning
                  ? "Ⅱ TẠM DỪNG"
                  : "▶ TIẾP TỤC"}
              </button>

              <button
                className="ghost-button modal-close"
                onClick={() => {
                  setTimerRunning(false);
                  setQuestionOpen(false);
                }}
              >
                QUAY LẠI BẢNG Ô CHỮ
              </button>
            </section>
          </div>
        )}

      {!questionOpen &&
        selectedClue &&
        (statusMap[
          selectedClue.id
        ] === "active" ||
          statusMap[
            selectedClue.id
          ] ===
            "audience-active") && (
          <section className="grading-panel">
            <div className="grading-head">
              <div>
                <div className="eyebrow">
                  {isAudienceActive
                    ? "KHÁN GIẢ • XÁC NHẬN ĐÁP ÁN"
                    : "XÁC NHẬN CÂU HỎI"}
                </div>

                <h2>
                  “{selectedClue.question}”
                </h2>
              </div>

              <div className="grading-answer">
                ĐÁP ÁN
                <br />
                <strong>
                  {selectedClue.answer}
                </strong>
              </div>
            </div>

            {!isAudienceActive && (
              <div className="team-grade-grid">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    className={`team-grade ${
                      answers[
                        team.id
                      ] === "correct"
                        ? "correct"
                        : ""
                    }`}
                    onClick={() =>
                      setAnswers(
                        (map) => ({
                          ...map,
                          [team.id]:
                            map[
                              team.id
                            ] ===
                            "correct"
                              ? "unanswered"
                              : "correct",
                        }),
                      )
                    }
                  >
                    <span
                      style={{
                        background:
                          team.color,
                      }}
                    />

                    <strong>
                      {teamShort(
                        team.name,
                      )}
                    </strong>

                    <b>
                      {answers[
                        team.id
                      ] === "correct"
                        ? `✓ +${puzzle.horizontalPoints}`
                        : "CHƯA TICK"}
                    </b>
                  </button>
                ))}
              </div>
            )}

            <div className="grading-actions">
              {isAudienceActive ? (
                <>
                  <button
                    className="answer-button correct"
                    onClick={() =>
                      finishQuestion(
                        "solve",
                      )
                    }
                  >
                    ＋ ĐÚNG / REVEAL
                  </button>

                  <button
                    className="answer-button wrong"
                    onClick={() =>
                      finishQuestion(
                        "miss",
                      )
                    }
                  >
                    − KHÔNG ĐÚNG / LÀM MỜ
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="answer-button correct"
                    onClick={
                      awardHorizontal
                    }
                  >
                    ＋ ĐÚNG / REVEAL
                  </button>

                  <button
                    className="answer-button wrong"
                    onClick={
                      markNoTeamCorrect
                    }
                  >
                    − KHÔNG AI ĐÚNG / LÀM MỜ
                  </button>
                </>
              )}
            </div>
          </section>
        )}

      {verticalModal && (
        <div className="stage-modal">
          <section className="vertical-stage-card">
            <div className="eyebrow">
              ĐOÁN Ô CHỮ HÀNG DỌC
            </div>

            <h2>
              {puzzle.verticalAnswer
                .replace(/\s/g, "")
                .split("")
                .map(() => "_ ")
                .join("")}
            </h2>

            <div className="team-grade-grid">
              {teams.map((team) => (
                <button
                  key={team.id}
                  className={`team-grade ${
                    verticalTeam ===
                    team.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setVerticalTeam(
                      team.id,
                    )
                  }
                >
                  <span
                    style={{
                      background:
                        team.color,
                    }}
                  />

                  <strong>
                    {teamShort(
                      team.name,
                    )}
                  </strong>

                  <b>
                    {verticalTeam ===
                    team.id
                      ? "ĐANG TRẢ LỜI"
                      : "CHỌN ĐỘI"}
                  </b>
                </button>
              ))}
            </div>

            <div className="grading-actions">
              <button
                className="answer-button correct"
                disabled={!verticalTeam}
                onClick={() =>
                  resolveVertical(true)
                }
              >
                ✓ CHÍNH XÁC / +
                {puzzle.verticalPoints}
              </button>

              <button
                className="answer-button wrong"
                onClick={() =>
                  resolveVertical(false)
                }
              >
                − BỎ QUA
              </button>
            </div>
          </section>
        </div>
      )}

      {verticalResultOpen && (
        <div className="stage-modal">
          <section className="vertical-win-card">
            <div className="eyebrow">
              CHÍNH XÁC!
            </div>

            <h2>
              {puzzle.verticalAnswer}
            </h2>

            <p>
              {verticalTeam
                ? teams.find(
                    (team) =>
                      team.id ===
                      verticalTeam,
                  )?.name
                : ""}{" "}
              +{puzzle.verticalPoints} điểm
            </p>

            <button
              className="primary-button"
              onClick={() =>
                setVerticalResultOpen(
                  false,
                )
              }
            >
              TIẾP TỤC
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
