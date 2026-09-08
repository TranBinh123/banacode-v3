import { useMemo } from "react";
import { useFinishStore } from "../../modules/finish/store/finishStore";
import { useGameStore } from "../../core/store/gameStore";
import type { TeamId } from "../../core/types/game";

const youtubeEmbedUrl = (url: string) => {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      if (parsed.pathname.startsWith("/embed/")) {
        return url;
      }
    }
  } catch {
    return "";
  }

  return "";
};

export function FinishAdmin() {
  const finish = useFinishStore();
  const teams = useGameStore((state) => state.teams);
  const addScore = useGameStore((state) => state.addScore);

  const currentPackage = useMemo(
    () =>
      finish.packages.find(
        (pkg) => pkg.id === finish.currentPackageId,
      ) ?? null,
    [finish.packages, finish.currentPackageId],
  );

  const currentQuestion =
    currentPackage?.questions[finish.currentQuestionIndex] ?? null;

  const currentTeam = currentPackage?.selectedBy
    ? teams.find((team) => team.id === currentPackage.selectedBy)
    : null;

  const remainingTeams = teams.filter(
    (team) =>
      team.id !== currentPackage?.selectedBy &&
      team.id !== finish.stealTeamId,
  );

  const selectTeamForSteal = (teamId: TeamId) => {
    finish.selectStealTeam(teamId);
  };

  const handleCorrect = () => {
    if (!currentPackage || !currentQuestion) return;

    if (finish.resolution === "awaiting-main-result") {
      addScore(currentPackage.selectedBy!, 10, "finish");
      finish.markCorrect();
      return;
    }

    if (
      finish.resolution === "awaiting-steal-result" &&
      finish.stealTeamId
    ) {
      addScore(finish.stealTeamId, 20, "finish");
      addScore(currentPackage.selectedBy!, -10, "finish");
      finish.markStealCorrect();
    }
  };

  const handleWrong = () => {
    if (!currentPackage || !currentQuestion) return;

    if (finish.resolution === "awaiting-main-result") {
      if (finish.starActive) {
        finish.markWrong();
      } else {
        finish.markWrong();
      }
      return;
    }

    if (finish.resolution === "awaiting-steal-result") {
      finish.markStealWrong();
    }
  };

  if (finish.status === "finished") {
    return (
      <section className="finish-admin">
        <div className="finish-admin-card">
          <div className="finish-kicker">VÒNG 4</div>
          <h1>VỀ ĐÍCH</h1>
          <p>Phần thi đã hoàn thành.</p>

          <button
            className="finish-primary-button"
            onClick={finish.resetGame}
          >
            Chơi lại Vòng 4
          </button>
        </div>
      </section>
    );
  }

  if (finish.status === "selection") {
    const currentSelectionTeam = teams.find(
      (team) => team.id === finish.selectionTeamId,
    );

    return (
      <section className="finish-admin">
        <div className="finish-admin-header">
          <div>
            <div className="finish-kicker">QUẢN TRỊ VÒNG 4</div>
            <h1>VỀ ĐÍCH</h1>
            <p>
              Chọn gói câu hỏi lần lượt cho từng đội. Mỗi gói chỉ được
              chọn một lần.
            </p>
          </div>
        </div>

        <div className="finish-selection-team">
          <span>ĐỘI ĐANG CHỌN</span>
          <strong>
            {currentSelectionTeam?.name ?? "Chưa xác định"}
          </strong>
        </div>

        <div className="finish-package-grid">
          {finish.packages.map((pkg) => {
            const selectedTeam = pkg.selectedBy
              ? teams.find((team) => team.id === pkg.selectedBy)
              : null;

            return (
              <button
                key={pkg.id}
                className={`finish-package-card ${
                  pkg.selectedBy ? "taken" : ""
                }`}
                disabled={Boolean(pkg.selectedBy)}
                onClick={() => finish.selectPackage(pkg.id)}
              >
                <span>{pkg.label}</span>

                {selectedTeam ? (
                  <small>Đã chọn: {selectedTeam.name}</small>
                ) : (
                  <small>Chưa chọn</small>
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (!currentPackage || !currentQuestion) {
    return (
      <section className="finish-admin">
        <div className="finish-admin-card">
          <h2>Chưa có câu hỏi đang diễn ra</h2>
        </div>
      </section>
    );
  }

  const isStarDecision =
    finish.starDecisionPending &&
    (finish.currentQuestionIndex === 3 ||
      finish.currentQuestionIndex === 4);

  const isMainResult =
    finish.resolution === "awaiting-main-result";

  const isStealSelection =
    finish.resolution === "selecting-steal-team";

  const isStealResult =
    finish.resolution === "awaiting-steal-result";

  const embedUrl = currentQuestion.isVideo
    ? youtubeEmbedUrl(currentQuestion.youtubeUrl)
    : "";

  return (
    <section className="finish-admin">
      <div className="finish-admin-header">
        <div>
          <div className="finish-kicker">QUẢN TRỊ VÒNG 4</div>
          <h1>VỀ ĐÍCH</h1>

          <div className="finish-admin-meta">
            <span>{currentPackage.label}</span>
            <span>
              CÂU {finish.currentQuestionIndex + 1}/
              {currentPackage.questions.length}
            </span>
            <strong>{currentTeam?.name}</strong>
          </div>
        </div>
      </div>

      <div className="finish-admin-main">
        {/* Không hiển thị nội dung Q4/Q5 trước khi đội quyết định
            có dùng Ngôi sao hy vọng hay không. */}
        {isStarDecision ? (
          <div className="finish-star-decision">
            <div className="finish-star-icon">★</div>

            <div className="finish-star-label">
              NGÔI SAO HY VỌNG
            </div>

            <h2>
              Đội {currentTeam?.name} có muốn sử dụng
              <br />
              Ngôi sao hy vọng cho câu này không?
            </h2>

            <p>
              Đây là cơ hội Ngôi sao duy nhất của đội trong toàn bộ
              gói câu hỏi.
            </p>

            <div className="finish-star-actions">
              <button
                className="finish-star-yes"
                onClick={finish.useStar}
              >
                ★ DÙNG NGÔI SAO
              </button>

              <button
                className="finish-star-no"
                onClick={finish.skipStar}
              >
                KHÔNG DÙNG
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="finish-question-card">
              <div className="finish-question-number">
                CÂU {finish.currentQuestionIndex + 1}
              </div>

              <h2>{currentQuestion.text}</h2>

              {currentQuestion.isVideo && embedUrl && (
                <div className="finish-video-wrapper">
                  <iframe
                    src={embedUrl}
                    title={`Video câu hỏi ${
                      finish.currentQuestionIndex + 1
                    }`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {currentQuestion.isVideo && !embedUrl && (
                <div className="finish-video-placeholder">
                  Chưa có URL YouTube hợp lệ.
                </div>
              )}

              <div className="finish-answer-box">
                <span>ĐÁP ÁN THAM KHẢO</span>
                <strong>{currentQuestion.answer}</strong>
              </div>
            </div>

            {isMainResult && (
              <div className="finish-judgement-panel">
                <div className="finish-judgement-title">
                  {finish.starActive
                    ? "NGÔI SAO HY VỌNG"
                    : "KẾT QUẢ CÂU HỎI"}
                </div>

                <p>
                  {finish.starActive
                    ? "Đội trả lời đúng được +20 điểm. Nếu sai, các đội còn lại được quyền cướp."
                    : "Đúng +10 điểm · Sai 0 điểm"}
                </p>

                <div className="finish-judgement-actions">
                  <button
                    className="finish-correct-button"
                    onClick={handleCorrect}
                  >
                    ✓ ĐÚNG
                  </button>

                  <button
                    className="finish-wrong-button"
                    onClick={handleWrong}
                  >
                    ✕ SAI
                  </button>
                </div>
              </div>
            )}

            {isStealSelection && (
              <div className="finish-steal-panel">
                <div className="finish-judgement-title">
                  CƠ HỘI CƯỚP ĐIỂM
                </div>

                <p>
                  Chọn một trong các đội còn lại để trả lời.
                </p>

                <div className="finish-steal-team-grid">
                  {remainingTeams.map((team) => (
                    <button
                      key={team.id}
                      className="finish-steal-team"
                      onClick={() => selectTeamForSteal(team.id)}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isStealResult && (
              <div className="finish-judgement-panel">
                <div className="finish-judgement-title">
                  {teams.find(
                    (team) => team.id === finish.stealTeamId,
                  )?.name ?? "ĐỘI CƯỚP ĐIỂM"}
                </div>

                <p>
                  Đúng +20 điểm · Đội sử dụng Ngôi sao −10 điểm
                </p>

                <div className="finish-judgement-actions">
                  <button
                    className="finish-correct-button"
                    onClick={handleCorrect}
                  >
                    ✓ ĐÚNG
                  </button>

                  <button
                    className="finish-wrong-button"
                    onClick={handleWrong}
                  >
                    ✕ SAI
                  </button>
                </div>
              </div>
            )}

            {finish.resolution === "resolved" && (
              <div className="finish-next-panel">
                <div className="finish-result-message">
                  Câu hỏi đã được chấm.
                </div>

                <button
                  className="finish-primary-button"
                  onClick={finish.advanceQuestion}
                >
                  {finish.currentQuestionIndex === 4
                    ? "Kết thúc phần thi"
                    : "Câu tiếp theo →"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="finish-admin-footer">
        <span>
          Ngôi sao:{" "}
          <strong>
            {currentPackage.starUsed ? "ĐÃ DÙNG" : "CHƯA DÙNG"}
          </strong>
        </span>

        <span>
          Đội thi: <strong>{currentTeam?.name}</strong>
        </span>
      </div>
    </section>
  );
}
