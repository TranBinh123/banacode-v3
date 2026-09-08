import { useEffect, useMemo, useState } from "react";
import { addScore } from "../../../core/scoring/scoring";
import { useGameStore } from "../../../core/store/gameStore";
import type { TeamId } from "../../../core/types/game";
import { Scoreboard } from "../../../components/Scoreboard";
import { useAccelerationStore } from "../store/accelerationStore";

const TEAM_IDS: TeamId[] = ["team-1", "team-2", "team-3", "team-4"];

const teamShort = (name: string) =>
  name.replace("Ban do Giám đốc quản lý", "Ban GĐ quản lý");

type TeamState = "available" | "wrong";

export function AccelerationPage() {
  const teams = useGameStore((s) => s.teams);
  const { config } = useAccelerationStore();

  const questions = config.questions;

  const [questionIndex, setQuestionIndex] = useState(0);
  const [started, setStarted] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(
    config.timeLimitSeconds,
  );

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  const [wrongTeams, setWrongTeams] = useState<TeamId[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);

  const [answerVisible, setAnswerVisible] = useState(false);
  const [winner, setWinner] = useState<TeamId | null>(null);

  const [audienceMode, setAudienceMode] = useState(false);
  const [audienceSolved, setAudienceSolved] = useState(false);

  const [showScoreboard, setShowScoreboard] = useState(false);
  const [finished, setFinished] = useState(false);

  const question = questions[questionIndex];

  const allTeamsWrong = useMemo(
    () => TEAM_IDS.every((id) => wrongTeams.includes(id)),
    [wrongTeams],
  );

  const hasNext = questionIndex < questions.length - 1;

  const timerText = `${String(Math.floor(secondsLeft / 60)).padStart(
    2,
    "0",
  )}:${String(secondsLeft % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;

    const id = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [timerRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft !== 0 || !timerRunning) return;

    setTimerRunning(false);
    setTimerExpired(true);
    setAudienceMode(true);
    setSelectedTeam(null);
  }, [secondsLeft, timerRunning]);

  useEffect(() => {
    if (!started) return;
    if (!allTeamsWrong) return;
    if (winner) return;
    if (answerVisible) return;
    if (audienceMode) return;

    setTimerRunning(false);
    setTimerExpired(false);
    setSelectedTeam(null);
    setAudienceMode(true);
  }, [
    allTeamsWrong,
    started,
    winner,
    answerVisible,
    audienceMode,
  ]);

  const resetQuestion = (index: number) => {
    setQuestionIndex(index);
    setStarted(false);
    setSecondsLeft(config.timeLimitSeconds);
    setTimerRunning(false);
    setTimerExpired(false);
    setWrongTeams([]);
    setSelectedTeam(null);
    setAnswerVisible(false);
    setWinner(null);
    setAudienceMode(false);
    setAudienceSolved(false);
  };

  const showImage = () => {
    setStarted(true);
    setSecondsLeft(config.timeLimitSeconds);
    setTimerExpired(false);
    setTimerRunning(true);
    setWrongTeams([]);
    setSelectedTeam(null);
    setAnswerVisible(false);
    setWinner(null);
    setAudienceMode(false);
    setAudienceSolved(false);
  };

  const markWrong = () => {
    if (!selectedTeam) return;
    if (wrongTeams.includes(selectedTeam)) return;
    if (winner) return;
    if (audienceMode) return;

    setWrongTeams((list) => {
      if (list.includes(selectedTeam)) {
        return list;
      }
      return [...list, selectedTeam];
    });

    setSelectedTeam(null);
  };

  const markCorrect = () => {
    if (!selectedTeam) return;
    if (wrongTeams.includes(selectedTeam)) return;
    if (winner) return;
    if (audienceMode) return;

    addScore(selectedTeam, config.points, "acceleration");

    setWinner(selectedTeam);
    setAnswerVisible(true);
    setTimerRunning(false);
    setTimerExpired(false);
    setSelectedTeam(null);
  };

  const markAudienceCorrect = () => {
    setTimerRunning(false);
    setAnswerVisible(true);
    setAudienceSolved(true);
    setSelectedTeam(null);
  };

  const backToTeams = () => {
    setAudienceMode(false);
    setAudienceSolved(false);
    setSelectedTeam(null);
    setTimerRunning(false);
  };

  const nextQuestion = () => {
    if (!hasNext) {
      setFinished(true);
      return;
    }
    resetQuestion(questionIndex + 1);
  };

  if (!question) {
    return (
      <main className="game-page">
        <div className="ready-panel">
          <h2>Chưa có câu hỏi Vòng 3</h2>
          <p>Vào Admin Vòng 3 để thêm hình ảnh và đáp án.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="game-page acceleration-game">
      <header className="game-header acceleration-header">
        <div>
          <div className="eyebrow">GAME SHOW • VÒNG 3</div>
          <h1>TĂNG TỐC</h1>
          <p className="round-progress">
            CÂU {String(question.order).padStart(2, "0")} /{" "}
            {String(questions.length).padStart(2, "0")}
          </p>
        </div>
        <div
          className={`timer acceleration-timer ${
            secondsLeft <= 10 && timerRunning ? "danger" : ""
          }`}
        >
          {timerText}
        </div>
      </header>

      <div className="scoreboard-toggle-row">
        <button
          className="ghost-button scoreboard-toggle"
          onClick={() => setShowScoreboard((value) => !value)}
        >
          {showScoreboard ? "ẨN BẢNG ĐIỂM" : "BẢNG ĐIỂM"}
        </button>
      </div>

      {showScoreboard && (
        <div className="scoreboard-collapsible">
          <Scoreboard teams={teams} />
        </div>
      )}

      <section className="acceleration-stage">
        <div className="acceleration-topline">
          <div>
            <span className="section-label">⚡ GIÀNH QUYỀN TRẢ LỜI</span>
            <span className="points-badge">+{config.points} ĐIỂM</span>
          </div>
          <span className="time-note">{config.timeLimitSeconds}s / câu</span>
        </div>

        <div className="image-question-card">
          <div className={`image-frame ${!started ? "image-hidden" : ""}`}>
            {started && question.imageUrl ? (
              <img src={question.imageUrl} alt={`Hình ảnh câu ${question.order}`} />
            ) : (
              <div className="image-placeholder">
                <span>⚡</span>
                <strong>NHẤN “HIỂN THỊ HÌNH ẢNH”</strong>
                <small>MC/Kỹ thuật chủ động bắt đầu câu hỏi</small>
              </div>
            )}

            {answerVisible && (
              <div className="answer-reveal">
                <small>ĐÁP ÁN</small>
                <strong>{question.answer || "Chưa nhập đáp án"}</strong>
              </div>
            )}
          </div>

          {!started && !finished && (
            <button className="show-image-button" onClick={showImage}>
              ▶ HIỂN THỊ HÌNH ẢNH
            </button>
          )}
        </div>

        {started &&
          !answerVisible &&
          !audienceMode && (
            <section className="answer-control-panel">
              <div className="control-title">
                <div>
                  <div className="eyebrow">MC / KỸ THUẬT</div>
                  <h2>Đội nào vừa giành quyền?</h2>
                </div>
                {timerExpired ? (
                  <strong className="expired-badge">⏱ HẾT GIỜ — MC XÁC NHẬN</strong>
                ) : (
                  <span className="waiting-badge">ĐANG CHỜ TRẢ LỜI</span>
                )}
              </div>

              <div className="team-answer-grid">
                {teams.map((team) => {
                  const state: TeamState = wrongTeams.includes(team.id)
                    ? "wrong"
                    : "available";
                  return (
                    <button
                      key={team.id}
                      className={`answer-team-card ${
                        selectedTeam === team.id ? "selected" : ""
                      } ${state === "wrong" ? "wrong" : ""}`}
                      disabled={state === "wrong"}
                      onClick={() => setSelectedTeam(team.id)}
                    >
                      <span className="team-color" style={{ background: team.color }} />
                      <strong>{teamShort(team.name)}</strong>
                      <b>
                        {state === "wrong"
                          ? "ĐÃ TRẢ LỜI SAI"
                          : selectedTeam === team.id
                          ? "ĐANG TRẢ LỜI"
                          : "CHỌN ĐỘI"}
                      </b>
                    </button>
                  );
                })}
              </div>

              <div className="answer-action-row">
                <button className="wrong-action" disabled={!selectedTeam} onClick={markWrong}>
                  ✕ SAI — ĐỘI KHÁC TRẢ LỜI
                </button>
                <button className="correct-action" disabled={!selectedTeam} onClick={markCorrect}>
                  ✓ ĐÚNG — +{config.points} ĐIỂM
                </button>
                <button
                  className="audience-action"
                  disabled={!timerExpired && !allTeamsWrong}
                  onClick={() => {
                    setAudienceMode(true);
                    setTimerRunning(false);
                    setSelectedTeam(null);
                  }}
                >
                  🎤 KHÁN GIẢ TRẢ LỜI
                </button>
              </div>
            </section>
          )}

        {audienceMode && !answerVisible && (
          <section className="audience-panel">
            <div className="eyebrow">PHẦN THI KHÁN GIẢ</div>
            <h2>Các đội không còn được cộng điểm</h2>
            <p>Khán giả trả lời. MC/Kỹ thuật bấm xác nhận khi có đáp án.</p>
            <div className="audience-actions">
              <button className="correct-action" onClick={markAudienceCorrect}>
                ✓ ĐÚNG / HIỂN THỊ ĐÁP ÁN
              </button>
              <button className="wrong-action" onClick={backToTeams}>
                ← QUAY LẠI CÁC ĐỘI
              </button>
            </div>
          </section>
        )}

        {answerVisible && (
          <section className={`answer-result-panel ${winner ? "team-win" : "audience-win"}`}>
            <div>
              <div className="eyebrow">{winner ? "CHÍNH XÁC!" : "ĐÁP ÁN"}</div>
              <h2>{question.answer || "Chưa nhập đáp án"}</h2>
              <p>
                {winner
                  ? `${teams.find((team) => team.id === winner)?.name} +${config.points} điểm`
                  : audienceSolved
                  ? "Khán giả trả lời đúng • Không cộng điểm"
                  : ""}
              </p>
            </div>
            <button className="primary-button" onClick={nextQuestion}>
              {hasNext ? "TIẾP TỤC →" : "KẾT THÚC VÒNG 3"}
            </button>
          </section>
        )}
      </section>

      {finished && (
        <div className="stage-modal">
          <section className="vertical-win-card">
            <div className="eyebrow">VÒNG 3 • HOÀN THÀNH</div>
            <h2>🏁 TĂNG TỐC</h2>
            <p>Các câu hỏi đã hoàn tất. Điểm số đã được cộng vào bảng tổng.</p>
            <button className="primary-button" onClick={() => {
              setFinished(false);
              resetQuestion(0);
            }}>
              XEM LẠI VÒNG 3
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
