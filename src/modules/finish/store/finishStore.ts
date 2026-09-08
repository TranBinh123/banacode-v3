import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../core/types/game";
import type { FinishPackage, FinishQuestion, FinishStatus, QuestionPhase } from "../types/finish";

const TEAM_IDS: TeamId[] = ["team-1", "team-2", "team-3", "team-4"];

// Hàm tạo câu hỏi mẫu
const createQuestion = (
  packageIndex: number,
  questionIndex: number,
  difficulty: 'easy' | 'medium' | 'hard',
  points: number,
  isVideo: boolean = false,
): FinishQuestion => ({
  id: `finish-${packageIndex + 1}-${questionIndex + 1}`,
  text: "",
  answer: "",
  difficulty,
  points,
  isVideo,
  youtubeUrl: isVideo ? "https://www.youtube.com/watch?v=..." : "",
});

// Tạo 4 gói, mỗi gói 5 câu: 2 dễ (10), 2 vừa (20), 1 khó (30, video)
const createPackages = (): FinishPackage[] =>
  Array.from({ length: 4 }, (_, packageIndex) => ({
    id: `package-${packageIndex + 1}`,
    label: `GÓI ${packageIndex + 1}`,
    selectedBy: null,
    starUsed: false,
    questions: [
      createQuestion(packageIndex, 0, 'easy', 10),
      createQuestion(packageIndex, 1, 'easy', 10),
      createQuestion(packageIndex, 2, 'medium', 20),
      createQuestion(packageIndex, 3, 'medium', 20),
      createQuestion(packageIndex, 4, 'hard', 30, true),
    ],
  }));

// Shuffle (Fisher–Yates)
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type FinishStore = {
  packages: FinishPackage[];
  status: FinishStatus;
  currentTeamId: TeamId | null;
  currentPackageId: string | null;
  currentQuestionIndex: number;
  questionPhase: QuestionPhase;
  starActive: boolean;          // có sử dụng sao cho câu hiện tại?
  starDecisionPending: boolean; // đang chờ quyết định sao?
  selectedStealTeamId: TeamId | null;
  selectionOrder: TeamId[];
  timerSeconds: number;
  isTimerRunning: boolean;
  // Kết quả tạm để hiển thị
  lastResult: { correct: boolean; points: number; teamId: TeamId | null } | null;

  // Actions
  selectPackage: (teamId: TeamId, packageId: string) => boolean;
  startQuestion: () => void;            // từ intro sang star_decision hoặc playing
  decideStar: (useStar: boolean) => void;
  startTimer: () => void;               // bắt đầu đếm giờ
  markCorrect: () => void;              // đội chính trả lời đúng
  markWrong: () => void;                // đội chính trả lời sai
  selectStealTeam: (teamId: TeamId) => void;
  markStealCorrect: () => void;
  markStealWrong: () => void;
  advanceQuestion: () => void;
  nextTeam: () => void;
  updatePackage: (packageId: string, patch: Partial<Pick<FinishPackage, "label">>) => void;
  updateQuestion: (packageId: string, questionIndex: number, patch: Partial<FinishQuestion>) => void;
  resetRound: () => void;
  // Hàm giảm timer (gọi từ useEffect bên ngoài)
  tickTimer: () => void;
};

// State khởi tạo
const getInitialState = (): Omit<
  FinishStore,
  | "selectPackage"
  | "startQuestion"
  | "decideStar"
  | "startTimer"
  | "markCorrect"
  | "markWrong"
  | "selectStealTeam"
  | "markStealCorrect"
  | "markStealWrong"
  | "advanceQuestion"
  | "nextTeam"
  | "updatePackage"
  | "updateQuestion"
  | "resetRound"
  | "tickTimer"
> => ({
  packages: createPackages(),
  status: "selection",
  currentTeamId: null,
  currentPackageId: null,
  currentQuestionIndex: 0,
  questionPhase: "intro",
  starActive: false,
  starDecisionPending: false,
  selectedStealTeamId: null,
  selectionOrder: [],
  timerSeconds: 30,
  isTimerRunning: false,
  lastResult: null,
});

