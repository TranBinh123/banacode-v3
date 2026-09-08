import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../types/game";
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
    questions: Array.from({ length: 5 }, (_, questionIndex) =>
      createQuestion(packageIndex, questionIndex),
    ),
  }));

type FinishStore = {
  packages: FinishPackage[];

  status: FinishStatus;

  /**
   * Đội đang thi.
   */
  currentTeamId: TeamId | null;

  /**
   * Gói mà đội hiện tại đã chọn.
   */
  currentPackageId: string | null;

  /**
   * 0 → Câu 1
   * 1 → Câu 2
   * ...
   * 4 → Câu 5
   */
  currentQuestionIndex: number;

  /**
   * Trạng thái chấm câu hỏi.
   */
  resolution: FinishResolution;

  /**
   * true khi đội đã chọn ⭐.
   */
  starActive: boolean;

  /**
   * Trước Câu 4/Câu 5, nếu đội chưa dùng ⭐,
   * hệ thống sẽ chờ đội quyết định.
   */
  starDecisionPending: boolean;

  /**
   * Đội được chọn để trả lời cướp.
   */
  selectedStealTeamId: TeamId | null;

  /**
   * Thứ tự các đội được chọn gói.
   */
  selectionOrder: TeamId[];

  /**
   * Đang ở lượt chọn thứ mấy.
   */
  selectionIndex: number;

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
    patch: Partial<Pick<FinishPackage, "label">>,
  ) => void;

  updateQuestion: (
    packageId: string,
    questionIndex: number,
    patch: Partial<FinishQuestion>,
  ) => void;

  resetRound: () => void;
};

const createInitialState = (): Pick<
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
  | "selectionIndex"
> => ({
  packages: createPackages(),

  status: "selection",

  currentTeamId: null,

  currentPackageId: null,

  currentQuestionIndex: 0,

  resolution: "idle",

  starActive: false,

  starDecisionPending: false,

  selectedStealTeamId: null,

  selectionOrder: TEAM_IDS,

  selectionIndex: 0,
});

