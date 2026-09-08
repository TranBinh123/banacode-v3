import { useMemo, useState } from "react";
import { useFinishStore } from "../store/finishStore";
import { useGameStore } from "../../../core/store/gameStore";
import type { TeamId } from "../../../core/types/game";

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

  const teams = useGameStore(
    (state) => state.teams,
  );

  const addScore = useGameStore(
    (state) => state.addScore,
  );

  /**
   * Đội và gói đang được MC/Kỹ thuật
   * chọn để ghép.
   */
  const [pendingTeamId, setPendingTeamId] =
    useState<TeamId | null>(null);

  const [pendingPackageId, setPendingPackageId] =
    useState<string | null>(null);

  const currentPackage = useMemo(
    () =>
      finish.packages.find(
        (pkg) =>
          pkg.id === finish.currentPackageId,
      ) ?? null,
    [
      finish.packages,
      finish.currentPackageId,
    ],
  );

  const currentQuestion =
    currentPackage?.questions[
      finish.currentQuestionIndex
    ] ?? null;

  const currentTeam = finish.currentTeamId
    ? teams.find(
        (team) =>
          team.id === finish.currentTeamId,
      ) ?? null
    : null;

  const selectedStealTeam =
    finish.selectedStealTeamId
      ? teams.find(
          (team) =>
            team.id ===
            finish.selectedStealTeamId,
        ) ?? null
      : null;

  /**
   * Các đội chưa được ghép gói.
   */
  const availableTeams = teams.filter(
    (team) =>
      !finish.packages.some(
        (pkg) =>
          pkg.selectedBy === team.id,
      ),
  );

  /**
   * Các gói chưa được ghép đội.
   */
  const availablePackages =
    finish.packages.filter(
      (pkg) => pkg.selectedBy === null,
    );

  const embedUrl =
    currentQuestion?.isVideo
      ? youtubeEmbedUrl(
          currentQuestion.youtubeUrl,
        )
      : "";

  const isStarDecision =
    finish.starDecisionPending &&
    (finish.currentQuestionIndex === 3 ||
      finish.currentQuestionIndex === 4);

  const isMainResult =
    finish.resolution ===
    "awaiting-main-result";

  const isStealSelection =
    finish.resolution ===
    "selecting-steal-team";

  const isStealResult =
    finish.resolution ===
    "awaiting-steal-result";

  const isResolved =
    finish.resolution === "resolved";

  /**
   * Ghép đội + gói.
   */
  const handleAssignPackage = () => {
    if (
      !pendingTeamId ||
      !pendingPackageId
    ) {
      return;
    }

    const success =
      finish.selectPackage(
        pendingTeamId,
        pendingPackageId,
      );

    if (success) {
      setPendingTeamId(null);
      setPendingPackageId(null);
    }
  };

  /**
   * MC/Kỹ thuật chấm đội chính ĐÚNG.
   */
  const handleCorrect = () => {
    if (
      finish.resolution ===
        "awaiting-main-result" &&
      finish.currentTeamId
    ) {
      const points =
        finish.starActive ? 20 : 10;

      addScore(
        finish.currentTeamId,
        points,
        "finish",
      );

      finish.markCorrect();

      return;
    }

    /**
     * Đội cướp trả lời đúng:
     *
     * Đội cướp +20
     * Đội Ngôi sao -10
     */
    if (
      finish.resolution ===
        "awaiting-steal-result" &&
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

  /**
   * MC/Kỹ thuật chấm SAI.
   */
  const handleWrong = () => {
    if (
      finish.resolution ===
      "awaiting-main-result"
    ) {
      finish.markWrong();
      return;
    }

    if (
      finish.resolution ===
      "awaiting-steal-result"
    ) {
      finish.markStealWrong();
    }
  };

  /**
   * Màn hình hoàn thành.
   */
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
                  b.totalScore -
                  a.totalScore,
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

          <button
            className="finish-primary-button"
            onClick={finish.resetRound}
          >
            CHƠI LẠI VÒNG 4
          </button>
        </div>
      </section>
    );
  }

  /**
   * MÀN HÌNH GHÉP ĐỘI + GÓI.
   *
   * Không còn selectionIndex.
   *
   * MC/Kỹ thuật có thể chọn bất kỳ đội
   * và bất kỳ gói nào còn trống.
   */
  if (finish.status === "selection") {
    const selectedTeam =
      pendingTeamId
        ? teams.find(
            (team) =>
              team.id ===
              pendingTeamId,
          )
        : null;

    const selectedPackage =
      pendingPackageId
        ? finish.packages.find(
            (pkg) =>
              pkg.id ===
              pendingPackageId,
          )
        : null;

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
              GHÉP ĐỘI THI VỚI GÓI CÂU HỎI
            </p>
          </header>

          <div className="finish-assignment-panel">
            <div className="finish-assignment-column">
              <div className="finish-assignment-title">
                <span>01</span>
                <div>
                  <strong>
                    CHỌN ĐỘI THI
                  </strong>

                  <small>
                    Đội nào cũng có thể chọn
                  </small>
                </div>
              </div>

              <div className="finish-assignment-team-grid">
                {availableTeams.map(
                  (team) => (
                    <button
                      key={team.id}
                      className={`finish-assignment-team ${
                        pendingTeamId ===
                        team.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setPendingTeamId(
                          team.id,
                        )
                      }
                    >
                      <span>
                        {team.name}
                      </span>

                      <strong>
                        {team.totalScore}
                      </strong>
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="finish-assignment-column">
              <div className="finish-assignment-title">
                <span>02</span>
                <div>
                  <strong>
                    CHỌN GÓI CÂU HỎI
                  </strong>

                  <small>
                    Chọn bất kỳ gói còn trống
                  </small>
                </div>
              </div>

              <div className="finish-assignment-package-grid">
                {availablePackages.map(
                  (pkg, index) => (
                    <button
                      key={pkg.id}
                      className={`finish-assignment-package ${
                        pendingPackageId ===
                        pkg.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setPendingPackageId(
                          pkg.id,
                        )
                      }
                    >
                      <span>
                        {String(
                          index + 1,
                        ).padStart(2, "0")}
                      </span>

                      <strong>
                        {pkg.label}
                      </strong>

                      <small>
                        5 CÂU HỎI
                      </small>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="finish-assignment-confirm">
            <div>
              <span>
                ĐỘI
              </span>

              <strong>
                {selectedTeam?.name ??
                  "CHƯA CHỌN"}
              </strong>
            </div>

            <div className="finish-assignment-arrow">
              →
            </div>

            <div>
              <span>
                GÓI
              </span>

              <strong>
                {selectedPackage?.label ??
                  "CHƯA CHỌN"}
              </strong>
            </div>

            <button
              className="finish-primary-button"
              disabled={
                !pendingTeamId ||
                !pendingPackageId
              }
              onClick={
                handleAssignPackage
              }
            >
              GÁN ĐỘI VÀO GÓI →
            </button>
          </div>

          <div className="finish-assigned-list">
            <div className="finish-assigned-list-title">
              ĐÃ GÁN
            </div>

            {finish.selectionOrder.length ===
            0 ? (
              <span className="finish-assigned-empty">
                Chưa có đội nào được gán.
              </span>
            ) : (
              finish.selectionOrder.map(
                (teamId, index) => {
                  const team =
                    teams.find(
                      (item) =>
                        item.id ===
                        teamId,
                    );

                  const pkg =
                    finish.packages.find(
                      (item) =>
                        item.selectedBy ===
                        teamId,
                    );

                  if (!team || !pkg) {
                    return null;
                  }

                  return (
                    <div
                      key={teamId}
                      className="finish-assigned-row"
                    >
                      <span>
                        {index + 1}
                      </span>

                      <strong>
                        {team.name}
                      </strong>

                      <b>→</b>

                      <em>
                        {pkg.label}
                      </em>
                    </div>
                  );
                },
              )
            )}
          </div>

          <footer className="finish-public-footer">
            <div className="finish-scoreboard">
              {teams
                .slice()
                .sort(
                  (a, b) =>
                    b.totalScore -
                    a.totalScore,
                )
                .map((team) => (
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

  /**
   * Trường hợp store đang ở playing nhưng
   * chưa tìm được câu hỏi hợp lệ.
   */
  if (
    !currentPackage ||
    !currentQuestion
  ) {
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
                {finish.currentQuestionIndex +
                  1}

                <small>
                  /
                  {
                    currentPackage
                      .questions.length
                  }
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
                MC/KỸ THUẬT ĐANG CHỜ QUYẾT ĐỊNH
              </div>

              <div className="finish-control-panel">
                <button
                  className="finish-star-yes"
                  onClick={() =>
                    finish.decideStar(
                      true,
                    )
                  }
                >
                  ★ DÙNG NGÔI SAO
                </button>

                <button
                  className="finish-star-no"
                  onClick={() =>
                    finish.decideStar(
                      false,
                    )
                  }
                >
                  KHÔNG DÙNG
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="finish-question-topline">
                <span>
                  CÂU{" "}
                  {finish.currentQuestionIndex +
                    1}
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
                      VIDEO CÂU HỎI CHƯA CÓ URL
                    </div>
                  )}
              </div>

              /**
               * Khu vực điều khiển MC/Kỹ thuật.
               */
              <div className="finish-live-control-panel">
                <div className="finish-live-control-header">
                  <div>
                    <span>
                      KHU VỰC MC / KỸ THUẬT
                    </span>

                    <strong>
                      {currentTeam?.name}
                    </strong>
                  </div>

                  <div className="finish-live-answer">
                    <span>
                      ĐÁP ÁN THAM KHẢO
                    </span>

                    <strong>
                      {currentQuestion.answer ||
                        "Chưa nhập đáp án."}
                    </strong>
                  </div>
                </div>

                {isMainResult && (
                  <div className="finish-judgement-panel">
                    <div className="finish-judgement-title">
                      {finish.starActive
                        ? "★ NGÔI SAO HY VỌNG"
                        : "KẾT QUẢ CÂU HỎI"}
                    </div>

                    <p>
                      {finish.starActive
                        ? "Đúng +20 điểm · Sai → các đội còn lại được quyền cướp."
                        : "Đúng +10 điểm · Sai 0 điểm"}
                    </p>

                    <div className="finish-judgement-actions">
                      <button
                        className="finish-correct-button"
                        onClick={
                          handleCorrect
                        }
                      >
                        ✓ ĐÚNG
                      </button>

                      <button
                        className="finish-wrong-button"
                        onClick={
                          handleWrong
                        }
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
                      Chọn một trong các đội
                      còn lại để trả lời.
                    </p>

                    <div className="finish-steal-team-grid">
                      {teams
                        .filter(
                          (team) =>
                            team.id !==
                            finish.currentTeamId,
                        )
                        .map((team) => (
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
                        ))}
                    </div>
                  </div>
                )}

                {isStealResult && (
                  <div className="finish-judgement-panel">
                    <div className="finish-judgement-title">
                      ĐỘI TRẢ LỜI CƯỚP
                    </div>

                    <strong className="finish-steal-selected-team">
                      {selectedStealTeam?.name ??
                        "ĐỘI CƯỚP ĐIỂM"}
                    </strong>

                    <p>
                      Đúng +20 điểm · Đội Ngôi
                      sao −10 điểm
                    </p>

                    <div className="finish-judgement-actions">
                      <button
                        className="finish-correct-button"
                        onClick={
                          handleCorrect
                        }
                      >
                        ✓ ĐÚNG
                      </button>

                      <button
                        className="finish-wrong-button"
                        onClick={
                          handleWrong
                        }
                      >
                        ✕ SAI
                      </button>
                    </div>
                  </div>
                )}

                {isResolved && (
                  <div className="finish-next-panel">
                    <div className="finish-result-message">
                      Câu hỏi đã được chấm.
                    </div>

                    {finish.currentQuestionIndex ===
                    4 ? (
                      <button
                        className="finish-primary-button"
                        onClick={
                          finish.nextTeam
                        }
                      >
                        HOÀN THÀNH GÓI →
                      </button>
                    ) : (
                      <button
                        className="finish-primary-button"
                        onClick={
                          finish.advanceQuestion
                        }
                      >
                        CÂU TIẾP THEO →
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
              .sort(
                (a, b) =>
                  b.totalScore -
                  a.totalScore,
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