export const useFinishStore = create<FinishStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      selectPackage: (teamId, packageId) => {
        const state = get();
        if (state.status !== "selection") return false;
        if (!TEAM_IDS.includes(teamId)) return false;
        if (state.packages.some((pkg) => pkg.selectedBy === teamId)) return false;

        const pkg = state.packages.find((p) => p.id === packageId);
        if (!pkg || pkg.selectedBy !== null) return false;

        // Xáo trộn câu hỏi trong gói
        const shuffled = shuffle(pkg.questions);

        set({
          packages: state.packages.map((p) =>
            p.id === packageId
              ? { ...p, selectedBy: teamId, questions: shuffled }
              : p
          ),
          status: "playing",
          currentTeamId: teamId,
          currentPackageId: packageId,
          currentQuestionIndex: 0,
          questionPhase: "intro",
          starActive: false,
          starDecisionPending: false,
          selectedStealTeamId: null,
          selectionOrder: [...state.selectionOrder, teamId],
          timerSeconds: 30,
          isTimerRunning: false,
          lastResult: null,
        });
        return true;
      },

      startQuestion: () => {
        const state = get();
        if (state.questionPhase !== "intro") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        // Nếu gói chưa dùng sao, cho quyết định
        if (!pkg.starUsed) {
          set({
            questionPhase: "star_decision",
            starDecisionPending: true,
          });
        } else {
          // Không dùng sao, vào thẳng câu hỏi
          set({
            questionPhase: "playing",
            starActive: false,
            starDecisionPending: false,
            timerSeconds: 30,
            isTimerRunning: false,
            lastResult: null,
          });
        }
      },

      decideStar: (useStar) => {
        const state = get();
        if (state.questionPhase !== "star_decision") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;

        if (useStar) {
          set({
            packages: state.packages.map((p) =>
              p.id === pkg.id ? { ...p, starUsed: true } : p
            ),
            starActive: true,
            starDecisionPending: false,
            questionPhase: "playing",
            timerSeconds: 30,
            isTimerRunning: false,
            lastResult: null,
          });
        } else {
          set({
            starActive: false,
            starDecisionPending: false,
            questionPhase: "playing",
            timerSeconds: 30,
            isTimerRunning: false,
            lastResult: null,
          });
        }
      },

      startTimer: () => {
        const state = get();
        if (state.questionPhase !== "playing") return;
        set({ isTimerRunning: true });
      },

      // Timer tick (gọi từ useEffect)
      tickTimer: () => {
        const state = get();
        if (!state.isTimerRunning || state.questionPhase !== "playing") return;
        if (state.timerSeconds <= 0) {
          set({ isTimerRunning: false });
          // Hết giờ coi như sai (markWrong)
          // Nhưng để tránh gọi đệ quy, ta sẽ gọi markWrong từ page khi timer về 0
          return;
        }
        set({ timerSeconds: state.timerSeconds - 1 });
      },

      markCorrect: () => {
        const state = get();
        if (state.questionPhase !== "playing") return;
        if (!state.currentTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        const points = state.starActive ? question.points * 2 : question.points;

        // Lưu kết quả để page xử lý
        set({
          lastResult: { correct: true, points, teamId: state.currentTeamId },
          questionPhase: "resolved",
          isTimerRunning: false,
        });
      },

      markWrong: () => {
        const state = get();
        if (state.questionPhase !== "playing") return;
        if (!state.currentTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        // Sai: nếu có sao, đội chính bị trừ điểm; nếu không có sao, chỉ mở cướp
        // Tùy vào có sao hay không, xử lý khác nhau
        // Ta sẽ để page xử lý việc cộng/trừ, còn store chỉ chuyển trạng thái
        // Nếu có sao, đội chính bị trừ điểm (x1)
        // Nếu không có sao, không trừ điểm
        // Sau đó chuyển sang steal
        const withStar = state.starActive;
        if (withStar) {
          // Đội chính bị trừ điểm
          // Store lưu kết quả sai để page trừ điểm
          set({
            lastResult: { correct: false, points: question.points, teamId: state.currentTeamId },
            questionPhase: "steal",
            isTimerRunning: false,
            selectedStealTeamId: null,
          });
        } else {
          // Không có sao: không trừ điểm, mở cướp
          set({
            lastResult: null,
            questionPhase: "steal",
            isTimerRunning: false,
            selectedStealTeamId: null,
          });
        }
      },

      selectStealTeam: (teamId) => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        if (!state.currentTeamId) return;
        if (teamId === state.currentTeamId) return;
        if (!TEAM_IDS.includes(teamId)) return;

        set({ selectedStealTeamId: teamId });
      },

      markStealCorrect: () => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        if (!state.selectedStealTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        // Đội cướp được + điểm
        // Đội chính đã bị trừ nếu có sao (đã lưu ở lastResult)
        // Nếu không có sao, đội chính không bị trừ, nhưng đội cướp được + điểm
        // Lưu kết quả
        set({
          lastResult: { correct: true, points: question.points, teamId: state.selectedStealTeamId },
          questionPhase: "resolved",
          isTimerRunning: false,
          selectedStealTeamId: null,
        });
      },

      markStealWrong: () => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        if (!state.selectedStealTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        // Nếu có sao: đội cướp bị trừ điểm
        // Nếu không có sao: không ai bị trừ
        const withStar = state.starActive;
        let points = 0;
        let teamId = null;
        if (withStar) {
          points = question.points;
          teamId = state.selectedStealTeamId;
        }

        set({
          lastResult: withStar ? { correct: false, points, teamId } : null,
          questionPhase: "resolved",
          isTimerRunning: false,
          selectedStealTeamId: null,
        });
      },

      advanceQuestion: () => {
        const state = get();
        if (state.questionPhase !== "resolved") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const nextIndex = state.currentQuestionIndex + 1;

        if (nextIndex < pkg.questions.length) {
          // Chuyển sang câu tiếp theo
          set({
            currentQuestionIndex: nextIndex,
            questionPhase: "intro",
            starActive: false,
            starDecisionPending: false,
            selectedStealTeamId: null,
            timerSeconds: 30,
            isTimerRunning: false,
            lastResult: null,
          });
        } else {
          // Đã hết câu trong gói
          set({ status: "finished" });
        }
      },

      nextTeam: () => {
        const state = get();
        if (state.status !== "finished") return;

        // Kiểm tra xem còn đội nào chưa thi không
        const assignedTeams = state.packages
          .filter((p) => p.selectedBy !== null)
          .map((p) => p.selectedBy) as TeamId[];

        const remaining = TEAM_IDS.filter((id) => !assignedTeams.includes(id));

        if (remaining.length > 0) {
          set({
            status: "selection",
            currentTeamId: null,
            currentPackageId: null,
            currentQuestionIndex: 0,
            questionPhase: "intro",
            starActive: false,
            starDecisionPending: false,
            selectedStealTeamId: null,
            timerSeconds: 30,
            isTimerRunning: false,
            lastResult: null,
          });
        } else {
          // Tất cả đội đã thi xong
          set({
            status: "finished",
          });
        }
      },

      updatePackage: (packageId, patch) => {
        set((state) => ({
          packages: state.packages.map((pkg) =>
            pkg.id === packageId ? { ...pkg, ...patch } : pkg
          ),
        }));
      },

      updateQuestion: (packageId, questionIndex, patch) => {
        set((state) => ({
          packages: state.packages.map((pkg) =>
            pkg.id === packageId
              ? {
                  ...pkg,
                  questions: pkg.questions.map((q, idx) =>
                    idx === questionIndex ? { ...q, ...patch } : q
                  ),
                }
              : pkg
          ),
        }));
      },

      resetRound: () => {
        set(getInitialState());
      },
    }),
    { name: "olympia-finish-game-v2" }
  )
);
