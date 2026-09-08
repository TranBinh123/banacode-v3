import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../core/types/game";
import type { FinishPackage, FinishQuestion, FinishStatus, QuestionPhase } from "../types/finish";

const TEAM_IDS: TeamId[] = ["team-1", "team-2", "team-3", "team-4"];

// Tạo câu hỏi mẫu
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

// Tạo 4 gói, mỗi gói 5 câu: 2 dễ, 2 vừa, 1 khó
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

// Hàm xáo trộn mảng
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type FinishStore = {
  // State
  packages: FinishPackage[];
  status: FinishStatus;
  currentTeamId: TeamId | null;
  currentPackageId: string | null;
  currentQuestionIndex: number;
  questionPhase: QuestionPhase;
  starActive: boolean;
  starDecisionPending: boolean;
  selectedStealTeamId: TeamId | null;
  selectionOrder: TeamId[];
  timerSeconds: number;
  isTimerRunning: boolean;

  // Kết quả để hiển thị
  lastResult: { correct: boolean; points: number; teamId: TeamId | null } | null;
  stealResult: { correct: boolean; points: number; teamId: TeamId | null } | null;

  // Actions
  selectPackage: (teamId: TeamId, packageId: string) => boolean;
  startQuestion: () => void;
  decideStar: (useStar: boolean) => void;
  startTimer: () => void;
  markCorrect: () => void;
  markWrong: () => void;
  selectStealTeam: (teamId: TeamId) => void;
  markStealCorrect: () => void;
  markStealWrong: () => void;
  advanceQuestion: () => void;
  nextTeam: () => void;

  // Admin actions
  updatePackage: (packageId: string, patch: Partial<Pick<FinishPackage, "label">>) => void;
  updateQuestion: (packageId: string, questionIndex: number, patch: Partial<FinishQuestion>) => void;
  resetRound: () => void;
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
  stealResult: null,
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
        const shuffledQuestions = shuffleArray(pkg.questions);

        set({
          packages: state.packages.map((p) =>
            p.id === packageId
              ? { ...p, selectedBy: teamId, questions: shuffledQuestions }
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
          stealResult: null,
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

        // Nếu gói chưa dùng sao, hỏi quyết định
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
          });
        } else {
          set({
            starActive: false,
            starDecisionPending: false,
            questionPhase: "playing",
            timerSeconds: 30,
            isTimerRunning: false,
          });
        }
      },

      startTimer: () => {
        set({ isTimerRunning: true });
      },

      // Đội chính trả lời đúng
      markCorrect: () => {
        const state = get();
        if (state.questionPhase !== "playing") return;
        if (!state.currentTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        const points = state.starActive ? question.points * 2 : question.points;

        set({
          questionPhase: "resolved",
          lastResult: {
            correct: true,
            points,
            teamId: state.currentTeamId,
          },
          isTimerRunning: false,
        });
      },

      // Đội chính trả lời sai
      markWrong: () => {
        const state = get();
        if (state.questionPhase !== "playing") return;
        if (!state.currentTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        const points = question.points; // điểm của câu hỏi

        // Lưu kết quả sai
        set({
          questionPhase: "steal", // mở cơ hội cướp
          lastResult: {
            correct: false,
            points,
            teamId: state.currentTeamId,
          },
          isTimerRunning: false,
          selectedStealTeamId: null,
          stealResult: null,
        });
      },

      selectStealTeam: (teamId) => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        if (!state.currentTeamId) return;
        if (teamId === state.currentTeamId) return;
        if (!TEAM_IDS.includes(teamId)) return;

        set({ selectedStealTeamId: teamId });
      },

      // Đội cướp trả lời đúng
      markStealCorrect: () => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        if (!state.selectedStealTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        const points = question.points; // cướp đúng được điểm câu hỏi

        set({
          questionPhase: "resolved",
          stealResult: {
            correct: true,
            points,
            teamId: state.selectedStealTeamId,
          },
          selectedStealTeamId: null,
        });
      },

      // Đội cướp trả lời sai
      markStealWrong: () => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        if (!state.selectedStealTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        const points = question.points;

        // Nếu có sao thì đội cướp bị trừ điểm, nếu không thì bình yên
        const isStar = state.starActive;

        set({
          questionPhase: "resolved",
          stealResult: {
            correct: false,
            points: isStar ? points : 0, // nếu có sao thì trừ điểm, nếu không thì 0 (không trừ)
            teamId: state.selectedStealTeamId,
          },
          selectedStealTeamId: null,
        });
      },

      advanceQuestion: () => {
        const state = get();
        if (state.questionPhase !== "resolved") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;

        const nextIndex = state.currentQuestionIndex + 1;
        if (nextIndex >= pkg.questions.length) {
          // Hết câu hỏi trong gói, chuyển sang đội tiếp theo
          // Không tự động nextTeam, để MC bấm nút "Hoàn thành gói"
          // Nhưng store không có nút đó, ta sẽ để page gọi nextTeam
          // Để tạm thời ta chỉ set currentQuestionIndex = nextIndex nhưng sẽ báo hết
          // Thực tế nên có nút "Hoàn thành gói" để gọi nextTeam
          // Tôi sẽ để page kiểm tra và gọi nextTeam
          set({
            currentQuestionIndex: nextIndex,
            questionPhase: "intro",
            starActive: false,
            starDecisionPending: false,
            timerSeconds: 30,
            isTimerRunning: false,
            lastResult: null,
            stealResult: null,
          });
          // Page sẽ phát hiện nếu nextIndex >= length và hiển thị nút "Hoàn thành gói"
        } else {
          set({
            currentQuestionIndex: nextIndex,
            questionPhase: "intro",
            starActive: false,
            starDecisionPending: false,
            timerSeconds: 30,
            isTimerRunning: false,
            lastResult: null,
            stealResult: null,
          });
        }
      },

      nextTeam: () => {
        const state = get();
        // Chỉ cho phép gọi khi đã hoàn thành tất cả câu trong gói hiện tại
        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        if (state.currentQuestionIndex < pkg.questions.length) return;

        const currentTeamIndex = state.currentTeamId
          ? state.selectionOrder.indexOf(state.currentTeamId)
          : -1;
        const nextTeamId = currentTeamIndex >= 0
          ? state.selectionOrder[currentTeamIndex + 1] ?? null
          : null;

        if (nextTeamId) {
          const nextPackage = state.packages.find((p) => p.selectedBy === nextTeamId);
          if (nextPackage) {
            set({
              status: "playing",
              currentTeamId: nextTeamId,
              currentPackageId: nextPackage.id,
              currentQuestionIndex: 0,
              questionPhase: "intro",
              starActive: false,
              starDecisionPending: false,
              selectedStealTeamId: null,
              timerSeconds: 30,
              isTimerRunning: false,
              lastResult: null,
              stealResult: null,
            });
            return;
          }
        }

        // Nếu không còn đội nào, chuyển sang finished
        if (state.selectionOrder.length >= TEAM_IDS.length) {
          set({
            status: "finished",
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
            stealResult: null,
          });
          return;
        }

        // Quay lại selection nếu vẫn còn đội chưa chọn
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
          stealResult: null,
        });
      },

      // Admin actions
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
    { name: "olympia-finish-game" }
  )
);
