import { useEffect, useMemo, useState } from "react";
import { useFinishStore } from "../store/finishStore";
import { useGameStore } from "../../../core/store/gameStore";
import { addScore } from "../../../core/scoring/scoring";
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

const difficultyLabels = {
  easy: { label: "DỄ", icon: "🟢", points: 10 },
  medium: { label: "VỪA", icon: "🟡", points: 20 },
  hard: { label: "KHÓ", icon: "🔴", points: 30 },
};

export function FinishPage() {
  const finish = useFinishStore();
  const teams = useGameStore((state) => state.teams);
  const addScoreLocal = useGameStore((state) => state.addScore);

  // Local state cho việc đã xử lý lastResult
  const [processingResult, setProcessingResult] = useState(false);

  // Lấy thông tin hiện tại
  const currentPackage = useMemo(
    () => finish.packages.find((pkg) => pkg.id === finish.currentPackageId) ?? null,
    [finish.packages, finish.currentPackageId]
  );

  const currentQuestion = useMemo(() => {
    if (!currentPackage) return null;
    return currentPackage.questions[finish.currentQuestionIndex] ?? null;
  }, [currentPackage, finish.currentQuestionIndex]);

  const currentTeam = useMemo(
    () => (finish.currentTeamId ? teams.find((t) => t.id === finish.currentTeamId) ?? null : null),
    [teams, finish.currentTeamId]
  );

  const selectedStealTeam = useMemo(
    () => (finish.selectedStealTeamId ? teams.find((t) => t.id === finish.selectedStealTeamId) ?? null : null),
    [teams, finish.selectedStealTeamId]
  );

  const embedUrl = currentQuestion?.isVideo ? youtubeEmbedUrl(currentQuestion.youtubeUrl) : "";

  // Xử lý lastResult (cộng/trừ điểm)
  useEffect(() => {
    if (processingResult) return;
    if (!finish.lastResult) return;
    if (finish.questionPhase !== "resolved") return;

    setProcessingResult(true);

    const { correct, points, teamId } = finish.lastResult;
    if (teamId && points > 0) {
      if (correct) {
        addScoreLocal(teamId, points, "finish");
      } else {
        // Trừ điểm (có thể âm)
        addScoreLocal(teamId, -points, "finish");
      }
    }

    // Reset after a short delay
    setTimeout(() => {
      setProcessingResult(false);
    }, 300);
  }, [finish.lastResult, finish.questionPhase, processingResult, addScoreLocal]);

  // Timer
  useEffect(() => {
    if (!finish.isTimerRunning) return;
    if (finish.timerSeconds <= 0) {
      // Hết giờ => tự động mark wrong
      if (finish.questionPhase === "playing") {
        finish.markWrong();
      }
      return;
    }

    const interval = setInterval(() => {
      finish.tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [finish.isTimerRunning, finish.timerSeconds, finish.questionPhase, finish]);

  // ==================== MÀN HÌNH SELECTION ====================
  if (finish.status === "selection") {
    const [pendingTeamId, setPendingTeamId] = useState<TeamId | null>(null);
    const [pendingPackageId, setPendingPackageId] = useState<string | null>(null);

    const availableTeams = teams.filter(
      (team) => !finish.packages.some((pkg) => pkg.selectedBy === team.id)
    );

    const availablePackages = finish.packages.filter((pkg) => pkg.selectedBy === null);

    const selectedTeam = pendingTeamId ? teams.find((t) => t.id === pendingTeamId) ?? null : null;
    const selectedPackage = pendingPackageId
      ? finish.packages.find((p) => p.id === pendingPackageId) ?? null
      : null;

    const handleAssign = () => {
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
            {/* Cột 1: Chọn đội */}
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

            {/* Cột 2: Ghép đang chọn */}
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
                  onClick={handleAssign}
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

            {/* Cột 3: Chọn gói */}
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
                      <div className="finish-package-select-arrow">{pendingPackageId === pkg.id ? "✓" : "→"}</div>
                    </button>
                  ))
                )}
              </div>
            </section>
          </main>

          {/* Tiến độ gán */}
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

          {/* Bảng điểm cuối */}
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

  // ==================== MÀN HÌNH CHƠI ====================
  if (finish.status === "playing") {
    if (!currentPackage || !currentQuestion || !currentTeam) {
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

    const question = currentQuestion;
    const diffInfo = difficultyLabels[question.difficulty];
    const isStarPhase = finish.questionPhase === "star_decision";
    const isIntroPhase = finish.questionPhase === "intro";
    const isPlayingPhase = finish.questionPhase === "playing";
    const isStealPhase = finish.questionPhase === "steal";
    const isResolved = finish.questionPhase === "resolved";

    // Hiển thị giới thiệu và quyết định sao
    if (isIntroPhase || isStarPhase) {
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
                  <strong>{currentPackage.label}</strong>
                </div>
                <div>
                  <span>CÂU</span>
                  <strong>
                    {finish.currentQuestionIndex + 1}
                    <small>/{currentPackage.questions.length}</small>
                  </strong>
                </div>
                <div className="finish-current-team">
                  <span>ĐANG THI</span>
                  <strong>{currentTeam.name}</strong>
                </div>
              </div>
            </header>

            <main className="finish-question-area">
              <div className="finish-intro-card">
                <div className="finish-intro-icon">{diffInfo.icon}</div>
                <div className="finish-intro-label">CÂU HỎI {diffInfo.label}</div>
                <div className="finish-intro-points">+{diffInfo.points} ĐIỂM</div>

                {isStarPhase && (
                  <div className="finish-star-decision-area">
                    <div className="finish-star-glow">★</div>
                    <div className="finish-star-caption">NGÔI SAO HY VỌNG</div>
                    <h2>{currentTeam.name}</h2>
                    <p>
                      Có muốn sử dụng <strong>NGÔI SAO HY VỌNG</strong> cho câu hỏi này?
                    </p>
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

                {isIntroPhase && !finish.starDecisionPending && (
                  <button className="finish-primary-button" onClick={finish.startQuestion}>
                    BẮT ĐẦU CÂU HỎI →
                  </button>
                )}
              </div>
            </main>

            <footer className="finish-public-footer">
              <div className="finish-scoreboard">
                {teams
                  .slice()
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((team) => (
                    <div key={team.id} className={`finish-score-team ${team.id === finish.currentTeamId ? "active" : ""}`}>
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

    // ============ ĐANG HIỂN THỊ CÂU HỎI ============
    if (isPlayingPhase) {
      const timerDisplay = `${String(Math.floor(finish.timerSeconds / 60)).padStart(2, "0")}:${String(
        finish.timerSeconds % 60
      ).padStart(2, "0")}`;

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
                  <strong>{currentPackage.label}</strong>
                </div>
                <div>
                  <span>CÂU</span>
                  <strong>
                    {finish.currentQuestionIndex + 1}
                    <small>/{currentPackage.questions.length}</small>
                  </strong>
                </div>
                <div className="finish-current-team">
                  <span>ĐANG THI</span>
                  <strong>{currentTeam.name}</strong>
                </div>
                <div>
                  <span>⏱</span>
                  <strong className={finish.timerSeconds <= 5 ? "finish-timer-danger" : ""}>{timerDisplay}</strong>
                </div>
              </div>
            </header>

            <main className="finish-question-area">
              <div className="finish-question-topline">
                <span>
                  {diffInfo.icon} CÂU {diffInfo.label} • {diffInfo.points} ĐIỂM
                  {finish.starActive && " ★ NGÔI SAO HY VỌNG"}
                </span>
                {!finish.isTimerRunning && (
                  <button className="finish-primary-button" onClick={finish.startTimer}>
                    ▶ BẮT ĐẦU TÍNH GIỜ
                  </button>
                )}
                {finish.isTimerRunning && <span className="finish-timer-running">⏱ ĐANG ĐẾM GIỜ</span>}
              </div>

              <div className="finish-question-display">
                <h2>{question.text || "CÂU HỎI ĐANG ĐƯỢC CHUẨN BỊ"}</h2>

                {question.isVideo && embedUrl && (
                  <div className="finish-public-video">
                    <iframe
                      src={embedUrl}
                      title={`Video câu hỏi ${finish.currentQuestionIndex + 1}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {question.isVideo && !embedUrl && (
                  <div className="finish-public-video-empty">VIDEO CÂU HỎI CHƯA CÓ URL</div>
                )}
              </div>

              {/* Khu vực MC điều khiển */}
              <div className="finish-live-control-panel">
                <div className="finish-live-answer">
                  <span>ĐÁP ÁN THAM KHẢO</span>
                  <strong>{question.answer || "Chưa nhập đáp án."}</strong>
                </div>

                <div className="finish-judgement-panel">
                  <div className="finish-judgement-title">KẾT QUẢ CÂU HỎI</div>
                  <p>
                    {finish.starActive
                      ? `Đúng +${question.points * 2} điểm · Sai -${question.points} điểm`
                      : `Đúng +${question.points} điểm · Sai 0 điểm`}
                  </p>
                  <div className="finish-judgement-actions">
                    <button className="finish-correct-button" onClick={finish.markCorrect}>
                      ✓ ĐÚNG
                    </button>
                    <button className="finish-wrong-button" onClick={finish.markWrong}>
                      ✕ SAI
                    </button>
                  </div>
                </div>
              </div>
            </main>

            <footer className="finish-public-footer">
              <div className="finish-scoreboard">
                {teams
                  .slice()
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((team) => (
                    <div key={team.id} className={`finish-score-team ${team.id === finish.currentTeamId ? "active" : ""}`}>
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

    // ============ PHA CƯỚP ============
    if (isStealPhase) {
      const stealableTeams = teams.filter((t) => t.id !== finish.currentTeamId);

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
                  <strong>{currentPackage.label}</strong>
                </div>
                <div>
                  <span>CÂU</span>
                  <strong>
                    {finish.currentQuestionIndex + 1}
                    <small>/{currentPackage.questions.length}</small>
                  </strong>
                </div>
                <div className="finish-current-team">
                  <span>ĐANG THI</span>
                  <strong>{currentTeam.name}</strong>
                </div>
              </div>
            </header>

            <main className="finish-question-area">
              <div className="finish-steal-panel">
                <div className="finish-judgement-title">CƠ HỘI CƯỚP ĐIỂM</div>
                <p>
                  {currentTeam.name} đã trả lời sai.
                  {finish.starActive && ` (${currentTeam.name} bị -${question.points} điểm)`}
                  <br />
                  Chọn một đội để trả lời cướp điểm:
                </p>
                <div className="finish-steal-team-grid">
                  {stealableTeams.map((team) => (
                    <button
                      key={team.id}
                      className={`finish-steal-team ${finish.selectedStealTeamId === team.id ? "selected" : ""}`}
                      onClick={() => finish.selectStealTeam(team.id)}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
                {finish.selectedStealTeamId && (
                  <div className="finish-judgement-panel">
                    <div className="finish-judgement-title">ĐỘI TRẢ LỜI CƯỚP</div>
                    <strong className="finish-steal-selected-team">
                      {selectedStealTeam?.name ?? "ĐỘI CƯỚP ĐIỂM"}
                    </strong>
                    <p>
                      Đúng +{question.points} điểm
                      {finish.starActive && ` · Sai -${question.points} điểm`}
                    </p>
                    <div className="finish-judgement-actions">
                      <button className="finish-correct-button" onClick={finish.markStealCorrect}>
                        ✓ ĐÚNG
                      </button>
                      <button className="finish-wrong-button" onClick={finish.markStealWrong}>
                        ✕ SAI
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </main>

            <footer className="finish-public-footer">
              <div className="finish-scoreboard">
                {teams
                  .slice()
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((team) => (
                    <div key={team.id} className={`finish-score-team ${team.id === finish.currentTeamId ? "active" : ""}`}>
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

    // ============ ĐÃ CHẤM XONG (RESOLVED) ============
    if (isResolved) {
      const result = finish.lastResult;
      const isCorrect = result?.correct ?? false;
      const points = result?.points ?? 0;
      const teamName = result?.teamId ? teams.find((t) => t.id === result.teamId)?.name ?? "" : "";

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
                  <strong>{currentPackage.label}</strong>
                </div>
                <div>
                  <span>CÂU</span>
                  <strong>
                    {finish.currentQuestionIndex + 1}
                    <small>/{currentPackage.questions.length}</small>
                  </strong>
                </div>
                <div className="finish-current-team">
                  <span>ĐANG THI</span>
                  <strong>{currentTeam.name}</strong>
                </div>
              </div>
            </header>

            <main className="finish-question-area">
              <div className="finish-result-panel">
                <div className="finish-result-icon">{isCorrect ? "🎉" : "😞"}</div>
                <div className="finish-result-title">{isCorrect ? "CHÍNH XÁC!" : "CHƯA ĐÚNG"}</div>
                {teamName && (
                  <div className="finish-result-team">
                    {teamName} {isCorrect ? `+${points}` : `-${points}`} điểm
                  </div>
                )}
                {!teamName && points > 0 && <div className="finish-result-team">+{points} điểm</div>}
                <div className="finish-result-actions">
                  {finish.currentQuestionIndex < currentPackage.questions.length - 1 ? (
                    <button className="finish-primary-button" onClick={finish.advanceQuestion}>
                      CÂU TIẾP THEO →
                    </button>
                  ) : (
                    <button className="finish-primary-button" onClick={finish.advanceQuestion}>
                      KẾT THÚC GÓI →
                    </button>
                  )}
                </div>
              </div>
            </main>

            <footer className="finish-public-footer">
              <div className="finish-scoreboard">
                {teams
                  .slice()
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((team) => (
                    <div key={team.id} className={`finish-score-team ${team.id === finish.currentTeamId ? "active" : ""}`}>
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

    return null;
  }

  // ==================== KẾT THÚC ====================
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

  // Fallback
  return (
    <section className="finish-page">
      <div className="finish-empty">
        <div className="finish-round-label">VÒNG 4</div>
        <h1>VỀ ĐÍCH</h1>
        <p>Chưa có dữ liệu.</p>
      </div>
    </section>
  );
}
