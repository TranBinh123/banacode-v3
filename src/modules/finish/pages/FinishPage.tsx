import { useMemo } from "react";
import { useFinishStore } from "../store/finishStore";
import { useGameStore } from "../../../core/store/gameStore";

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

export function FinishPage() {
  const finish = useFinishStore();
  const teams = useGameStore((state) => state.teams);

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
    ? teams.find(
        (team) => team.id === finish.currentTeamId,
      ) ?? null
    : null;

  const selectionTeamId =
    finish.selectionOrder[finish.selectionIndex] ?? null;

  const selectionTeam = selectionTeamId
    ? teams.find(
        (team) => team.id === selectionTeamId,
      ) ?? null
    : null;

  const selectedStealTeam = finish.selectedStealTeamId
    ? teams.find(
        (team) => team.id === finish.selectedStealTeamId,
      ) ?? null
    : null;

  const embedUrl =
    currentQuestion?.isVideo
      ? youtubeEmbedUrl(currentQuestion.youtubeUrl)
      : "";

  const isStarDecision =
    finish.starDecisionPending &&
    (finish.currentQuestionIndex === 3 ||
      finish.currentQuestionIndex === 4);

  const isStealSelection =
    finish.resolution === "selecting-steal-team";

  const isStealResult =
    finish.resolution === "awaiting-steal-result";

  const isResolved =
    finish.resolution === "resolved";

  if (finish.status === "finished") {
    return (
      <section className="finish-page">
        <div className="finish-finale">
          <div className="finish-finale-badge">
            VÒNG 4
          </div>

          <div className="finish-finale-star">
            ★
          </div>

          <h1>VỀ ĐÍCH</h1>

          <p>
            PHẦN THI ĐÃ HOÀN THÀNH
          </p>

          <div className="finish-final-scoreboard">
            {teams
              .slice()
              .sort(
                (a, b) =>
                  b.totalScore - a.totalScore,
              )
              .map((team, index) => (
                <div
                  key={team.id}
                  className="finish-final-score-row"
                >
                  <span className="finish-final-rank">
                    {index + 1}
                  </span>

                  <strong>
                    {team.name}
                  </strong>

                  <b>
                    {team.totalScore}
                  </b>
                </div>
              ))}
          </div>

          <div className="finish-finale-message">
            CHÚC MỪNG CÁC ĐỘI THI!
          </div>
        </div>
      </section>
    );
  }

  if (finish.status === "selection") {
    return (
      <section className="finish-page">
        <div className="finish-page-inner">
          <header className="finish-hero">
            <div className="finish-round-label">
              VÒNG 4
            </div>

            <h1>VỀ ĐÍCH</h1>

            <div className="finish-hero-line" />

            <p>
              LỰA CHỌN GÓI CÂU HỎI
            </p>
          </header>

          <div className="finish-selection-banner">
            <span>ĐỘI ĐANG LỰA CHỌN</span>

            <strong>
              {selectionTeam?.name ??
                "ĐỘI THI"}
            </strong>

            <small>
              LƯỢT {finish.selectionIndex + 1}
              {" / "}
              {finish.selectionOrder.length}
            </small>
          </div>

          <div className="finish-package-public-grid">
            {finish.packages.map((pkg) => {
              const selectedTeam = pkg.selectedBy
                ? teams.find(
                    (team) =>
                      team.id === pkg.selectedBy,
                  )
                : null;

              return (
                <div
                  key={pkg.id}
                  className={`finish-public-package ${
                    pkg.selectedBy
                      ? "taken"
                      : ""
                  }`}
                >
                  <div className="finish-public-package-number">
                    {pkg.id
                      .replace(
                        "package-",
                        "",
                      )
                      .padStart(2, "0")}
                  </div>

                  <div className="finish-public-package-content">
                    <strong>
                      {pkg.label}
                    </strong>

                    {selectedTeam ? (
                      <span>
                        ĐÃ ĐƯỢC CHỌN
                      </span>
                    ) : (
                      <span>
                        ĐANG CHỜ LỰA CHỌN
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="finish-scoreboard">
            {teams.map((team) => (
              <div
                key={team.id}
                className="finish-score-team"
              >
                <span>
                  {team.name}
                </span>

                <strong>
                  {team.totalScore}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!currentPackage || !currentQuestion) {
    return (
      <section className="finish-page">
        <div className="finish-empty">
          <div className="finish-round-label">
            VÒNG 4
          </div>

          <h1>VỀ ĐÍCH</h1>

          <p>
            Chưa có câu hỏi đang diễn ra.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="finish-page">
      <div className="finish-page-inner">
        <header className="finish-game-header">
          <div className="finish-game-title">
            <div className="finish-round-label">
              VÒNG 4
            </div>

            <h1>VỀ ĐÍCH</h1>
          </div>

          <div className="finish-game-meta">
            <div>
              <span>GÓI</span>
              <strong>
                {currentPackage.label}
              </strong>
            </div>

            <div>
              <span>CÂU</span>
              <strong>
                {finish.currentQuestionIndex + 1}
                <small>
                  /{currentPackage.questions.length}
                </small>
              </strong>
            </div>

            <div className="finish-current-team">
              <span>ĐANG THI</span>
              <strong>
                {currentTeam?.name ??
                  "ĐỘI THI"}
              </strong>
            </div>
          </div>
        </header>

        <main className="finish-question-area">
          {isStarDecision ? (
            <div className="finish-public-star-decision">
              <div className="finish-star-glow">
                ★
              </div>

              <div className="finish-star-caption">
                NGÔI SAO HY VỌNG
              </div>

              <h2>
                {currentTeam?.name}
              </h2>

              <p>
                Có muốn sử dụng
                <br />
                <strong>
                  NGÔI SAO HY VỌNG
                </strong>
                {" "}cho câu hỏi này?
              </p>

              <div className="finish-star-question">
                NGƯỜI DẪN CHƯƠNG TRÌNH ĐANG
                CHỜ QUYẾT ĐỊNH
              </div>
            </div>
          ) : (
            <>
              <div className="finish-question-topline">
                <span>
                  CÂU{" "}
                  {finish.currentQuestionIndex + 1}
                </span>

                {finish.starActive && (
                  <strong>
                    ★ NGÔI SAO HY VỌNG
                  </strong>
                )}
              </div>

              <div className="finish-question-display">
                <h2>
                  {currentQuestion.text ||
                    "CÂU HỎI ĐANG ĐƯỢC CHUẨN BỊ"}
                </h2>

                {currentQuestion.isVideo &&
                  embedUrl && (
                    <div className="finish-public-video">
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
                    <div className="finish-public-video-empty">
                      VIDEO CÂU HỎI
                    </div>
                  )}
              </div>

              {isStealSelection && (
                <div className="finish-public-result steal">
                  <div className="finish-result-icon">
                    ★
                  </div>

                  <h3>
                    CƠ HỘI CƯỚP ĐIỂM
                  </h3>

                  <p>
                    ĐỘI TRẢ LỜI CHÍNH ĐÃ TRẢ LỜI SAI
                  </p>

                  <strong>
                    BTC ĐANG CHỌN ĐỘI TRẢ LỜI
                  </strong>
                </div>
              )}

              {isStealResult && (
                <div className="finish-public-result">
                  <div className="finish-result-icon">
                    ?
                  </div>

                  <h3>
                    {selectedStealTeam?.name ??
                      "ĐỘI CƯỚP ĐIỂM"}
                  </h3>

                  <p>
                    ĐANG TRẢ LỜI CÂU HỎI
                  </p>
                </div>
              )}

              {isResolved && (
                <div className="finish-public-resolved">
                  <span>
                    CÂU HỎI ĐÃ ĐƯỢC CHẤM
                  </span>

                  {finish.currentQuestionIndex <
                    4 && (
                    <strong>
                      CHUẨN BỊ CÂU TIẾP THEO
                    </strong>
                  )}

                  {finish.currentQuestionIndex ===
                    4 && (
                    <strong>
                      HOÀN THÀNH GÓI CÂU HỎI
                    </strong>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        <footer className="finish-public-footer">
          <div className="finish-scoreboard">
            {teams
              .slice()
              .sort(
                (a, b) =>
                  b.totalScore - a.totalScore,
              )
              .map((team) => (
                <div
                  key={team.id}
                  className={`finish-score-team ${
                    team.id ===
                    finish.currentTeamId
                      ? "active"
                      : ""
                  }`}
                >
                  <span>
                    {team.name}
                  </span>

                  <strong>
                    {team.totalScore}
                  </strong>
                </div>
              ))}
          </div>

          <div className="finish-footer-brand">
            <span>
              THE BANACODE
            </span>

            <strong>
              HÀNH TRÌNH 19 NĂM
            </strong>
          </div>
        </footer>
      </div>
    </section>
  );
}