export const useFinishStore = create<FinishStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      /**
       * Đội chọn gói.
       *
       * Một gói chỉ được chọn một lần.
       */
      selectPackage: (teamId, packageId) => {
        const state = get();

        if (state.status !== "selection") {
          return false;
        }

        const expectedTeam =
          state.selectionOrder[state.selectionIndex];

        if (expectedTeam !== teamId) {
          return false;
        }

        const selectedPackage = state.packages.find(
          (pkg) => pkg.id === packageId,
        );

        if (!selectedPackage) {
          return false;
        }

        if (selectedPackage.selectedBy !== null) {
          return false;
        }

        set({
          packages: state.packages.map((pkg) =>
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

          resolution: "awaiting-main-result",

          starActive: false,

          starDecisionPending: false,

          selectedStealTeamId: null,
        });

        return true;
      },

      /**
       * Đội quyết định có dùng ⭐ hay không.
       *
       * Chỉ được gọi ở Câu 4 hoặc Câu 5.
       *
       * ⭐ chỉ được sử dụng đúng 1 lần trong cả gói.
       */
      decideStar: (useStar) => {
        const state = get();

        const currentPackage = state.packages.find(
          (pkg) => pkg.id === state.currentPackageId,
        );

        if (!currentPackage) {
          return;
        }

        const questionIndex = state.currentQuestionIndex;

        if (questionIndex !== 3 && questionIndex !== 4) {
          return;
        }

        if (!state.starDecisionPending) {
          return;
        }

        if (currentPackage.starUsed) {
          return;
        }

        if (useStar) {
          set({
            packages: state.packages.map((pkg) =>
              pkg.id === currentPackage.id
                ? {
                    ...pkg,
                    starUsed: true,
                  }
                : pkg,
            ),

            starActive: true,

            starDecisionPending: false,

            resolution: "awaiting-main-result",
          });
        } else {
          set({
            starActive: false,

            starDecisionPending: false,

            resolution: "awaiting-main-result",
          });
        }
      },

      /**
       * BTC chấm đội chính ĐÚNG.
       *
       * Điểm sẽ được cộng ở FinishAdmin thông qua gameStore.
       * Store này chỉ thay đổi trạng thái câu hỏi,
       * tránh việc một lần click bị cộng điểm nhiều lần.
       */
      markCorrect: () => {
        const state = get();

        if (
          state.resolution !== "awaiting-main-result"
        ) {
          return;
        }

        set({
          resolution: "resolved",
        });
      },

      /**
       * BTC chấm đội chính SAI.
       *
       * Nếu có ⭐ → chuyển sang bước chọn đội cướp.
       *
       * Nếu không có ⭐ → câu hỏi kết thúc.
       */
      markWrong: () => {
        const state = get();

        if (
          state.resolution !== "awaiting-main-result"
        ) {
          return;
        }

        if (state.starActive) {
          set({
            resolution: "selecting-steal-team",

            selectedStealTeamId: null,
          });

          return;
        }

        set({
          resolution: "resolved",
        });
      },

      /**
       * BTC chọn đội cướp.
       */
      selectStealTeam: (teamId) => {
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

        if (teamId === state.currentTeamId) {
          return;
        }

        set({
          selectedStealTeamId: teamId,

          resolution: "awaiting-steal-result",
        });
      },

      /**
       * Đội cướp trả lời ĐÚNG.
       *
       * FinishAdmin sẽ:
       *
       * Đội cướp +20
       * Đội gốc -10
       */
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

      /**
       * Đội cướp trả lời SAI.
       *
       * Không đội nào thay đổi điểm.
       */
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

      /**
       * Sang câu tiếp theo trong cùng gói.
       */
      advanceQuestion: () => {
        const state = get();

        if (state.resolution !== "resolved") {
          return;
        }

        if (state.currentQuestionIndex >= 4) {
          return;
        }

        const nextQuestionIndex =
          state.currentQuestionIndex + 1;

        const currentPackage = state.packages.find(
          (pkg) => pkg.id === state.currentPackageId,
        );

        /**
         * Trước Câu 4 hoặc Câu 5,
         * nếu đội chưa dùng ⭐ thì hỏi.
         */
        const shouldAskStar =
          currentPackage !== null &&
          currentPackage !== undefined &&
          !currentPackage.starUsed &&
          (nextQuestionIndex === 3 ||
            nextQuestionIndex === 4);

        set({
          currentQuestionIndex: nextQuestionIndex,

          resolution: shouldAskStar
            ? "idle"
            : "awaiting-main-result",

          starActive: false,

          starDecisionPending: shouldAskStar,

          selectedStealTeamId: null,
        });
      },

      /**
       * Sau khi hoàn thành Câu 5,
       * chuyển sang đội tiếp theo.
       */
      nextTeam: () => {
        const state = get();

        if (state.currentQuestionIndex !== 4) {
          return;
        }

        if (state.resolution !== "resolved") {
          return;
        }

        const nextSelectionIndex =
          state.selectionIndex + 1;

        /**
         * Đã hết 4 đội.
         */
        if (
          nextSelectionIndex >=
          state.selectionOrder.length
        ) {
          set({
            status: "finished",

            currentTeamId: null,

            currentPackageId: null,

            currentQuestionIndex: 0,

            resolution: "idle",

            starActive: false,

            starDecisionPending: false,

            selectedStealTeamId: null,

            selectionIndex: nextSelectionIndex,
          });

          return;
        }

        /**
         * Sang đội tiếp theo và cho đội đó chọn gói.
         */
        set({
          status: "selection",

          currentTeamId: null,

          currentPackageId: null,

          currentQuestionIndex: 0,

          resolution: "idle",

          starActive: false,

          starDecisionPending: false,

          selectedStealTeamId: null,

          selectionIndex: nextSelectionIndex,
        });
      },

      /**
       * BTC đổi tên gói.
       */
      updatePackage: (packageId, patch) => {
        set((state) => ({
          packages: state.packages.map((pkg) =>
            pkg.id === packageId
              ? {
                  ...pkg,
                  ...patch,
                }
              : pkg,
          ),
        }));
      },

      /**
       * BTC chỉnh nội dung câu hỏi.
       */
      updateQuestion: (
        packageId,
        questionIndex,
        patch,
      ) => {
        set((state) => ({
          packages: state.packages.map((pkg) =>
            pkg.id !== packageId
              ? pkg
              : {
                  ...pkg,

                  questions: pkg.questions.map(
                    (question, index) =>
                      index === questionIndex
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

      /**
       * Reset riêng Vòng 4.
       *
       * KHÔNG đụng vào điểm của Vòng 1–3.
       */
      resetRound: () => {
        set(createInitialState());
      },
    }),
    {
      name: "olympia-finish-game",
    },
  ),
);
