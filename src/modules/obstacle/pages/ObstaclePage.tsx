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

const teamShort = (name: string) =>
  name.replace("Ban do Giám đốc quản lý", "Ban GĐ quản lý");

/*
 * Hệ tọa độ logic của bảng ô chữ.
 *
 * VERTICAL_COLUMN chỉ là cột logic dùng để tính toán.
 * Trên PUBLIC SCREEN, hàng dọc sẽ được căn giữa
 * theo toàn bộ bounding box của bảng, không lộ cột này.
 */
const VERTICAL_COLUMN = 10;

const CELL_SIZE = 40;
const ROW_HEIGHT = 58;
const BOARD_TOP = 28;

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
    useState(
      puzzle?.timeLimitSeconds ?? 60,
    );

  const [timerRunning, setTimerRunning] =
    useState(false);

  const [statusMap, setStatusMap] =
    useState<Record<string, ObstacleClueStatus>>(
      {},
    );

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

  const selectedClue =
    puzzle?.clues.find(
      (clue) => clue.id === selectedClueId,
    );

  const sortedClues = useMemo(
    () =>
      [...(puzzle?.clues ?? [])].sort(
        (a, b) => a.order - b.order,
      ),
    [puzzle],
  );

  /*
   * =========================================================
   * TÍNH TOÁN KHUNG BẢNG Ô CHỮ
   * =========================================================
   *
   * Mỗi hàng ngang có:
   *
   * startColumn =
   * VERTICAL_COLUMN - verticalIndex
   *
   * endColumn =
   * startColumn + số lượng ký tự - 1
   *
   * Sau đó lấy min/max của TOÀN BỘ bảng.
   *
   * Nhờ vậy toàn bộ bảng được căn giữa trong puzzle-board,
   * thay vì căn theo một cột cố định.
   */
  const boardMetrics = useMemo(() => {
    if (!puzzle || puzzle.clues.length === 0) {
      return {
        minColumn: VERTICAL_COLUMN,
        maxColumn: VERTICAL_COLUMN,
        centerColumn: VERTICAL_COLUMN,
      };
    }

    let minColumn = Number.POSITIVE_INFINITY;
    let maxColumn = Number.NEGATIVE_INFINITY;

    puzzle.clues.forEach((clue) => {
      const answer = clue.answer
        .replace(/\s/g, "");

      const length = Math.max(
        answer.length,
        1,
      );

      const verticalIndex = Math.max(
        0,
        Math.min(
          clue.verticalIndex,
          length - 1,
        ),
      );

      const startColumn =
        VERTICAL_COLUMN -
        verticalIndex;

      const endColumn =
        startColumn +
        length -
        1;

      minColumn = Math.min(
        minColumn,
        startColumn,
      );

      maxColumn = Math.max(
        maxColumn,
        endColumn,
      );
    });

    return {
      minColumn,
      maxColumn,
      centerColumn:
        (minColumn + maxColumn) / 2,
    };
  }, [puzzle]);

  /*
   * Vị trí bắt đầu của từng hàng ngang.
   *
   * Tất cả đều được tính tương đối với
   * tâm thật của toàn bộ bảng.
   */
  const getRowLeft = useCallback(
    (verticalIndex: number) => {
      const startColumn =
        VERTICAL_COLUMN -
        Math.max(0, verticalIndex);

      const relativeColumn =
        startColumn -
        boardMetrics.centerColumn;

      return `calc(50% + ${
        relativeColumn * CELL_SIZE
      }px - ${CELL_SIZE / 2}px)`;
    },
    [boardMetrics.centerColumn],
  );

  /*
   * Hàng dọc cũng nằm trên cùng hệ tọa độ.
   *
   * Nhưng trước khi giải:
   * CSS sẽ làm nó hoàn toàn vô hình.
   */
  const verticalLeft = useMemo(() => {
    const relativeColumn =
      VERTICAL_COLUMN -
      boardMetrics.centerColumn;

    return `calc(50% + ${
      relativeColumn * CELL_SIZE
    }px - ${CELL_SIZE / 2}px)`;
  }, [boardMetrics.centerColumn]);

  /*
   * =========================================================
   * TIMER
   * =========================================================
   */

  useEffect(() => {
    if (
      !timerRunning ||
      secondsLeft <= 0
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setSecondsLeft((value) =>
          Math.max(0, value - 1),
        );
      }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [
    timerRunning,
    secondsLeft,
  ]);

  useEffect(() => {
    if (
      secondsLeft === 0 &&
      timerRunning
    ) {
      setTimerRunning(false);
    }
  }, [
    secondsLeft,
    timerRunning,
  ]);

  /*
   * =========================================================
   * MỞ CÂU HỎI
   * =========================================================
   */

  const openClue = useCallback(
    (id: string) => {
      if (
        phase === "finished"
      ) {
        return;
      }

      const current =
        statusMap[id];

      const allowed =
        phase === "teams"
          ? current === undefined ||
            current === "available"
          : current === "missed" ||
            current ===
              "audience-missed";

      if (!allowed) {
        return;
      }

      setSelectedClueId(id);
      setQuestionOpen(true);

      /*
       * Mỗi câu hỏi luôn reset timer.
       */
      setSecondsLeft(
        puzzle?.timeLimitSeconds ?? 60,
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
    ],
  );

  /*
   * =========================================================
   * KẾT THÚC CÂU HỎI
   * =========================================================
   */

  const finishQuestion = useCallback(
    (mode: "solve" | "miss") => {
      if (!selectedClueId) {
        return;
      }

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
    [
      selectedClueId,
      phase,
    ],
  );

  /*
   * =========================================================
   * CHẤM HÀNG NGANG
   * =========================================================
   */

  const awardHorizontal = () => {
    if (
      !selectedClueId ||
      !selectedClue
    ) {
      return;
    }

    /*
     * Chỉ phần thi đội mới được cộng điểm.
     *
     * Điểm đi qua CORE nên vẫn cộng dồn
     * với các vòng trước.
     */
    TEAM_IDS.forEach(
      (teamId) => {
        if (
          answers[teamId] ===
            "correct" &&
          phase === "teams"
        ) {
          addScore(
            teamId,
            puzzle.horizontalPoints,
            "obstacle",
          );
        }
      },
    );

    finishQuestion("solve");
  };

  const markNoTeamCorrect = () => {
    finishQuestion("miss");
  };

  /*
   * =========================================================
   * HÀNG DỌC
   * =========================================================
   */

  const startVertical = () => {
    setVerticalModal(true);
    setVerticalTeam(null);
  };

  const resolveVertical = (
    correct: boolean,
  ) => {
    setVerticalModal(false);

    /*
     * BỎ QUA:
     * không khóa hàng dọc.
     * Có thể gọi lại bất kỳ lúc nào.
     */
    if (
      !correct ||
      !verticalTeam
    ) {
      return;
    }

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

  /*
   * =========================================================
   * RESET VÁN
   * =========================================================
   */

  const resetGame = () => {
    setPhase("teams");
    setSelectedClueId(null);
    setQuestionOpen(false);
    setTimerRunning(false);

    setSecondsLeft(
      puzzle.timeLimitSeconds,
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
          <h2>
            Chưa có bộ ô chữ
          </h2>

          <p>
            Vào Admin Part 2 để tạo
            bộ ô chữ.
          </p>
        </div>
      </main>
    );
  }

  const timerText =
    `${String(
      Math.floor(
        secondsLeft / 60,
      ),
    ).padStart(2, "0")}:${String(
      secondsLeft % 60,
    ).padStart(2, "0")}`;

  const verticalLetters =
    puzzle.verticalAnswer
      .replace(/\s/g, "")
      .split("");

  return (
    <main className="game-page obstacle-game">
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

      <div className="scoreboard-toggle-row">
        <button
          className="ghost-button scoreboard-toggle"
          onClick={() =>
            setShowScoreboard(
              (value) => !value,
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
                onClick={() =>
                  setPhase(
                    "audience",
                  )
                }
              >
                🎤 CHUYỂN SANG KHÁN GIẢ
              </button>
            )}

            {phase === "audience" && (
              <button
                className="primary-button"
                onClick={() =>
                  setPhase(
                    "finished",
                  )
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
          {/* =================================================
              HÀNG DỌC
              
              QUAN TRỌNG:
              Trước khi giải, các ô này hoàn toàn vô hình.
              Không màu nền.
              Không viền.
              Không glow.
              Không để lộ vị trí hàng dọc.
          ================================================== */}
          <div
            className={`vertical-answer ${
              verticalSolved
                ? "vertical-solved"
                : ""
            }`}
            style={{
              left: verticalLeft,
              top: BOARD_TOP,
            }}
          >
            {verticalLetters.map(
              (char, index) => (
                <span
                  key={`${char}-${index}`}
                  className={
                    verticalSolved
                      ? "revealed"
                      : "hidden-letter"
                  }
                >
                  {verticalSolved
                    ? char
                    : ""}
                </span>
              ),
            )}
          </div>

          {/* =================================================
              HÀNG NGANG
          ================================================== */}
          {sortedClues.map(
            (clue) => {
              const status =
                statusMap[
                  clue.id
                ] ?? "available";

              const isVisible =
                status ===
                  "solved" ||
                status ===
                  "audience-solved";

              const isDim =
                status === "missed" ||
                status ===
                  "audience-missed" ||
                (verticalSolved &&
                  !isVisible);

              const canOpen =
                phase === "teams"
                  ? status ===
                    "available"
                  : status ===
                      "missed" ||
                    status ===
                      "audience-missed";

              const letters =
                clue.answer
                  .replace(
                    /\s/g,
                    "",
                  )
                  .split("");

              /*
               * Nếu Admin chọn vị trí giao = 4
               * thì đây chính là index 4
               * của mảng ký tự (0-based).
               *
               * Ví dụ:
               * CAMTHUNG...
               * index 4 = H
               *
               * Việc hiển thị ô giao KHÔNG còn
               * tạo màu vàng trước khi giải hàng dọc.
               */
              const rowLeft =
                getRowLeft(
                  clue.verticalIndex,
                );

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
                    left: rowLeft,
                    top:
                      BOARD_TOP +
                      clue.y *
                        ROW_HEIGHT,
                  }}
                  disabled={
                    !canOpen
                  }
                  onClick={() =>
                    openClue(
                      clue.id,
                    )
                  }
                  title={`Hàng ngang ${clue.order}`}
                >
                  <span className="cells">
                    {letters.map(
                      (
                        letter,
                        index,
                      ) => (
                        <i
                          key={
                            index
                          }
                          className={`cell ${
                            isVisible
                              ? "reveal-cell"
                              : ""
                          } ${
                            index ===
                            clue.verticalIndex
                              ? "crossing-cell"
                              : ""
                          }`}
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
            },
          )}

          {phase ===
            "finished" && (
            <div className="finished-overlay">
              <div>🏁</div>

              <strong>
                HOÀN THÀNH Ô CHỮ
              </strong>

              <button
                className="primary-button"
                onClick={
                  resetGame
                }
              >
                CHƠI VÁN MỚI
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          CÂU HỎI
      ====================================================== */}
      {questionOpen &&
        selectedClue && (
          <div className="stage-modal">
            <section className="question-stage-card">
              <div className="eyebrow">
                HÀNG NGANG{" "}
                {String(
                  selectedClue.order,
                ).padStart(
                  2,
                  "0",
                )}
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
                    (value) =>
                      !value,
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
                  setTimerRunning(
                    false,
                  );
                  setQuestionOpen(
                    false,
                  );
                }}
              >
                QUAY LẠI BẢNG Ô CHỮ
              </button>
            </section>
          </div>
        )}

      {/* =====================================================
          XÁC NHẬN ĐÚNG / SAI
      ====================================================== */}
      {!questionOpen &&
        selectedClue &&
        statusMap[
          selectedClue.id
        ] === "active" && (
          <section className="grading-panel">
            <div className="grading-head">
              <div>
                <div className="eyebrow">
                  XÁC NHẬN CÂU HỎI
                </div>

                <h2>
                  “{
                    selectedClue.question
                  }”
                </h2>
              </div>
            </div>

            <div className="team-grade-grid">
              {teams.map(
                (team) => (
                  <button
                    key={
                      team.id
                    }
                    className={`team-grade ${
                      answers[
                        team.id
                      ] ===
                      "correct"
                        ? "correct"
                        : answers[
                              team.id
                            ] ===
                            "wrong"
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
                      ] ===
                      "correct"
                        ? `✓ +${puzzle.horizontalPoints}`
                        : "CHƯA TICK"}
                    </b>
                  </button>
                ),
              )}
            </div>

            <div className="grading-actions">
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
            </div>
          </section>
        )}

      {/* =====================================================
          HÀNG DỌC
      ====================================================== */}
      {verticalModal && (
        <div className="stage-modal">
          <section className="vertical-stage-card">
            <div className="eyebrow">
              ĐOÁN Ô CHỮ HÀNG DỌC
            </div>

            <h2>
              {verticalLetters
                .map(() => "_")
                .join(" ")}
            </h2>

            <div className="team-grade-grid">
              {teams.map(
                (team) => (
                  <button
                    key={
                      team.id
                    }
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
                ),
              )}
            </div>

            <div className="grading-actions">
              <button
                className="answer-button correct"
                disabled={
                  !verticalTeam
                }
                onClick={() =>
                  resolveVertical(
                    true,
                  )
                }
              >
                ✓ CHÍNH XÁC / +
                {
                  puzzle.verticalPoints
                }
              </button>

              <button
                className="answer-button wrong"
                onClick={() =>
                  resolveVertical(
                    false,
                  )
                }
              >
                − BỎ QUA
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================
          KẾT QUẢ HÀNG DỌC
      ====================================================== */}
      {verticalResultOpen && (
        <div className="stage-modal">
          <section className="vertical-win-card">
            <div className="eyebrow">
              CHÍNH XÁC!
            </div>

            <h2>
              {
                puzzle.verticalAnswer
              }
            </h2>

            <p>
              {verticalTeam
                ? teams.find(
                    (team) =>
                      team.id ===
                      verticalTeam,
                  )?.name
                : ""}{" "}
              +
              {
                puzzle.verticalPoints
              }{" "}
              điểm
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
