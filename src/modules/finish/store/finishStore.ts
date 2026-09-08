import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../core/types/game";
import type { FinishPackage, FinishQuestion, FinishStatus, QuestionPhase } from "../types/finish";

const TEAM_IDS: TeamId[] = ["team-1", "team-2", "team-3", "team-4"];

// Tạo dữ liệu mẫu
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

// Shuffle array (Fisher–Yates)
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
  starActive: boolean;
  starDecisionPending: boolean;
  selectedStealTeamId: TeamId | null;
  selectionOrder: TeamId[];
  timerSeconds: number;
  isTimerRunning: boolean;
  // Kết quả cuối cùng để hiển thị
  lastResult: 'correct' | 'wrong' | 'steal_correct' | 'steal_wrong' | null;
  lastPoints: number | null;

  // Actions
  selectPackage: (teamId: TeamId, packageId: string) => boolean;
  decideStar: (useStar: boolean) => void;
  startQuestion: () => void;
  startTimer: () => void;
  markCorrect: () => void;
  markWrong: () => void;
  selectStealTeam: (teamId: TeamId) => void;
  markStealCorrect: () => void;
  markStealWrong: () => void;
  advanceQuestion: () => void;
  nextTeam: () => void;
  updatePackage: (packageId: string, patch: Partial<Pick<FinishPackage, "label">>) => void;
  updateQuestion: (packageId: string, questionIndex: number, patch: Partial<FinishQuestion>) => void;
  resetRound: () => void;
};

const createInitialState = (): Omit<
  FinishStore,
  | "selectPackage"
  | "decideStar"
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
  lastPoints: null,
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
          lastResult: null,
          lastPoints: null,
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

        // Nếu gói chưa dùng sao => hỏi
        if (!pkg.starUsed) {
          set({
            questionPhase: "star_decision",
            starDecisionPending: true,
          });
        } else {
          set({
            questionPhase: "playing",
            starActive: false,
            starDecisionPending: false,
            timerSeconds: question.isVideo ? 30 : 30,
            isTimerRunning: false,
          });
        }
      },

      decideStar: (useStar: boolean) => {
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
        const state = get();
        if (state.questionPhase !== "playing") return;
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
          lastResult: "correct",
          lastPoints: points,
          isTimerRunning: false,
        });
      },

      // Đội chính trả lời sai
      markWrong: () => {
        const state = get();
        if (state.questionPhase !== "playing") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        // Nếu có sao, đội chính bị trừ điểm (sẽ xử lý ở page)
        // Mở cơ hội cướp
        set({
          questionPhase: "steal",
          lastResult: "wrong",
          lastPoints: state.starActive ? question.points : 0, // lưu điểm bị trừ nếu có sao
          selectedStealTeamId: null,
          isTimerRunning: false,
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

      markStealCorrect: () => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        if (!state.selectedStealTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        const points = question.points; // đội cướp được điểm câu hỏi (không nhân đôi)

        set({
          questionPhase: "resolved",
          lastResult: "steal_correct",
          lastPoints: points,
          selectedStealTeamId: null,
          isTimerRunning: false,
        });
      },

      markStealWrong: () => {
        const state = get();
        if (state.questionPhase !== "steal") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        // Nếu có sao, đội cướp bị trừ điểm
        const penalty = state.starActive ? question.points : 0;

        set({
          questionPhase: "resolved",
          lastResult: "steal_wrong",
          lastPoints: penalty, // điểm bị trừ (nếu có sao)
          selectedStealTeamId: null,
          isTimerRunning: false,
        });
      },

      advanceQuestion: () => {
        const state = get();
        if (state.questionPhase !== "resolved") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;

        const nextIndex = state.currentQuestionIndex + 1;
        if (nextIndex >= pkg.questions.length) {
          // Hết câu hỏi trong gói -> chuyển đội tiếp theo
          // Nhưng phải qua nextTeam
          return;
        }

        set({
          currentQuestionIndex: nextIndex,
          questionPhase: "intro",
          starActive: false,
          starDecisionPending: false,
          selectedStealTeamId: null,
          timerSeconds: 30,
          isTimerRunning: false,
          lastResult: null,
          lastPoints: null,
        });
      },

      nextTeam: () => {
        const state = get();
        // Kiểm tra đã hoàn thành gói hiện tại
        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        if (state.currentQuestionIndex !== pkg.questions.length - 1) return;
        if (state.questionPhase !== "resolved") return;

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
              lastPoints: null,
            });
            return;
          }
        }

        // Nếu còn đội chưa được gán, quay lại selection
        if (state.selectionOrder.length < TEAM_IDS.length) {
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
            lastPoints: null,
          });
          return;
        }

        // Tất cả đã hoàn thành
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
          lastPoints: null,
        });
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
        set(createInitialState());
      },
    }),
    {
      name: "olympia-finish-game",
    }
  )
);
