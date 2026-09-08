import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Team,
  TeamId,
} from "../../../core/types/game";
import { addScore } from "../../../core/scoring/scoring";
import { Scoreboard } from "../../../components/Scoreboard";
import { useWarmupStore } from "../store/warmupStore";
import { TeamSelector } from "../components/TeamSelector";
import { WarmupControls } from "../components/WarmupControls";
import { QuestionStatusBar } from "../components/QuestionStatusBar";
import type {
  QuestionSet,
  QuestionStatus,
  WarmupQuestion,
} from "../types/warmup";

const TOTAL_SECONDS = 120;

type Props = {
  teams: Team[];
};

export function WarmupPage({ teams }: Props) {
  const questionSets = useWarmupStore(
    (state) => state.questionSets,
  );

  const [selectedTeamId, setSelectedTeamId] =
    useState<TeamId | null>(null);

  const [selectedSetId, setSelectedSetId] =
    useState<string | null>(null);

  const [usedTeamIds, setUsedTeamIds] =
    useState<TeamId[]>([]);

  const [usedSetIds, setUsedSetIds] =
    useState<string[]>([]);

  const [active, setActive] =
    useState(false);

  const [paused, setPaused] =
    useState(false);

  const [secondsLeft, setSecondsLeft] =
    useState(TOTAL_SECONDS);

  const [questions, setQuestions] =
    useState<WarmupQuestion[]>([]);

  const [statuses, setStatuses] =
    useState<QuestionStatus[]>([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [finished, setFinished] =
    useState(false);

  const [showScoreboard, setShowScoreboard] =
    useState(true);

  const transitionLock =
    useRef(false);

  const currentQuestion =
    questions[currentIndex];

  const selectedTeam =
    teams.find(
      (team) => team.id === selectedTeamId,
    );

  const selectedSet =
    questionSets.find(
      (set) => set.id === selectedSetId,
    );

  const resetTurn = useCallback(() => {
    setSelectedTeamId(null);
    setSelectedSetId(null);
    setActive(false);
    setPaused(false);
    setSecondsLeft(TOTAL_SECONDS);
    setQuestions([]);
    setStatuses([]);
    setCurrentIndex(0);
    setFinished(false);
    transitionLock.current = false;
  }, []);

  const chooseTeam = useCallback(
    (teamId: TeamId) => {
      if (
        active ||
        usedTeamIds.includes(teamId)
      ) {
        return;
      }

      setSelectedTeamId(teamId);
      setSelectedSetId(null);
      setFinished(false);
    },
    [active, usedTeamIds],
  );

  const startTeam = useCallback(
    (
      teamId: TeamId,
      questionSet: QuestionSet,
    ) => {
      if (
        active ||
        usedTeamIds.includes(teamId) ||
        usedSetIds.includes(questionSet.id)
      ) {
        return;
      }

      if (questionSet.questions.length !== 10) {
        window.alert(
          "Bộ câu hỏi này chưa hợp lệ. Phải có đúng 10 câu.",
        );
        return;
      }

      setSelectedTeamId(teamId);
      setSelectedSetId(questionSet.id);

      setUsedTeamIds((current) => [
        ...current,
        teamId,
      ]);

      setUsedSetIds((current) => [
        ...current,
        questionSet.id,
      ]);

      setQuestions(
        [...questionSet.questions].sort(
          (a, b) => a.order - b.order,
        ),
      );

      const initialStatuses =
        Array(10).fill(
          "unanswered",
        ) as QuestionStatus[];

      initialStatuses[0] = "current";

      setStatuses(initialStatuses);
      setCurrentIndex(0);
      setSecondsLeft(TOTAL_SECONDS);
      setPaused(false);
      setFinished(false);
      transitionLock.current = false;
      setActive(true);
    },
    [
      active,
      usedSetIds,
      usedTeamIds,
    ],
  );

  const finishTurn = useCallback(() => {
    setActive(false);
    setPaused(false);
    setFinished(true);
    transitionLock.current = false;
  }, []);

  useEffect(() => {
    if (
      !active ||
      paused ||
      finished
    ) {
      return;
    }

    if (secondsLeft <= 0) {
      finishTurn();
      return;
    }

    const timer =
      window.setInterval(() => {
        setSecondsLeft(
          (value) =>
            Math.max(0, value - 1),
        );
      }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [
    active,
    paused,
    finished,
    secondsLeft,
    finishTurn,
  ]);

  const resolve = useCallback(
    (
      result:
        | "correct"
        | "wrong"
        | "skipped",
    ) => {
      if (
        !active ||
        paused ||
        !selectedTeamId ||
        transitionLock.current ||
        currentQuestion == null
      ) {
        return;
      }

      transitionLock.current = true;

      if (result === "correct") {
        addScore(
          selectedTeamId,
          10,
          "warmup",
        );
      }

      window.setTimeout(() => {
        setStatuses((latest) => {
          const resolved =
            latest.map(
              (status, index) =>
                index === currentIndex
                  ? result
                  : status,
            );

          const nextUnanswered =
            resolved.findIndex(
              (status) =>
                status === "unanswered",
            );

          if (nextUnanswered >= 0) {
            setCurrentIndex(
              nextUnanswered,
            );

            transitionLock.current =
              false;

            return resolved.map(
              (status, index) =>
                index ===
                nextUnanswered
                  ? "current"
                  : status,
            );
          }

          const nextSkipped =
            resolved.findIndex(
              (status) =>
                status === "skipped",
            );

          if (nextSkipped >= 0) {
            setCurrentIndex(
              nextSkipped,
            );

            transitionLock.current =
              false;

            return resolved.map(
              (status, index) =>
                index === nextSkipped
                  ? "current"
                  : status,
            );
          }

          finishTurn();

          return resolved;
        });
      }, 80);
    },
    [
      active,
      paused,
      selectedTeamId,
      currentQuestion,
      currentIndex,
      finishTurn,
    ],
  );

  useEffect(() => {
    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      const target =
        event.target as HTMLElement | null;

      const tag =
        target?.tagName?.toLowerCase();

      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select"
      ) {
        return;
      }

      const key =
        event.key.toLowerCase();

      if (!active) {
        if (
          ["1", "2", "3", "4"].includes(
            key,
          )
        ) {
          chooseTeam(
            `team-${key}` as TeamId,
          );
        }

        return;
      }

      if (key === "d")
        resolve("correct");

      if (key === "s")
        resolve("wrong");

      if (key === "c")
        resolve("skipped");

      if (key === "p")
        setPaused(
          (value) => !value,
        );
    };

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
  }, [
    active,
    chooseTeam,
    resolve,
  ]);

  const timerText = useMemo(
    () =>
      `${String(
        Math.floor(
          secondsLeft / 60,
        ),
      ).padStart(2, "0")}:${String(
        secondsLeft % 60,
      ).padStart(2, "0")}`,
    [secondsLeft],
  );

  const displayedStatuses =
    statuses.length
      ? statuses
      : Array(10).fill(
          "unanswered",
        );

  const availableSets =
    questionSets.filter(
      (set) =>
        !usedSetIds.includes(
          set.id,
        ),
    );

  const allTeamsPlayed =
    usedTeamIds.length >=
    teams.length;

  return (
    <main className="game-page warmup-page">
      <header className="game-header">
        <div>
          <div className="eyebrow">
            GAME SHOW • VÒNG 1
          </div>

          <h1>KHỞI ĐỘNG</h1>
        </div>

        <div
          className={`timer ${
            secondsLeft <= 15 &&
            active
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
          <Scoreboard
            teams={teams}
            allowManualAdjust
            phase="warmup"
          />
        </div>
      )}

      {!active &&
        !finished &&
        !allTeamsPlayed && (
          <>
            <TeamSelector
              teams={teams}
              selectedTeamId={
                selectedTeamId
              }
              locked={false}
              disabledTeamIds={
                usedTeamIds
              }
              onSelect={chooseTeam}
            />

            {selectedTeam && (
              <section className="warmup-set-selection">
                <div className="section-label">
                  2. CHỌN BỘ CÂU HỎI
                </div>

                <div className="warmup-selection-heading">
                  <div>
                    <strong>
                      {selectedTeam.name}
                    </strong>

                    <span>
                      Đội được tự chọn một
                      bộ câu hỏi chưa sử dụng.
                    </span>
                  </div>

                  <button
                    className="ghost-button"
                    onClick={() => {
                      setSelectedTeamId(
                        null,
                      );
                      setSelectedSetId(
                        null,
                      );
                    }}
                  >
                    ← ĐỔI ĐỘI
                  </button>
                </div>

                <div className="warmup-set-grid">
                  {availableSets.map(
                    (set) => {
                      const valid =
                        set.questions.length ===
                        10;

                      return (
                        <button
                          key={set.id}
                          className={`warmup-set-card ${
                            selectedSetId ===
                            set.id
                              ? "selected"
                              : ""
                          }`}
                          disabled={!valid}
                          onClick={() =>
                            startTeam(
                              selectedTeam.id,
                              set,
                            )
                          }
                        >
                          <span>
                            {set.name}
                          </span>

                          <strong>
                            10 CÂU
                          </strong>

                          <small>
                            {valid
                              ? "CHỌN BỘ NÀY →"
                              : "CHƯA ĐỦ 10 CÂU"}
                          </small>
                        </button>
                      );
                    },
                  )}
                </div>
              </section>
            )}
          </>
        )}

      {active &&
        selectedTeam &&
        selectedSet && (
          <section className="question-panel">
            <div className="live-meta">
              <span>
                {selectedTeam.name} •{" "}
                {selectedSet.name}
              </span>

              <span>
                CÂU{" "}
                {String(
                  currentIndex + 1,
                ).padStart(2, "0")}
                /10
              </span>

              {paused && (
                <b>TẠM DỪNG</b>
              )}
            </div>

            <div className="question-text">
              {currentQuestion?.question}
            </div>

            <QuestionStatusBar
              statuses={
                displayedStatuses
              }
              currentIndex={
                currentIndex
              }
            />

            <WarmupControls
              disabled={
                paused ||
                !active ||
                secondsLeft <= 0
              }
              paused={paused}
              onCorrect={() =>
                resolve("correct")
              }
              onWrong={() =>
                resolve("wrong")
              }
              onSkip={() =>
                resolve("skipped")
              }
              onPause={() =>
                setPaused(
                  (value) => !value,
                )
              }
            />
          </section>
        )}

      {!active &&
        !finished &&
        !selectedTeamId &&
        !allTeamsPlayed && (
          <div className="ready-panel">
            <div className="ready-icon">
              ▶
            </div>

            <h2>
              Chọn đội để bắt đầu
            </h2>

            <p>
              Sau khi chọn đội, đội sẽ
              tự chọn một bộ câu hỏi còn
              trống. Timer 02:00 bắt đầu
              ngay khi bộ câu hỏi được
              chọn.
            </p>

            <div className="shortcut-hint">
              Phím nhanh chọn đội:{" "}
              <kbd>1</kbd>{" "}
              <kbd>2</kbd>{" "}
              <kbd>3</kbd>{" "}
              <kbd>4</kbd>
            </div>
          </div>
        )}

      {finished &&
        selectedTeam && (
          <section className="result-panel">
            <div className="eyebrow">
              HOÀN THÀNH LƯỢT CHƠI
            </div>

            <h2>
              {selectedTeam.name}
            </h2>

            <p>
              {selectedSet?.name} đã
              hoàn thành. Điểm Khởi động
              đã được cập nhật vào bảng
              điểm chung.
            </p>

            <button
              className="primary-button"
              onClick={resetTurn}
            >
              CHỌN ĐỘI TIẾP THEO
            </button>
          </section>
        )}

      {!active &&
        !finished &&
        allTeamsPlayed && (
          <section className="result-panel">
            <div className="eyebrow">
              VÒNG 1 HOÀN TẤT
            </div>

            <h2>
              ĐÃ THI ĐỦ 4 ĐỘI
            </h2>

            <p>
              Tất cả các đội đã hoàn
              thành lượt Khởi động.
            </p>
          </section>
        )}
    </main>
  );
}
