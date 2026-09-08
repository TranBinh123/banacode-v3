import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../core/types/game";
import type {
  FinishPackage,
  FinishQuestion,
  FinishResolution,
  FinishStatus,
} from "../types/finish";

const TEAM_IDS: TeamId[] = [
  "team-1",
  "team-2",
  "team-3",
  "team-4",
];

const createQuestion = (
  packageIndex: number,
  questionIndex: number,
): FinishQuestion => ({
  id: `finish-${packageIndex + 1}-${questionIndex + 1}`,
  text: "",
  answer: "",
  isVideo: questionIndex === 4,
  youtubeUrl: "",
});

const createPackages = (): FinishPackage[] =>
  Array.from({ length: 4 }, (_, packageIndex) => ({
    id: `package-${packageIndex + 1}`,
    label: `GÓI ${packageIndex + 1}`,
    selectedBy: null,
    starUsed: false,
    questions: Array.from(
      { length: 5 },
      (_, questionIndex) =>
        createQuestion(
          packageIndex,
          questionIndex,
        ),
    ),
  }));

type FinishStore = {
  packages: FinishPackage[];

  status: FinishStatus;

  currentTeamId: TeamId | null;
  currentPackageId: string | null;
  currentQuestionIndex: number;

  resolution: FinishResolution;

  starActive: boolean;
  starDecisionPending: boolean;

  selectedStealTeamId: TeamId | null;

  selectionOrder: TeamId[];

  selectPackage: (
    teamId: TeamId,
    packageId: string,
  ) => boolean;

  decideStar: (useStar: boolean) => void;

  markCorrect: () => void;
  markWrong: () => void;

  selectStealTeam: (teamId: TeamId) => void;

  markStealCorrect: () => void;
  markStealWrong: () => void;

  advanceQuestion: () => void;
  nextTeam: () => void;

  updatePackage: (
    packageId: string,
    patch: Partial<
      Pick<FinishPackage, "label">
    >,
  ) => void;

  updateQuestion: (
    packageId: string,
    questionIndex: number,
    patch: Partial<FinishQuestion>,
  ) => void;

  resetRound: () => void;
};

type InitialState = Pick<
  FinishStore,
  | "packages"
  | "status"
  | "currentTeamId"
  | "currentPackageId"
  | "currentQuestionIndex"
  | "resolution"
  | "starActive"
  | "starDecisionPending"
  | "selectedStealTeamId"
  | "selectionOrder"
>;

const createInitialState = (): InitialState => ({
  packages: createPackages(),

  status: "selection",

  currentTeamId: null,
  currentPackageId: null,
  currentQuestionIndex: 0,

  resolution: "idle",

  starActive: false,
  starDecisionPending: false,

  selectedStealTeamId: null,

  selectionOrder: [],
});

