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

const TEAM_IDS: TeamId[] = [
  "team-1",
  "team-2",
  "team-3",
  "team-4",
];

const CELL_STEP_X = 42;
const ROW_STEP_Y = 64;
const BOARD_LEFT = 72;
const BOARD_TOP = 16;

const teamShort = (name: string) =>
  name.replace(
    "Ban do Giám đốc quản lý",
    "Ban GĐ quản lý"
  );

export function ObstaclePage() {
  const teams = useGameStore((s) => s.teams);
  const { puzzles } = useObstacleStore();

  const puzzle = puzzles[0];

  const [phase, setPhase] =
    useState<ObstaclePhase>("teams");

  const [selectedClueId, setSelectedClueId] =
    useState<string | null>(null);

  const [questionOpen, setQuestionOpen] =
    useState(false);

  const [secondsLeft, setSecondsLeft] =
    useState(puzzle?.timeLimitSeconds ?? 60);

  const [timerRunning, setTimerRunning] =
    useState(false);

  const [statusMap, setStatusMap] =
    useState<Record<string, ObstacleClueStatus>>({});

  const [answers, setAnswers] =
    useState<TeamAnswerMap>({
      "team-1": "unanswered",
      "team-2": "unanswered",
      "team-3": "unanswered",
      "team-4": "unanswered",
    });

  const [showScoreboard, setShowScoreboard] =
    useState(false);

  const [verticalSolved, setVerticalSolved] =
    useState(false);

  const [verticalModal, setVerticalModal] =
    useState(false);

  const [verticalTeam, setVerticalTeam] =
    useState<TeamId | null>(null);

  const [verticalResultOpen, setVerticalResultOpen] =
    useState(false);

  const [verticalAwarded, setVerticalAwarded] =
    useState(false);

  const selectedClue = puzzle?.clues.find(
    (c) => c.id === selectedClueId
  );

  const sortedClues = useMemo(
    () =>
      [...(puzzle?.clues ?? [])].sort(
        (a, b) => a.order - b.order
      ),
    [puzzle]
  );

  /*
   * HÀNG DỌC
   *
   * Mỗi chữ hàng dọc được lấy theo thứ tự các hàng ngang
   * từ trên xuống dưới.
   *
   * Vị trí X của từng chữ được tính trực tiếp:
   *
   *     clue.x + clue.verticalIndex
   *
   * Nhờ vậy hàng dọc luôn nằm đúng tại giao điểm thực tế,
   * kể cả khi các hàng ngang được xếp lệch nhau.
   */
  const verticalLetters = useMemo(() => {
    if (!puzzle) return [];

    const letters = puzzle.verticalAnswer
      .replace(/\s/g, "")
      .split("");

    const rows = [...puzzle.clues].sort(
      (a, b) =>
        a.y - b.y ||
        a.order - b.order
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
      setSecondsLeft((value) =>
        Math.max(0, value - 1)
      );
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [timerRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && timerRunning) {
      setTimerRunning(false);
    }
  }, [secondsLeft, timerRunning]);

  /*
   * MỞ HÀNG NGANG
   */
  const openClue = useCallback(
    (id: string) => {
      if (phase === "finished") return;

      const current =
        statusMap[id];

      const allowed =
        phase === "teams"
          ? (
              current === undefined ||
              current === "available"
            )
          : (
              current === undefined ||
              current === "available" ||
              current === "missed" ||
              current === "audience-missed"
            );

      if (!allowed) return;

      setSelectedClueId(id);
      setQuestionOpen(true);

      setSecondsLeft(
        puzzle?.timeLimitSeconds ?? 60
      );

      setTimerRunning(true);

      setStatusMap((map) => ({
        ...map,
        [id]:
          phase === "audience"
            ? "audience-active"
            : "active",
      }));

      setAnswers({
        "team-1": "unanswered",
        "team-2": "unanswered",
        "team-3": "unanswered",
        "team-4": "unanswered",
      });
    },
    [
      phase,
      statusMap,
      puzzle?.timeLimitSeconds,
    ]
  );

  /*
   * KẾT THÚC CÂU HỎI
   */
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
    [selectedClueId, phase]
  );

  /*
   * CHẤM ĐIỂM HÀNG NGANG
   *
   * Chỉ khi phase === "teams" mới cộng điểm.
   */
  const awardHorizontal = () => {
    if (!selectedClueId || !selectedClue) return;

    if (phase === "teams") {
      TEAM_IDS.forEach((teamId) => {
        if (
          answers[teamId] === "correct"
        ) {
          addScore(
            teamId,
            puzzle.horizontalPoints,
            "obstacle"
          );
        }
      });
    }

    finishQuestion("solve");
  };

  const markNoTeamCorrect = () =>
    finishQuestion("miss");

  /*
   * BẮT ĐẦU HÀNG DỌC
   */
  const startVertical = () => {
    setVerticalModal(true);
    setVerticalTeam(null);
  };

  /*
   * XỬ LÝ HÀNG DỌC
   */
  const resolveVertical = (
    correct: boolean
  ) => {
    setVerticalModal(false);

    if (!correct || !verticalTeam) {
      return;
    }

    if (!verticalAwarded) {
      addScore(
        verticalTeam,
        puzzle.verticalPoints,
        "obstacle"
      );
    }

    setVerticalAwarded(true);
    setVerticalSolved(true);
    setVerticalResultOpen(true);
  };

  /*
   * CHUYỂN SANG KHÁN GIẢ
   *
   * Những clue đang "active" ở phần thi đội
   * phải được trả về trạng thái "missed" để
   * khán giả có thể tiếp tục thao tác.
   *
   * Không cộng điểm cho đội ở phase audience.
   */
  const switchToAudience = () => {
    setTimerRunning(false);
    setQuestionOpen(false);

    setStatusMap((current) => {
      const next = {
        ...current,
      };

      Object.entries(next).forEach(
        ([id, status]) => {
          if (status === "active") {
            next[id] = "missed";
          }
        }
      );

      return next;
    });

    setSelectedClueId(null);
    setPhase("audience");
  };

  /*
   * RESET VÁN
   */
  const resetGame = () => {
    setPhase("teams");
    setSelectedClueId(null);
    setQuestionOpen(false);
    setTimerRunning(false);

    setSecondsLeft(
      puzzle.timeLimitSeconds
    );

    setStatusMap({});

    setVerticalSolved(false);
    setVerticalAwarded(false);
    setVerticalResultOpen(false);
    setVerticalModal(false);
    setVerticalTeam(null);

    setAnswers({
      "team-1": "unanswered",
      "team-2": "unanswered",
      "team-3": "unanswered",
      "team-4": "unanswered",
    });
  };

  if (!puzzle) {
    return (
      <main className="game-page">
        <div className="ready-panel">
          <h2>Chưa có bộ ô chữ</h2>
          <p>
            Vào Admin Part 2 để tạo bộ ô chữ.
          </p>
        </div>
      </main>
    );
  }

  const timerText =
    `${String(
      Math.floor(secondsLeft / 60)
    ).padStart(2, "0")}:${String(
      secondsLeft % 60
    ).padStart(2, "0")}`;

  const isAudienceActive =
    selectedClue
      ? statusMap[selectedClue.id] ===
        "audience-active"
      : false;

  return (
    <main className="game-page obstacle-game">

      {/* HEADER */}
      <header className="game-header obstacle-header">
        <div>
          <div className="eyebrow">
            GAME SHOW • VÒNG 2
          </div>

          <h1>
            VƯỢT CHƯỚNG NGẠI VẬT
          </h1>
        </div>

        <div
          className={`timer ${
            secondsLeft <= 10 &&
            timerRunning
              ? "danger"
              : ""
          }`}
        >
          {timerText}
        </div>
      </header>

      {/* SCOREBOARD */}
      <div className="scoreboard-toggle-row">
        <button
          className="ghost-button scoreboard-toggle"
          onClick={() =>
            setShowScoreboard(
              (value) => !value
            )
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

        {/* TOOLBAR */}
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
                onClick={switchToAudience}
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

        {/* PUZZLE BOARD */}
        <div className="puzzle-board">

          {/*
           * HÀNG DỌC
           *
           * Mỗi ô có vị trí X riêng dựa vào
           * clue.x + clue.verticalIndex.
           *
           * Khi chưa giải:
           *     hoàn toàn trong suốt
           *
           * Khi giải:
           *     màu vàng
           */}
          <div className="vertical-answer">

            {verticalLetters.map(
              ({
                char,
                clue,
                index,
              }) => {
                if (!clue) return null;

                const verticalX =
                  clue.x +
                  clue.verticalIndex;

                return (
                  <span
                    key={`vertical-${index}`}
                    className={
                      verticalSolved
                        ? "revealed"
                        : "hidden-letter"
                    }
                    style={{
                      left:
                        verticalX *
                          CELL_STEP_X +
                        BOARD_LEFT,
                      top:
                        clue.y *
                          ROW_STEP_Y +
                        BOARD_TOP,
                    }}
                  >
                    {verticalSolved
                      ? char
                      : ""}
                  </span>
                );
              }
            )}

          </div>

          {/* HÀNG NGANG */}
          {sortedClues.map(
            (clue) => {
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
                  ? (
                      status ===
                        "available" ||
                      status === undefined
                    )
                  : (
                      status ===
                        "available" ||
                      status ===
                        "missed" ||
                      status ===
                        "audience-missed"
                    );

              const letters =
                clue.answer
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
                    status ===
                      "active" ||
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
                      clue.order
                    ).padStart(2, "0")}
                  </b>

                  <span className="cells">
                    {letters.map(
                      (
                        letter,
                        index
                      ) => (
                        <i
                          key={index}
                          className={
                            isVisible
                              ? "cell reveal-cell"
                              : "cell"
                          }
                        >
                          {isVisible
                            ? letter
                            : ""}
                        </i>
                      )
                    )}
                  </span>
                </button>
              );
            }
          )}

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

      {/* QUESTION MODAL */}
      {questionOpen &&
        selectedClue && (
          <div className="stage-modal">
            <section className="question-stage-card">

              <div className="eyebrow">
                HÀNG NGANG{" "}
                {String(
                  selectedClue.order
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
                    (value) => !value
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

      {/* GRADING */}
      {!questionOpen &&
        selectedClue &&
        (
          statusMap[
            selectedClue.id
          ] === "active" ||
          statusMap[
            selectedClue.id
          ] === "audience-active"
        ) && (
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

            {/* CHỈ HIỆN CHỌN ĐỘI Ở PHẦN THI ĐỘI */}
            {!isAudienceActive && (
              <div className="team-grade-grid">

                {teams.map(
                  (team) => (
                    <button
                      key={team.id}
                      className={`team-grade ${
                        answers[
                          team.id
                        ] === "correct"
                          ? "correct"
                          : answers[
                                team.id
                              ] === "wrong"
                            ? "wrong"
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
                          })
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
                          team.name
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
                  )
                )}

              </div>
            )}

            {/* ACTION */}
            <div className="grading-actions">

              {isAudienceActive ? (
                <>
                  <button
                    className="answer-button correct"
                    onClick={() =>
                      finishQuestion(
                        "solve"
                      )
                    }
                  >
                    ＋ ĐÚNG / REVEAL
                  </button>

                  <button
                    className="answer-button wrong"
                    onClick={() =>
                      finishQuestion(
                        "miss"
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

      {/* VERTICAL MODAL */}
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

              {teams.map(
                (team) => (
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
                        team.id
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
                        team.name
                      )}
                    </strong>

                    <b>
                      {verticalTeam ===
                      team.id
                        ? "ĐANG TRẢ LỜI"
                        : "CHỌN ĐỘI"}
                    </b>
                  </button>
                )
              )}

            </div>

            <div className="grading-actions">

              <button
                className="answer-button correct"
                disabled={!verticalTeam}
                onClick={() =>
                  resolveVertical(
                    true
                  )
                }
              >
                ✓ CHÍNH XÁC / +
                {puzzle.verticalPoints}
              </button>

              <button
                className="answer-button wrong"
                onClick={() =>
                  resolveVertical(
                    false
                  )
                }
              >
                − BỎ QUA
              </button>

            </div>

          </section>
        </div>
      )}

      {/* VERTICAL RESULT */}
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
                      verticalTeam
                  )?.name
                : ""}{" "}
              +{puzzle.verticalPoints} điểm
            </p>

            <button
              className="primary-button"
              onClick={() =>
                setVerticalResultOpen(
                  false
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
