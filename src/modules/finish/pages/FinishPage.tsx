import { useState, useEffect } from "react";
import { useFinishStore } from "../store/finishStore";
import { useGameStore } from "../../../core/store/gameStore";
import type { TeamId } from "../../../core/types/game";

const youtubeEmbedUrl = (url: string) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
    }
  } catch {
    return "";
  }
  return "";
};

export function FinishPage() {
  const finish = useFinishStore();
  const teams = useGameStore((state) => state.teams);
  const addScore = useGameStore((state) => state.addScore);

  const [pendingTeamId, setPendingTeamId] = useState<TeamId | null>(null);
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (!finish.isTimerRunning) return;
    const interval = setInterval(() => {
      finish.tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [finish.isTimerRunning, finish.tickTimer]);

  const currentPkg = finish.packages.find((p) => p.id === finish.currentPackageId);
  const currentQuestion = currentPkg?.questions[finish.currentQuestionIndex] ?? null;
  const currentTeam = finish.currentTeamId
    ? teams.find((t) => t.id === finish.currentTeamId) ?? null
    : null;

  const handleMarkCorrect = () => {
    if (!finish.currentTeamId || !currentQuestion) return;
    const pts = finish.starActive ? currentQuestion.points * 2 : currentQuestion.points;
    addScore(finish.currentTeamId, pts, "finish");
    finish.markCorrect();
  };

  const handleMarkWrong = () => {
    if (!finish.currentTeamId || !currentQuestion) return;
    if (finish.starActive) {
      addScore(finish.currentTeamId, -currentQuestion.points, "finish");
    }
    finish.markWrong();
  };

  const handleStealCorrect = () => {
    if (!finish.selectedStealTeamId || !currentQuestion) return;
    addScore(finish.selectedStealTeamId, currentQuestion.points, "finish");
    if (finish.currentTeamId) {
      addScore(finish.currentTeamId, -currentQuestion.points, "finish");
    }
    finish.markStealCorrect();
  };

  const handleStealWrong = () => {
    if (!finish.selectedStealTeamId || !currentQuestion) return;
    if (finish.starActive) {
      addScore(finish.selectedStealTeamId, -currentQuestion.points, "finish");
    }
    finish.markStealWrong();
  };

  if (finish.status === "finished") {
    return (
      <section className="finish-page">
        <div className="finish-finale">
          <div className="finish-finale-badge">VÒNG 4</div>
          <div className="finish-finale-star">★</div>
          <h1>VỀ ĐÍCH</h1>
          <p>PHẦN THI ĐÃ HOÀN THÀNH</p>
          <div className="finish-final-scoreboard">
            {teams
              .slice()
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((team, index) => (
                <div key={team.id} className="finish-final-score-row">
                  <span className="finish-final-rank">{index + 1}</span>
                  <strong>{team.name}</strong>
                  <b>{team.totalScore}</b>
                </div>
              ))}
          </div>
          <div className="finish-finale-message">CHÚC MỪNG CÁC ĐỘI THI!</div>
          <button className="finish-primary-button" onClick={finish.resetRound}>
            CHƠI LẠI VÒNG 4
          </button>
        </div>
      </section>
    );
  }

  if (finish.status === "selection") {
    const selectedTeam = pendingTeamId
      ? teams.find((t) => t.id === pendingTeamId) ?? null
      : null;
    const selectedPackage = pendingPackageId
      ? finish.packages.find((p) => p.id === pendingPackageId) ?? null
      : null;

    const availableTeams = teams.filter(
      (team) => !finish.packages.some((pkg) => pkg.selectedBy === team.id)
    );
    const availablePackages = finish.packages.filter((pkg) => pkg.selectedBy === null);

    const handleAssignPackage = () => {
      if (!pendingTeamId || !pendingPackageId) return;
      const success = finish.selectPackage(pendingTeamId, pendingPackageId);
      if (success) {
        setPendingTeamId(null);
        setPendingPackageId(null);
      }
    };

    return (
      <section className="finish-page finish-selection-page">
        <div className="finish-page-inner">
          <header className="finish-hero finish-selection-hero">
            <div className="finish-round-label">VÒNG 4</div>
            <h1>VỀ ĐÍCH</h1>
            <div className="finish-hero-line" />
            <p>GHÉP ĐỘI THI VỚI GÓI CÂU HỎI</p>
          </header>

          <main className="finish-assignment-layout">
            <section className="finish-assignment-section finish-team-section">
              <div className="finish-assignment-section-header">
                <div className="finish-assignment-index">01</div>
                <div>
                  <span>CHỌN ĐỘI THI</span>
                  <small>Chọn đội đang chuẩn bị thi</small>
                </div>
              </div>
              <div className="finish-assignment-team-list">
                {availableTeams.length === 0 ? (
                  <div className="finish-assignment-empty">TẤT CẢ ĐỘI ĐÃ ĐƯỢC GÁN</div>
                ) : (
                  availableTeams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      className={`finish-team-select-card ${pendingTeamId === team.id ? "selected" : ""}`}
                      onClick={() => setPendingTeamId(team.id)}
                    >
                      <span className="finish-team-select-check">{pendingTeamId === team.id ? "✓" : ""}</span>
                      <div className="finish-team-select-name">{team.name}</div>
                      <div className="finish-team-select-score">
                        <small>ĐIỂM</small>
                        <strong>{team.totalScore}</strong>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="finish-assignment-section finish-mapping-section">
              <div className="finish-assignment-section-header">
                <div className="finish-assignment-index">02</div>
                <div>
                  <span>GHÉP ĐANG CHỌN</span>
                  <small>Xác nhận đội và gói câu hỏi</small>
                </div>
              </div>
              <div className="finish-mapping-card">
                <div className="finish-mapping-label">ĐỘI THI</div>
                <div className={`finish-mapping-value ${selectedTeam ? "active" : ""}`}>
                  {selectedTeam?.name ?? <span>Chưa chọn đội</span>}
                </div>
                <div className="finish-mapping-arrow">↓</div>
                <div className="finish-mapping-label">GÓI CÂU HỎI</div>
                <div className={`finish-mapping-value ${selectedPackage ? "active" : ""}`}>
                  {selectedPackage?.label ?? <span>Chưa chọn gói</span>}
                </div>
                <button
                  type="button"
                  className="finish-primary-button finish-assignment-submit"
                  disabled={!pendingTeamId || !pendingPackageId}
                  onClick={handleAssignPackage}
                >
                  GÁN ĐỘI VÀO GÓI <span>→</span>
                </button>
              </div>
              <div className="finish-assignment-hint">
                {!selectedTeam && "① Chọn một đội thi bên trái"}
                {selectedTeam && !selectedPackage && "② Chọn một gói câu hỏi bên phải"}
                {selectedTeam && selectedPackage && "③ Kiểm tra và xác nhận ghép đội"}
              </div>
            </section>

            <section className="finish-assignment-section finish-package-section">
              <div className="finish-assignment-section-header">
                <div className="finish-assignment-index">03</div>
                <div>
                  <span>CHỌN GÓI CÂU HỎI</span>
                  <small>Mỗi gói chỉ được chọn một lần</small>
                </div>
              </div>
              <div className="finish-assignment-package-list">
                {availablePackages.length === 0 ? (
                  <div className="finish-assignment-empty">TẤT CẢ GÓI ĐÃ ĐƯỢC CHỌN</div>
                ) : (
                  availablePackages.map((pkg, index) => (
                    <button
                      key={pkg.id}
                      type="button"
                      className={`finish-package-select-card ${pendingPackageId === pkg.id ? "selected" : ""}`}
                      onClick={() => setPendingPackageId(pkg.id)}
                    >
                      <div className="finish-package-select-number">{String(index + 1).padStart(2, "0")}</div>
                      <div className="finish-package-select-info">
                        <strong>{pkg.label}</strong>
                        <span>5 CÂU HỎI</span>
                      </div>
                      <div className="finish-package-select-arrow">
                        {pendingPackageId === pkg.id ? "✓" : "→"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          </main>

          {finish.selectionOrder.length > 0 && (
            <section className="finish-assigned-summary">
              <div className="finish-assigned-summary-header">
                <span>TIẾN ĐỘ GÁN GÓI</span>
                <strong>{finish.selectionOrder.length} / 4</strong>
              </div>
              <div className="finish-assigned-summary-list">
                {finish.selectionOrder.map((teamId, index) => {
                  const team = teams.find((t) => t.id === teamId);
                  const pkg = finish.packages.find((p) => p.selectedBy === teamId);
                  if (!team || !pkg) return null;
                  return (
                    <div key={teamId} className="finish-assigned-summary-item">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{team.name}</strong>
                      <b>→</b>
                      <em>{pkg.label}</em>
                      <small>ĐÃ GÁN</small>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <footer className="finish-public-footer">
            <div className="finish-scoreboard">
              {teams
                .slice()
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((team) => (
                  <div key={team.id} className="finish-score-team">
                    <span>{team.name}</span>
                    <strong>{team.totalScore}</strong>
                  </div>
                ))}
            </div>
            <div className="finish-footer-brand">
              <span>THE BANACODE</span>
              <strong>HÀNH TRÌNH 19 NĂM</strong>
            </div>
          </footer>
        </div>
      </section>
    );
  }

  if (!currentPkg || !currentQuestion) {
    return (
      <section className="finish-page">
        <div className="finish-empty">
          <div className="finish-round-label">VÒNG 4</div>
          <h1>VỀ ĐÍCH</h1>
          <p>Chưa có câu hỏi đang diễn ra.</p>
        </div>
      </section>
    );
  }

  const embedUrl = currentQuestion.isVideo ? youtubeEmbedUrl(currentQuestion.youtubeUrl) : "";
  const isStarDecision = finish.questionPhase === "star_decision";
  const isIntro = finish.questionPhase === "intro";
  const isPlaying = finish.questionPhase === "playing";
  const isSteal = finish.questionPhase === "steal";
  const isResolved = finish.questionPhase === "resolved";

  const timerText = `${String(Math.floor(finish.timerSeconds / 60)).padStart(2, "0")}:${String(finish.timerSeconds % 60).padStart(2, "0")}`;

  return (
    <section className="finish-page">
      <div className="finish-page-inner">
        <header className="finish-game-header">
          <div className="finish-game-title">
            <div className="finish-round-label">VÒNG 4</div>
            <h1>VỀ ĐÍCH</h1>
          </div>
          <div className="finish-game-meta">
            <div>
              <span>GÓI</span>
              <strong>{currentPkg.label}</strong>
            </div>
            <div>
              <span>CÂU</span>
              <strong>
                {finish.currentQuestionIndex + 1}
                <small>/{currentPkg.questions.length}</small>
              </strong>
            </div>
            <div>
              <span>ĐỘ KHÓ</span>
              <strong
                style={{
                  color:
                    currentQuestion.difficulty === "easy"
                      ? "#4CAF50"
                      : currentQuestion.difficulty === "medium"
                      ? "#FF9800"
                      : "#f44336",
                }}
              >
                {currentQuestion.difficulty.toUpperCase()}
              </strong>
            </div>
            <div className="finish-current-team">
              <span>ĐANG THI</span>
              <strong>{currentTeam?.name ?? "ĐỘI THI"}</strong>
            </div>
          </div>
        </header>

        <main className="finish-question-area">
          {isStarDecision && (
            <div className="finish-public-star-decision">
              <div className="finish-star-glow">★</div>
              <div className="finish-star-caption">NGÔI SAO HY VỌNG</div>
              <h2>{currentTeam?.name}</h2>
              <p>
                Có muốn sử dụng <strong>NGÔI SAO HY VỌNG</strong> cho câu hỏi này?
              </p>
              <div className="finish-star-question">MC/KỸ THUẬT ĐANG CHỜ QUYẾT ĐỊNH</div>
              <div className="finish-star-actions">
                <button className="finish-star-yes" onClick={() => finish.decideStar(true)}>
                  ★ DÙNG NGÔI SAO
                </button>
                <button className="finish-star-no" onClick={() => finish.decideStar(false)}>
                  KHÔNG DÙNG
                </button>
              </div>
            </div>
          )}

          {isIntro && (
            <div className="finish-question-display" style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#B87A2E", marginBottom: "12px" }}>
                CÂU HỎI {finish.currentQuestionIndex + 1}
              </div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", margin: "0 0 12px" }}>
                Mức độ{" "}
                <span
                  style={{
                    color:
                      currentQuestion.difficulty === "easy"
                        ? "#4CAF50"
                        : currentQuestion.difficulty === "medium"
                        ? "#FF9800"
                        : "#f44336",
                  }}
                >
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
              </h2>
              <p style={{ fontSize: "18px", color: "#4E2E00", fontWeight: "600" }}>
                {currentQuestion.points} điểm
                {finish.starActive && " (đã chọn Ngôi sao hy vọng)"}
              </p>
              <button
                className="finish-primary-button"
                onClick={finish.startQuestion}
                style={{ marginTop: "20px", minWidth: "200px" }}
              >
                BẮT ĐẦU CÂU HỎI
              </button>
            </div>
          )}

          {(isPlaying || isSteal || isResolved) && (
            <>
              <div className="finish-question-topline">
                <span>CÂU {finish.currentQuestionIndex + 1}</span>
                {finish.starActive && <strong>★ NGÔI SAO HY VỌNG</strong>}
                {isPlaying && (
                  <span style={{ fontFamily: "monospace", fontSize: "20px", fontWeight: "bold" }}>
                    ⏱ {timerText}
                  </span>
                )}
              </div>

              <div className="finish-question-display">
                <h2>{currentQuestion.text || "CÂU HỎI ĐANG ĐƯỢC CHUẨN BỊ"}</h2>
                {currentQuestion.isVideo && embedUrl && (
                  <div className="finish-public-video">
                    <iframe
                      src={embedUrl}
                      title={`Video câu hỏi ${finish.currentQuestionIndex + 1}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {currentQuestion.isVideo && !embedUrl && (
                  <div className="finish-public-video-empty">VIDEO CÂU HỎI CHƯA CÓ URL</div>
                )}
              </div>

              <div className="finish-live-control-panel">
                {isPlaying && (
                  <div className="finish-judgement-panel">
                    <div className="finish-judgement-title">
                      {finish.starActive ? "★ NGÔI SAO HY VỌNG" : "KẾT QUẢ CÂU HỎI"}
                    </div>
                    <p>
                      {finish.starActive
                        ? "Đúng +" + currentQuestion.points * 2 + " điểm · Sai → các đội còn lại được quyền cướp"
                        : "Đúng +" + currentQuestion.points + " điểm · Sai 0 điểm"}
                    </p>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                      {!finish.isTimerRunning && (
                        <button
                          className="finish-primary-button"
                          onClick={finish.startTimer}
                          style={{ minWidth: "140px" }}
                        >
                          ▶ BẮT ĐẦU TÍNH GIỜ
                        </button>
                      )}
                      <button className="finish-correct-button" onClick={handleMarkCorrect}>
                        ✓ ĐÚNG
                      </button>
                      <button className="finish-wrong-button" onClick={handleMarkWrong}>
                        ✕ SAI
                      </button>
                    </div>
                  </div>
                )}

                {isSteal && (
                  <div className="finish-steal-panel">
                    <div className="finish-judgement-title">CƠ HỘI CƯỚP ĐIỂM</div>
                    <p>Chọn một trong các đội còn lại để trả lời.</p>
                    <div className="finish-steal-team-grid">
                      {teams
                        .filter((team) => team.id !== finish.currentTeamId)
                        .map((team) => (
                          <button
                            key={team.id}
                            className={`finish-steal-team ${
                              finish.selectedStealTeamId === team.id ? "selected" : ""
                            }`}
                            onClick={() => finish.selectStealTeam(team.id)}
                            style={
                              finish.selectedStealTeamId === team.id
                                ? { borderColor: "#FFD700", background: "rgba(255,215,0,0.15)" }
                                : {}
                            }
                          >
                            {team.name}
                          </button>
                        ))}
                    </div>
                    {finish.selectedStealTeamId && (
                      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "12px" }}>
                        <button className="finish-correct-button" onClick={handleStealCorrect}>
                          ✓ ĐÚNG
                        </button>
                        <button className="finish-wrong-button" onClick={handleStealWrong}>
                          ✕ SAI
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isResolved && (
                  <div className="finish-next-panel">
                    <div className="finish-result-message">
                      Câu hỏi đã được chấm.
                      {finish.starActive && <span style={{ marginLeft: "12px" }}>★ Ngôi sao đã sử dụng</span>}
                    </div>
                    {finish.currentQuestionIndex + 1 < currentPkg.questions.length ? (
                      <button className="finish-primary-button" onClick={finish.advanceQuestion}>
                        CÂU TIẾP THEO →
                      </button>
                    ) : (
                      <button className="finish-primary-button" onClick={finish.nextTeam}>
                        HOÀN THÀNH GÓI →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        <footer className="finish-public-footer">
          <div className="finish-scoreboard">
            {teams
              .slice()
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((team) => (
                <div
                  key={team.id}
                  className={`finish-score-team ${team.id === finish.currentTeamId ? "active" : ""}`}
                >
                  <span>{team.name}</span>
                  <strong>{team.totalScore}</strong>
                </div>
              ))}
          </div>
          <div className="finish-footer-brand">
            <span>THE BANACODE</span>
            <strong>HÀNH TRÌNH 19 NĂM</strong>
          </div>
        </footer>
      </div>
    </section>
  );
}