export const useFinishStore = create<FinishStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      /* =====================================================
         CHỌN ĐỘI + GÓI CÂU HỎI
         ===================================================== */

      selectPackage: (
        teamId,
        packageId,
      ) => {
        const state = get();

        if (state.status !== "selection") {
          return false;
        }

        if (!TEAM_IDS.includes(teamId)) {
          return false;
        }

        const teamAlreadyAssigned =
          state.packages.some(
            (pkg) =>
              pkg.selectedBy === teamId,
          );

        if (teamAlreadyAssigned) {
          return false;
        }

        const selectedPackage =
          state.packages.find(
            (pkg) =>
              pkg.id === packageId,
          );

        if (!selectedPackage) {
          return false;
        }

        if (
          selectedPackage.selectedBy !==
          null
        ) {
          return false;
        }

        const nextSelectionOrder = [
          ...state.selectionOrder,
          teamId,
        ];

        set({
          packages: state.packages.map(
            (pkg) =>
              pkg.id === packageId
                ? {
                    ...pkg,
                    selectedBy: teamId,
                  }
                : pkg,
          ),

          status: "playing",

          currentTeamId: teamId,
          currentPackageId: packageId,
          currentQuestionIndex: 0,

          resolution:
            "awaiting-main-result",

          starActive: false,
          starDecisionPending: false,

          selectedStealTeamId: null,

          selectionOrder:
            nextSelectionOrder,
        });

        return true;
      },

      /* =====================================================
         NGÔI SAO HY VỌNG
         ===================================================== */

      decideStar: (useStar) => {
        const state = get();

        if (
          !state.starDecisionPending
        ) {
          return;
        }

        const currentPackage =
          state.packages.find(
            (pkg) =>
              pkg.id ===
              state.currentPackageId,
          );

        if (!currentPackage) {
          return;
        }

        const questionIndex =
          state.currentQuestionIndex;

        // Chỉ được quyết định ở Câu 4 hoặc Câu 5
        if (
          questionIndex !== 3 &&
          questionIndex !== 4
        ) {
          return;
        }

        // Mỗi gói chỉ có một lần Ngôi sao
        if (currentPackage.starUsed) {
          return;
        }

        if (useStar) {
          set({
            packages: state.packages.map(
              (pkg) =>
                pkg.id ===
                currentPackage.id
                  ? {
                      ...pkg,
                      starUsed: true,
                    }
                  : pkg,
            ),

            starActive: true,

            starDecisionPending: false,

            resolution:
              "awaiting-main-result",
          });

          return;
        }

        // Không sử dụng sao.
        // Nếu đang ở Câu 4 thì Câu 5 vẫn có thể dùng.
        set({
          starActive: false,

          starDecisionPending: false,

          resolution:
            "awaiting-main-result",
        });
      },

      /* =====================================================
         CHẤM ĐIỂM ĐỘI ĐANG THI
         ===================================================== */

      markCorrect: () => {
        const state = get();

        if (
          state.resolution !==
          "awaiting-main-result"
        ) {
          return;
        }

        set({
          resolution: "resolved",
        });
      },

      markWrong: () => {
        const state = get();

        if (
          state.resolution !==
          "awaiting-main-result"
        ) {
          return;
        }

        // Nếu đang dùng Ngôi sao:
        // sai -> mở quyền cướp cho đội khác.
        if (state.starActive) {
          set({
            resolution:
              "selecting-steal-team",

            selectedStealTeamId: null,
          });

          return;
        }

        // Sai câu thường -> kết thúc câu.
        set({
          resolution: "resolved",
        });
      },

      /* =====================================================
         CƯỚP ĐIỂM
         ===================================================== */

      selectStealTeam: (
        teamId,
      ) => {
        const state = get();

        if (
          state.resolution !==
          "selecting-steal-team"
        ) {
          return;
        }

        if (!state.currentTeamId) {
          return;
        }

        // Không được chọn chính đội đang thi
        if (
          teamId === state.currentTeamId
        ) {
          return;
        }

        // Chỉ cho phép 4 đội hợp lệ
        if (!TEAM_IDS.includes(teamId)) {
          return;
        }

        set({
          selectedStealTeamId: teamId,

          resolution:
            "awaiting-steal-result",
        });
      },

      markStealCorrect: () => {
        const state = get();

        if (
          state.resolution !==
          "awaiting-steal-result"
        ) {
          return;
        }

        set({
          resolution: "resolved",
        });
      },

      markStealWrong: () => {
        const state = get();

        if (
          state.resolution !==
          "awaiting-steal-result"
        ) {
          return;
        }

        set({
          resolution: "resolved",
        });
      },

      /* =====================================================
         CÂU TIẾP THEO
         ===================================================== */

      advanceQuestion: () => {
        const state = get();

        if (
          state.resolution !==
          "resolved"
        ) {
          return;
        }

        if (
          state.currentQuestionIndex >= 4
        ) {
          return;
        }

        const nextQuestionIndex =
          state.currentQuestionIndex + 1;

        const currentPackage =
          state.packages.find(
            (pkg) =>
              pkg.id ===
              state.currentPackageId,
          );

        if (!currentPackage) {
          return;
        }

        /*
         * Ngôi sao chỉ được đưa ra quyết định
         * ngay trước Câu 4 hoặc Câu 5.
         *
         * Quan trọng:
         * Không tiết lộ trước trong question bank
         * câu nào là "câu sao".
         */

        const shouldAskStar =
          !currentPackage.starUsed &&
          (nextQuestionIndex === 3 ||
            nextQuestionIndex === 4);

        set({
          currentQuestionIndex:
            nextQuestionIndex,

          resolution: shouldAskStar
            ? "idle"
            : "awaiting-main-result",

          starActive: false,

          starDecisionPending:
            shouldAskStar,

          selectedStealTeamId: null,
        });
      },

      /* =====================================================
         CHUYỂN SANG ĐỘI TIẾP THEO
         ===================================================== */

      nextTeam: () => {
        const state = get();

        // Chỉ được chuyển đội sau khi hoàn thành Câu 5
        if (
          state.currentQuestionIndex !== 4
        ) {
          return;
        }

        if (
          state.resolution !==
          "resolved"
        ) {
          return;
        }

        const currentTeamIndex =
          state.currentTeamId
            ? state.selectionOrder.indexOf(
                state.currentTeamId,
              )
            : -1;

        const nextTeamId =
          currentTeamIndex >= 0
            ? state.selectionOrder[
                currentTeamIndex + 1
              ] ?? null
            : null;

        /*
         * Nếu đội tiếp theo đã được chọn gói từ
         * trước đó thì đưa thẳng vào phần thi.
         */
        if (nextTeamId) {
          const nextPackage =
            state.packages.find(
              (pkg) =>
                pkg.selectedBy ===
                nextTeamId,
            );

          if (nextPackage) {
            set({
              status: "playing",

              currentTeamId:
                nextTeamId,

              currentPackageId:
                nextPackage.id,

              currentQuestionIndex: 0,

              resolution:
                "awaiting-main-result",

              starActive: false,

              starDecisionPending: false,

              selectedStealTeamId: null,
            });

            return;
          }
        }

        /*
         * Vẫn còn đội chưa được gán.
         * Quay lại màn hình chọn đội + gói.
         */
        if (
          state.selectionOrder.length <
          TEAM_IDS.length
        ) {
          set({
            status: "selection",

            currentTeamId: null,
            currentPackageId: null,
            currentQuestionIndex: 0,

            resolution: "idle",

            starActive: false,

            starDecisionPending: false,

            selectedStealTeamId: null,
          });

          return;
        }

        /*
         * Đã hoàn thành cả 4 đội.
         */
        set({
          status: "finished",

          currentTeamId: null,
          currentPackageId: null,
          currentQuestionIndex: 0,

          resolution: "idle",

          starActive: false,

          starDecisionPending: false,

          selectedStealTeamId: null,
        });
      },

      /* =====================================================
         ADMIN — TÊN GÓI
         ===================================================== */

      updatePackage: (
        packageId,
        patch,
      ) => {
        set((state) => ({
          packages: state.packages.map(
            (pkg) =>
              pkg.id === packageId
                ? {
                    ...pkg,
                    ...patch,
                  }
                : pkg,
          ),
        }));
      },

      /* =====================================================
         ADMIN — NỘI DUNG CÂU HỎI
         ===================================================== */

      updateQuestion: (
        packageId,
        questionIndex,
        patch,
      ) => {
        if (
          questionIndex < 0 ||
          questionIndex > 4
        ) {
          return;
        }

        set((state) => ({
          packages: state.packages.map(
            (pkg) =>
              pkg.id !== packageId
                ? pkg
                : {
                    ...pkg,

                    questions:
                      pkg.questions.map(
                        (
                          question,
                          index,
                        ) =>
                          index ===
                          questionIndex
                            ? {
                                ...question,
                                ...patch,
                              }
                            : question,
                      ),
                  },
          ),
        }));
      },

      /* =====================================================
         RESET VÒNG 4
         ===================================================== */

      resetRound: () => {
        set(createInitialState());
      },
    }),

    {
      name: "olympia-finish-game",
    },
  ),
);
