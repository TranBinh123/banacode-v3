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
  const selectedTeam = pendingTeamId
    ? teams.find(
        (team) => team.id === pendingTeamId,
      ) ?? null
    : null;

  const selectedPackage = pendingPackageId
    ? finish.packages.find(
        (pkg) => pkg.id === pendingPackageId,
      ) ?? null
    : null;

  return (
    <section className="finish-page finish-selection-page">
      <div className="finish-page-inner">
        <header className="finish-hero finish-selection-hero">
          <div className="finish-round-label">
            VÒNG 4
          </div>

          <h1>VỀ ĐÍCH</h1>

          <div className="finish-hero-line" />

          <p>
            GHÉP ĐỘI THI VỚI GÓI CÂU HỎI
          </p>
        </header>

        <main className="finish-assignment-layout">
          {/* =========================
              CỘT 1 — CHỌN ĐỘI
              ========================= */}
          <section className="finish-assignment-section finish-team-section">
            <div className="finish-assignment-section-header">
              <div className="finish-assignment-index">
                01
              </div>

              <div>
                <span>CHỌN ĐỘI THI</span>
                <small>
                  Chọn đội đang chuẩn bị thi
                </small>
              </div>
            </div>

            <div className="finish-assignment-team-list">
              {availableTeams.length === 0 ? (
                <div className="finish-assignment-empty">
                  TẤT CẢ ĐỘI ĐÃ ĐƯỢC GÁN
                </div>
              ) : (
                availableTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    className={`finish-team-select-card ${
                      pendingTeamId === team.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setPendingTeamId(team.id)
                    }
                  >
                    <span className="finish-team-select-check">
                      {pendingTeamId === team.id
                        ? "✓"
                        : ""}
                    </span>

                    <div className="finish-team-select-name">
                      {team.name}
                    </div>

                    <div className="finish-team-select-score">
                      <small>ĐIỂM</small>
                      <strong>
                        {team.totalScore}
                      </strong>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* =========================
              CỘT 2 — GHÉP ĐANG CHỌN
              ========================= */}
          <section className="finish-assignment-section finish-mapping-section">
            <div className="finish-assignment-section-header">
              <div className="finish-assignment-index">
                02
              </div>

              <div>
                <span>GHÉP ĐANG CHỌN</span>
                <small>
                  Xác nhận đội và gói câu hỏi
                </small>
              </div>
            </div>

            <div className="finish-mapping-card">
              <div className="finish-mapping-label">
                ĐỘI THI
              </div>

              <div
                className={`finish-mapping-value ${
                  selectedTeam ? "active" : ""
                }`}
              >
                {selectedTeam?.name ?? (
                  <span>Chưa chọn đội</span>
                )}
              </div>

              <div className="finish-mapping-arrow">
                ↓
              </div>

              <div className="finish-mapping-label">
                GÓI CÂU HỎI
              </div>

              <div
                className={`finish-mapping-value ${
                  selectedPackage ? "active" : ""
                }`}
              >
                {selectedPackage?.label ?? (
                  <span>Chưa chọn gói</span>
                )}
              </div>

              <button
                type="button"
                className="finish-primary-button finish-assignment-submit"
                disabled={
                  !pendingTeamId ||
                  !pendingPackageId
                }
                onClick={handleAssignPackage}
              >
                GÁN ĐỘI VÀO GÓI
                <span>→</span>
              </button>
            </div>

            <div className="finish-assignment-hint">
              {!selectedTeam &&
                "① Chọn một đội thi bên trái"}

              {selectedTeam &&
                !selectedPackage &&
                "② Chọn một gói câu hỏi bên phải"}

              {selectedTeam &&
                selectedPackage &&
                "③ Kiểm tra và xác nhận ghép đội"}
            </div>
          </section>

          {/* =========================
              CỘT 3 — CHỌN GÓI
              ========================= */}
          <section className="finish-assignment-section finish-package-section">
            <div className="finish-assignment-section-header">
              <div className="finish-assignment-index">
                03
              </div>

              <div>
                <span>CHỌN GÓI CÂU HỎI</span>
                <small>
                  Mỗi gói chỉ được chọn một lần
                </small>
              </div>
            </div>

            <div className="finish-assignment-package-list">
              {availablePackages.length === 0 ? (
                <div className="finish-assignment-empty">
                  TẤT CẢ GÓI ĐÃ ĐƯỢC CHỌN
                </div>
              ) : (
                availablePackages.map(
                  (pkg, index) => (
                    <button
                      key={pkg.id}
                      type="button"
                      className={`finish-package-select-card ${
                        pendingPackageId === pkg.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setPendingPackageId(pkg.id)
                      }
                    >
                      <div className="finish-package-select-number">
                        {String(index + 1).padStart(
                          2,
                          "0",
                        )}
                      </div>

                      <div className="finish-package-select-info">
                        <strong>
                          {pkg.label}
                        </strong>

                        <span>
                          5 CÂU HỎI
                        </span>
                      </div>

                      <div className="finish-package-select-arrow">
                        {pendingPackageId ===
                        pkg.id
                          ? "✓"
                          : "→"}
                      </div>
                    </button>
                  ),
                )
              )}
            </div>
          </section>
        </main>

        {/* =========================
            CÁC GÓI ĐÃ GÁN
            ========================= */}
        {finish.selectionOrder.length > 0 && (
          <section className="finish-assigned-summary">
            <div className="finish-assigned-summary-header">
              <span>TIẾN ĐỘ GÁN GÓI</span>
              <strong>
                {finish.selectionOrder.length} / 4
              </strong>
            </div>

            <div className="finish-assigned-summary-list">
              {finish.selectionOrder.map(
                (teamId, index) => {
                  const team = teams.find(
                    (item) =>
                      item.id === teamId,
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
                      className="finish-assigned-summary-item"
                    >
                      <span>
                        {String(index + 1).padStart(
                          2,
                          "0",
                        )}
                      </span>

                      <strong>
                        {team.name}
                      </strong>

                      <b>→</b>

                      <em>{pkg.label}</em>

                      <small>
                        ĐÃ GÁN
                      </small>
                    </div>
                  );
                },
              )}
            </div>
          </section>
        )}

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
                  <span>{team.name}</span>

                  <strong>
                    {team.totalScore}
                  </strong>
                </div>
              ))}
          </div>

          <div className="finish-footer-brand">
            <span>THE BANACODE</span>

            <strong>
              HÀNH TRÌNH 19 NĂM
            </strong>
          </div>
        </footer>
      </div>
    </section>
  );
}
