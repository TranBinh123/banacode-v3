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

  /**
   * Đội đang thi.
   */
  currentTeamId: TeamId | null;

  /**
   * Gói đang được sử dụng.
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
   * Trạng thái xử lý câu hỏi.
   */
  resolution: FinishResolution;

  /**
   * Đội hiện tại đã sử dụng Ngôi sao.
   */
  starActive: boolean;

  /**
   * Đang chờ đội quyết định có dùng Ngôi sao hay không.
   */
  starDecisionPending: boolean;

  /**
   * Đội được chọn để cướp điểm.
   */
  selectedStealTeamId: TeamId | null;

  /**
   * Thứ tự các đội được MC/Kỹ thuật
   * ghép với gói câu hỏi.
   *
   * Không còn cố định team-1 → team-2 → team-3 → team-4.
   */
  selectionOrder: TeamId[];

  /**
   * Đội đang được chọn để ghép gói
   * trên màn hình lựa chọn.
   */
  selectionTeamId: TeamId | null;

  /**
   * Gán một đội vào một gói câu hỏi.
   *
   * Một đội chỉ được gán một gói.
   * Một gói chỉ được gán một đội.
   */
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
  | "selectionTeamId"
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

  /**
   * Ban đầu chưa có đội nào được ghép.
   */
  selectionOrder: [],

  selectionTeamId: null,
});

export const useFinishStore = create<FinishStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      /**
       * Gán đội vào gói câu hỏi.
       *
       * Không ép thứ tự đội.
       *
       * Ví dụ:
       * team-3 → GÓI 2
       * team-1 → GÓI 4
       * team-4 → GÓI 1
       * team-2 → GÓI 3
       */
      selectPackage: (teamId, packageId) => {
        const state = get();

        if (state.status !== "selection") {
          return false;
        }

        const teamAlreadyAssigned =
          state.packages.some(
            (pkg) => pkg.selectedBy === teamId,
          );

        if (teamAlreadyAssigned) {
          return false;
        }

        const selectedPackage =
          state.packages.find(
            (pkg) => pkg.id === packageId,
          );

        if (!selectedPackage) {
          return false;
        }

        if (selectedPackage.selectedBy !== null) {
          return false;
        }

        const nextSelectionOrder = [
          ...state.selectionOrder,
          teamId,
        ];

        set({
          packages: state.packages.map((pkg) =>
            pkg.id === packageId
              ? {
                  ...pkg,
                  selectedBy: teamId,
                }
              : pkg,
          ),

          /**
           * Đội vừa được ghép sẽ bắt đầu
           * gói câu hỏi của mình ngay.
           */
          status: "playing",

          currentTeamId: teamId,

          currentPackageId: packageId,

          currentQuestionIndex: 0,

          resolution: "awaiting-main-result",

          starActive: false,

          starDecisionPending: false,

          selectedStealTeamId: null,

          selectionOrder: nextSelectionOrder,

          selectionTeamId: null,
        });

        return true;
      },

      /**
       * Đội quyết định có dùng Ngôi sao hay không.
       *
       * Chỉ được quyết định trước Câu 4 hoặc Câu 5.
       *
       * Không xác định trước câu nào là Ngôi sao.
       */
      decideStar: (useStar) => {
        const state = get();

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

        if (
          questionIndex !== 3 &&
          questionIndex !== 4
        ) {
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
        } else {
          set({
            starActive: false,

            starDecisionPending: false,

            resolution:
              "awaiting-main-result",
          });
        }
      },

      /**
       * Chấm đội chính ĐÚNG.
       *
       * Điểm sẽ được xử lý tại FinishPage
       * thông qua gameStore.
       */
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

      /**
       * Chấm đội chính SAI.
       *
       * Nếu đang dùng Ngôi sao:
       * → mở quyền cướp điểm.
       *
       * Nếu không:
       * → kết thúc câu hỏi.
       */
      markWrong: () => {
        const state = get();

        if (
          state.resolution !==
          "awaiting-main-result"
        ) {
          return;
        }

        if (state.starActive) {
          set({
            resolution:
              "selecting-steal-team",

            selectedStealTeamId: null,
          });

          return;
        }

        set({
          resolution: "resolved",
        });
      },

      /**
       * MC/Kỹ thuật chọn đội cướp.
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

          resolution:
            "awaiting-steal-result",
        });
      },

      /**
       * Đội cướp ĐÚNG.
       *
       * Điểm được xử lý tại FinishPage:
       *
       * Đội cướp +20
       * Đội Ngôi sao -10
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
       * Đội cướp SAI.
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

        if (
          state.resolution !== "resolved"
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

        /**
         * Chỉ tại Câu 4 hoặc Câu 5 mới
         * đưa ra quyết định Ngôi sao.
         */
        const shouldAskStar =
          currentPackage !== null &&
          currentPackage !== undefined &&
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

      /**
       * Hoàn thành Câu 5.
       *
       * Nếu còn đội đã được ghép:
       * → chuyển sang đội tiếp theo
       * theo đúng thứ tự MC/Kỹ thuật đã ghép.
       *
       * Nếu chưa có đội tiếp theo:
       * → quay lại màn hình lựa chọn.
       *
       * Nếu cả 4 đội đã hoàn thành:
       * → kết thúc Vòng 4.
       */
      nextTeam: () => {
        const state = get();

        if (
          state.currentQuestionIndex !== 4
        ) {
          return;
        }

        if (
          state.resolution !== "resolved"
        ) {
          return;
        }

        const currentIndex =
          state.currentTeamId
            ? state.selectionOrder.indexOf(
                state.currentTeamId,
              )
            : -1;

        const nextAssignedTeamId =
          currentIndex >= 0
            ? state.selectionOrder[
                currentIndex + 1
              ] ?? null
            : null;

        /**
         * Nếu có đội tiếp theo đã được ghép,
         * bắt đầu gói của đội đó.
         */
        if (nextAssignedTeamId) {
          const nextPackage =
            state.packages.find(
              (pkg) =>
                pkg.selectedBy ===
                nextAssignedTeamId,
            );

          if (nextPackage) {
            set({
              status: "playing",

              currentTeamId:
                nextAssignedTeamId,

              currentPackageId:
                nextPackage.id,

              currentQuestionIndex: 0,

              resolution:
                "awaiting-main-result",

              starActive: false,

              starDecisionPending: false,

              selectedStealTeamId: null,

              selectionTeamId: null,
            });

            return;
          }
        }

        /**
         * Nếu chưa đủ 4 đội được ghép,
         * quay về màn hình lựa chọn.
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

            selectionTeamId: null,
          });

          return;
        }

        /**
         * Cả 4 đội đã hoàn thành.
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

          selectionTeamId: null,
        });
      },

      /**
       * Đổi tên gói.
       */
      updatePackage: (
        packageId,
        patch,
      ) => {
        set((state) => ({
          packages:
            state.packages.map((pkg) =>
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
       * Chỉnh sửa câu hỏi.
       */
      updateQuestion: (
        packageId,
        questionIndex,
        patch,
      ) => {
        set((state) => ({
          packages:
            state.packages.map((pkg) =>
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

      /**
       * Reset riêng Vòng 4.
       *
       * Không đụng đến gameStore,
       * vì điểm tổng của các vòng
       * nằm ở store chung.
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
