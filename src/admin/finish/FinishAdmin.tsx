import { useMemo } from "react";
import { useFinishStore } from "../../modules/finish/store/finishStore";
import { useGameStore } from "../../core/store/gameStore";

const youtubeEmbedUrl = (url: string) => {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");

      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : "";
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

  const currentTeam = finish.currentTeamId
    ? teams.find((team) => team.id === finish.currentTeamId) ?? null
    : null;

  const selectionTeamId =
    finish.selectionOrder[finish.selectionIndex] ?? null;

  const selectionTeam = selectionTeamId
    ? teams.find((team) => team.id === selectionTeamId) ?? null
    : null;

  const remainingTeams = teams.filter(
    (team) =>
      team.id !== finish.currentTeamId &&
      team.id !== finish.selectedStealTeamId,
  );

  const handleCorrect = () => {
    if (!currentPackage || !currentQuestion) return;

    if (
      finish.resolution === "awaiting-main-result" &&
      finish.currentTeamId
    ) {
      const points = finish.starActive ? 20 : 10;

      addScore(
        finish.currentTeamId,
        points,
        "finish",
      );

      finish.markCorrect();

      return;
    }

    if (
      finish.resolution === "awaiting-steal-result" &&
      finish.selectedStealTeamId &&
      finish.currentTeamId
    ) {
      addScore(
        finish.selectedStealTeamId,
        20,
        "finish",
      );

      addScore(
        finish.currentTeamId,
        -10,
        "finish",
      );

      finish.markStealCorrect();
    }
  };

  const handleWrong = () => {
    if (!currentPackage || !currentQuestion) return;

    if (finish.resolution === "awaiting-main-result") {
      finish.markWrong();
      return;
    }

    if (finish.resolution === "awaiting-steal-result") {
      finish.markStealWrong();
    }
  };

  const handleSelectPackage = (packageId: string) => {
    if (!selectionTeamId) return;

    finish.selectPackage(
      selectionTeamId,
      packageId,
    );
  };

  if (finish.status === "finished") {
    return (
      <section className="finish-admin">
        <div className="finish-admin-card">
          <div className="finish-kicker">
            VÒNG 4
          </div>

          <h1>VỀ ĐÍCH</h1>

          <p>
            Phần thi Vòng 4 đã hoàn thành.
          </p>

          <button
            className="finish-primary-button"
            onClick={finish.resetRound}
          >
            Chơi lại Vòng 4
          </button>
        </div>
      </section>
    );
  }

  /*
   * =========================
   * CHỌN GÓI CÂU HỎI
   * =========================
   */
  if (finish.status === "selection") {
    return (
      <section className="finish-admin">
        <div className="finish-admin-header">
          <div>
            <div className="finish-kicker">
              QUẢN TRỊ VÒNG 4
            </div>

            <h1>VỀ ĐÍCH</h1>

            <p>
              Các đội lần lượt chọn gói câu hỏi.
              Mỗi gói chỉ được chọn một lần.
            </p>
          </div>
        </div>

        <div className="finish-selection-team">
          <span>ĐỘI ĐANG CHỌN GÓI</span>

          <strong>
            {selectionTeam?.name ?? "Chưa xác định"}
          </strong>

          <small>
            Lượt chọn {finish.selectionIndex + 1}/
            {finish.selectionOrder.length}
          </small>
        </div>

        <div className="finish-package-grid">
          {finish.packages.map((pkg) => {
            const selectedTeam = pkg.selectedBy
              ? teams.find(
                  (team) =>
                    team.id === pkg.selectedBy,
                )
              : null;

            return (
              <button
                key={pkg.id}
                className={`finish-package-card ${
                  pkg.selectedBy
                    ? "taken"
                    : ""
                }`}
                disabled={Boolean(pkg.selectedBy)}
                onClick={() =>
                  handleSelectPackage(pkg.id)
                }
              >
                <span>{pkg.label}</span>

                {selectedTeam ? (
                  <small>
                    Đã chọn: {selectedTeam.name}
                  </small>
                ) : (
                  <small>
                    Nhấn để chọn
                  </small>
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  /*
   * =========================
   * CHƯA CÓ CÂU HỎI
   * =========================
   */
  if (!currentPackage || !currentQuestion) {
    return (
      <section className="finish-admin">
        <div className="finish-admin-card">
          <h2>
            Chưa có câu hỏi đang diễn ra
          </h2>
        </div>
      </section>
    );
  }

  /*
   * =========================
   * NGÔI SAO HY VỌNG
   * =========================
   *
   * Quan trọng:
   * Không hiển thị nội dung câu hỏi
   * trước khi đội quyết định.
   */
  const isStarDecision =
    finish.starDecisionPending &&
    (finish.currentQuestionIndex === 3 ||
      finish.currentQuestionIndex === 4);

  /*
   * =========================
   * TRẠNG THÁI CHẤM
   * =========================
   */
  const isMainResult =
    finish.resolution ===
    "awaiting-main-result";

  const isStealSelection =
    finish.resolution ===
    "selecting-steal-team";

  const isStealResult =
    finish.resolution ===
    "awaiting-steal-result";

  const embedUrl =
    currentQuestion.isVideo
      ? youtubeEmbedUrl(
          currentQuestion.youtubeUrl,
        )
      : "";

  return (
    <section className="finish-admin">
      <div className="finish-admin-header">
        <div>
          <div className="finish-kicker">
            QUẢN TRỊ VÒNG 4
          </div>

          <h1>VỀ ĐÍCH</h1>

          <div className="finish-admin-meta">
            <span>
              {currentPackage.label}
            </span>

            <span>
              CÂU{" "}
              {finish.currentQuestionIndex + 1}
              /{currentPackage.questions.length}
            </span>

            <strong>
              {currentTeam?.name ??
                "Đội thi"}
            </strong>
          </div>
        </div>
      </div>

      <div className="finish-admin-main">
        {/*
         * ==================================================
         * TRƯỚC Q4/Q5:
         * CHỈ HIỆN QUYẾT ĐỊNH NGÔI SAO
         * KHÔNG HIỆN NỘI DUNG CÂU HỎI
         * ==================================================
         */}
        {isStarDecision ? (
          <div className="finish-star-decision">
            <div className="finish-star-icon">
              ★
            </div>

            <div className="finish-star-label">
              NGÔI SAO HY VỌNG
            </div>

            <h2>
              {currentTeam?.name}
              <br />
              có muốn sử dụng
              <br />
              Ngôi sao hy vọng không?
            </h2>

            <p>
              Đây là cơ hội Ngôi sao duy nhất
              của đội trong gói câu hỏi này.
            </p>

            <div className="finish-star-actions">
              <button
                className="finish-star-yes"
                onClick={() =>
                  finish.decideStar(true)
                }
              >
                ★ DÙNG NGÔI SAO
              </button>

              <button
                className="finish-star-no"
                onClick={() =>
                  finish.decideStar(false)
                }
              >
                KHÔNG DÙNG
              </button>
            </div>
          </div>
        ) : (
          <>
            {/*
             * =========================
             * NỘI DUNG CÂU HỎI
             * =========================
             */}
            <div className="finish-question-card">
              <div className="finish-question-number">
                CÂU{" "}
                {finish.currentQuestionIndex +
                  1}
              </div>

              {finish.starActive && (
                <div className="finish-active-star">
                  ★ NGÔI SAO HY VỌNG
                </div>
              )}

              <h2>
                {currentQuestion.text ||
                  "Chưa nhập nội dung câu hỏi."}
              </h2>

              {currentQuestion.isVideo &&
                embedUrl && (
                  <div className="finish-video-wrapper">
                    <iframe
                      src={embedUrl}
                      title={`Video câu hỏi ${
                        finish.currentQuestionIndex +
                        1
                      }`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

              {currentQuestion.isVideo &&
                !embedUrl && (
                  <div className="finish-video-placeholder">
                    Chưa có URL YouTube hợp lệ.
                  </div>
                )}

              <div className="finish-answer-box">
                <span>
                  ĐÁP ÁN THAM KHẢO
                </span>

                <strong>
                  {currentQuestion.answer ||
                    "Chưa nhập đáp án."}
                </strong>
              </div>
            </div>

            {/*
             * =========================
             * CHẤM ĐỘI CHÍNH
             * =========================
             */}
            {isMainResult && (
              <div className="finish-judgement-panel">
                <div className="finish-judgement-title">
                  {finish.starActive
                    ? "★ NGÔI SAO HY VỌNG"
                    : "KẾT QUẢ CÂU HỎI"}
                </div>

                <p>
                  {finish.starActive
                    ? "Đúng +20 điểm · Sai: các đội còn lại được quyền cướp."
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

            {/*
             * =========================
             * CHỌN ĐỘI CƯỚP
             * =========================
             */}
            {isStealSelection && (
              <div className="finish-steal-panel">
                <div className="finish-judgement-title">
                  CƠ HỘI CƯỚP ĐIỂM
                </div>

                <p>
                  Chọn một trong các đội còn
                  lại để trả lời.
                </p>

                <div className="finish-steal-team-grid">
                  {remainingTeams.map(
                    (team) => (
                      <button
                        key={team.id}
                        className="finish-steal-team"
                        onClick={() =>
                          finish.selectStealTeam(
                            team.id,
                          )
                        }
                      >
                        {team.name}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/*
             * =========================
             * CHẤM ĐỘI CƯỚP
             * =========================
             */}
            {isStealResult && (
              <div className="finish-judgement-panel">
                <div className="finish-judgement-title">
                  {teams.find(
                    (team) =>
                      team.id ===
                      finish.selectedStealTeamId,
                  )?.name ??
                    "ĐỘI CƯỚP ĐIỂM"}
                </div>

                <p>
                  Đúng +20 điểm · Đội Ngôi sao
                  −10 điểm
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

            {/*
             * =========================
             * CÂU ĐÃ ĐƯỢC CHẤM
             * =========================
             */}
            {finish.resolution ===
              "resolved" && (
              <div className="finish-next-panel">
                <div className="finish-result-message">
                  Câu hỏi đã được chấm.
                </div>

                {finish.currentQuestionIndex ===
                4 ? (
                  <button
                    className="finish-primary-button"
                    onClick={finish.nextTeam}
                  >
                    Sang đội tiếp theo →
                  </button>
                ) : (
                  <button
                    className="finish-primary-button"
                    onClick={
                      finish.advanceQuestion
                    }
                  >
                    Câu tiếp theo →
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="finish-admin-footer">
        <span>
          Ngôi sao:{" "}
          <strong>
            {currentPackage.starUsed
              ? "ĐÃ DÙNG"
              : "CHƯA DÙNG"}
          </strong>
        </span>

        <span>
          Đội thi:{" "}
          <strong>
            {currentTeam?.name ??
              "—"}
          </strong>
        </span>
      </div>
    </section>
  );
}
