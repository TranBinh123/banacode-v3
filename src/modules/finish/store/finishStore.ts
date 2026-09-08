import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../core/types/game";
import type {
  FinishPackage,
  FinishQuestion,
  FinishStatus,
  QuestionPhase,
  AnswerResult,
} from "../types/finish";

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

// Tạo 4 gói, mỗi gói 5 câu: 2 dễ (10đ), 2 vừa (20đ), 1 khó (30đ, video)
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

// Hàm xáo trộn mảng (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
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
  // Lưu kết quả để hiển thị (không dùng cho logic)
  lastAnswer: AnswerResult | null;
  lastStealResult: AnswerResult | null;

  // Actions
  selectPackage: (teamId: TeamId, packageId: string) => boolean;
  startQuestion: () => void; // chuyển từ intro -> star_decision hoặc playing
  startTimer: () => void; // bắt đầu timer (gọi từ page)
  markCorrect: () => void; // đội chính trả lời đúng
  markWrong: () => void; // đội chính trả lời sai
  selectStealTeam: (teamId: TeamId) => void;
  markStealCorrect: () => void;
  markStealWrong: () => void;
  advanceQuestion: () => void; // chuyển sang câu tiếp theo (khi resolved)
  nextTeam: () => void; // chuyển đội tiếp theo
  updatePackage: (packageId: string, patch: Partial<Pick<FinishPackage, "label">>) => void;
  updateQuestion: (packageId: string, questionIndex: number, patch: Partial<FinishQuestion>) => void;
  resetRound: () => void;
  // Hàm helper để reset timer
  resetTimer: () => void;
};

const createInitialState = (): Omit<
  FinishStore,
  | "selectPackage"
  | "startQuestion"
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
  | "resetTimer"
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
  lastAnswer: null,
  lastStealResult: null,
});

export const useFinishStore = create<FinishStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      selectPackage: (teamId, packageId) => {
        const state = get();
        if (state.status !== "selection") return false;
        if (!TEAM_IDS.includes(teamId)) return false;
        if (state.packages.some((pkg) => pkg.selectedBy === teamId)) return false;

        const pkg = state.packages.find((p) => p.id === packageId);
        if (!pkg || pkg.selectedBy !== null) return false;

        // Xáo trộn câu hỏi trong gói
        const shuffledQuestions = shuffle(pkg.questions);

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
          lastAnswer: null,
          lastStealResult: null,
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

        // Nếu gói chưa dùng sao -> hiển thị chọn sao
        if (!pkg.starUsed) {
          set({
            questionPhase: "star_decision",
            starDecisionPending: true,
          });
        } else {
          // Đã dùng sao -> vào thẳng câu hỏi
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

      resetTimer: () => {
        set({ timerSeconds: 30, isTimerRunning: false });
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

        // Lưu kết quả để hiển thị, nhưng điểm sẽ được cộng ở page
        set({
          questionPhase: "resolved",
          isTimerRunning: false,
          lastAnswer: {
            correct: true,
            points,
            teamId: state.currentTeamId,
          },
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

        const points = state.starActive ? question.points * 2 : question.points;

        // Lưu kết quả sai của đội chính
        set({
          questionPhase: "steal",
          isTimerRunning: false,
          lastAnswer: {
            correct: false,
            points,
            teamId: state.currentTeamId,
          },
          selectedStealTeamId: null,
        });
      },

      selectStealTeam: (teamId) => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        if (!state.currentTeamId) return;
        if (teamId === state.currentTeamId) return;
        if (!TEAM_IDS.includes(teamId)) return;

        set({
          selectedStealTeamId: teamId,
        });
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

        const points = question.points; // điểm câu hỏi (không nhân đôi)

        set({
          questionPhase: "resolved",
          isTimerRunning: false,
          lastStealResult: {
            correct: true,
            points,
            teamId: state.selectedStealTeamId,
          },
          // Không reset selectedStealTeamId để hiển thị
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

        set({
          questionPhase: "resolved",
          isTimerRunning: false,
          lastStealResult: {
            correct: false,
            points,
            teamId: state.selectedStealTeamId,
          },
        });
      },

      advanceQuestion: () => {
        const state = get();
        if (state.questionPhase !== "resolved") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;

        const nextIndex = state.currentQuestionIndex + 1;
        if (nextIndex < pkg.questions.length) {
          set({
            currentQuestionIndex: nextIndex,
            questionPhase: "intro",
            starActive: false,
            starDecisionPending: false,
            selectedStealTeamId: null,
            timerSeconds: 30,
            isTimerRunning: false,
            lastAnswer: null,
            lastStealResult: null,
          });
        } else {
          // Hết câu trong gói -> chuyển đội tiếp theo
          set({
            currentQuestionIndex: 0,
            questionPhase: "intro",
            starActive: false,
            starDecisionPending: false,
            selectedStealTeamId: null,
            timerSeconds: 30,
            isTimerRunning: false,
            lastAnswer: null,
            lastStealResult: null,
          });
          // Gọi nextTeam để chuyển đội
          get().nextTeam();
        }
      },

      nextTeam: () => {
        const state = get();
        const currentIndex = state.currentTeamId
          ? state.selectionOrder.indexOf(state.currentTeamId)
          : -1;
        const nextTeamId = currentIndex >= 0 ? state.selectionOrder[currentIndex + 1] ?? null : null;

        if (nextTeamId) {
          const nextPackage = state.packages.find((pkg) => pkg.selectedBy === nextTeamId);
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
              lastAnswer: null,
              lastStealResult: null,
            });
            return;
          }
        }

        // Nếu đã hết đội hoặc không tìm thấy gói, chuyển sang finished
        if (state.selectionOrder.length === TEAM_IDS.length) {
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
            lastAnswer: null,
            lastStealResult: null,
          });
        } else {
          // Vẫn còn đội chưa được gán -> quay về selection
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
            lastAnswer: null,
            lastStealResult: null,
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
            pkg.id !== packageId
              ? pkg
              : {
                  ...pkg,
                  questions: pkg.questions.map((q, idx) =>
                    idx === questionIndex ? { ...q, ...patch } : q
                  ),
                }
          ),
        }));
      },

      resetRound: () => {
        set(createInitialState());
      },
    }),
    {
      name: "olympia-finish-game",
    }
  )
);
