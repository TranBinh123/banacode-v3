import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../core/types/game";
import type { FinishPackage, FinishQuestion, FinishStatus, QuestionPhase } from "../types/finish";

const TEAM_IDS: TeamId[] = ["team-1", "team-2", "team-3", "team-4"];

// Tạo dữ liệu mẫu
const createQuestion = (
  packageIndex: number,
  questionIndex: number,
  difficulty: "easy" | "medium" | "hard",
  points: number,
  isVideo: boolean = false
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
      createQuestion(packageIndex, 0, "easy", 10),
      createQuestion(packageIndex, 1, "easy", 10),
      createQuestion(packageIndex, 2, "medium", 20),
      createQuestion(packageIndex, 3, "medium", 20),
      createQuestion(packageIndex, 4, "hard", 30, true),
    ],
  }));

// Shuffle array
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
  selectionOrder: TeamId[]; // Lưu thứ tự các đội đã chọn gói
  completedTeams: TeamId[]; // Mảng theo dõi các đội ĐÃ HOÀN THÀNH lượt thi
  timerSeconds: number;
  isTimerRunning: boolean;

  // Actions
  selectPackage: (teamId: TeamId, packageId: string) => boolean;
  startQuestion: () => void;
  decideStar: (useStar: boolean) => void;
  startTimer: () => void;
  tickTimer: () => void;
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
  | "startQuestion"
  | "decideStar"
  | "startTimer"
  | "tickTimer"
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
  questionPhase: "star_decision",
  starActive: false,
  starDecisionPending: false,
  selectedStealTeamId: null,
  selectionOrder: [],
  completedTeams: [],
  timerSeconds: 30,
  isTimerRunning: false,
});

export const useFinishStore = create<FinishStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      selectPackage: (teamId, packageId) => {
        const state = get();
        if (state.status !== "selection") return false;
        if (!TEAM_IDS.includes(teamId)) return false;

        // Kiểm tra đội đã chọn gói trong lượt thi chưa
        if (state.packages.some((pkg) => pkg.selectedBy === teamId)) return false;

        // Kiểm tra gói câu hỏi này đã có đội khác lấy chưa (Loại bỏ gói đã dùng)
        const pkg = state.packages.find((p) => p.id === packageId);
        if (!pkg || pkg.selectedBy !== null) return false;

        // Xáo trộn câu hỏi trong gói
        const shuffledQuestions = shuffle(pkg.questions);

        const newSelectionOrder = state.selectionOrder.includes(teamId)
          ? state.selectionOrder
          : [...state.selectionOrder, teamId];

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
          questionPhase: pkg.starUsed ? "intro" : "star_decision",
          starActive: false,
          starDecisionPending: !pkg.starUsed,
          selectedStealTeamId: null,
          selectionOrder: newSelectionOrder,
          timerSeconds: 30,
          isTimerRunning: false,
        });
        return true;
      },

      decideStar: (useStar) => {
        const state = get();
        if (state.questionPhase !== "star_decision") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;

        if (useStar) {
          // Đội chọn kích hoạt Ngôi sao hy vọng -> Đánh dấu gói này đã dùng Ngôi sao
          set({
            packages: state.packages.map((p) =>
              p.id === pkg.id ? { ...p, starUsed: true } : p
            ),
            starActive: true,
            starDecisionPending: false,
            questionPhase: "intro",
            timerSeconds: 30,
            isTimerRunning: false,
          });
        } else {
          // Từ chối dùng -> Vẫn cho phép hỏi lại ở câu sau (vì starUsed vẫn là false)
          set({
            starActive: false,
            starDecisionPending: false,
            questionPhase: "intro",
            timerSeconds: 30,
            isTimerRunning: false,
          });
        }
      },

      startQuestion: () => {
        const state = get();
        if (state.questionPhase !== "intro") return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;

        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        set({
          questionPhase: "playing",
          timerSeconds: 30,
          isTimerRunning: false,
        });
      },

      startTimer: () => {
        set({ isTimerRunning: true });
      },

      tickTimer: () => {
        const state = get();
        if (!state.isTimerRunning) return;
        if (state.timerSeconds <= 1) {
          set({ isTimerRunning: false, timerSeconds: 0 });
          get().markWrong();
        } else {
          set({ timerSeconds: state.timerSeconds - 1 });
        }
      },

      markCorrect: () => {
        const state = get();
        if (state.questionPhase !== "playing") return;
        set({ questionPhase: "resolved", isTimerRunning: false });
      },

      markWrong: () => {
        const state = get();
        if (state.questionPhase !== "playing") return;
        const remainingTeams = TEAM_IDS.filter((id) => id !== state.currentTeamId);

        if (remainingTeams.length > 0) {
          set({
            questionPhase: "steal",
            selectedStealTeamId: null,
            isTimerRunning: false,
          });
        } else {
          set({ questionPhase: "resolved", isTimerRunning: false });
        }
      },

      selectStealTeam: (teamId) => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        if (teamId === state.currentTeamId) return;
        if (!TEAM_IDS.includes(teamId)) return;
        set({ selectedStealTeamId: teamId });
      },

      markStealCorrect: () => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        set({ questionPhase: "resolved", isTimerRunning: false });
      },

      markStealWrong: () => {
        const state = get();
        if (state.questionPhase !== "steal") return;
        set({ questionPhase: "resolved", isTimerRunning: false });
      },

      advanceQuestion: () => {
        const state = get();
        if (state.questionPhase !== "resolved") return;
        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const nextIndex = state.currentQuestionIndex + 1;

        if (nextIndex >= pkg.questions.length) {
          // Hết 5 câu trong gói -> Chuyển lượt sang đội tiếp theo
          get().nextTeam();
          return;
        }

        // Nếu gói ĐÃ dùng Ngôi sao hy vọng trước đó -> Bỏ qua bước chọn, sang thẳng "intro"
        // Nếu CHƯA dùng Ngôi sao -> Chuyển về "star_decision" để hỏi ở câu tiếp theo
        const starUsed = pkg.starUsed;
        set({
          currentQuestionIndex: nextIndex,
          questionPhase: starUsed ? "intro" : "star_decision",
          starActive: false, // Ngôi sao hy vọng chỉ có hiệu lực ở 1 câu duy nhất đã chọn
          starDecisionPending: !starUsed,
          selectedStealTeamId: null,
          timerSeconds: 30,
          isTimerRunning: false,
        });
      },

      nextTeam: () => {
        const state = get();
        const currentTeam = state.currentTeamId;

        const newCompletedTeams =
          currentTeam && !state.completedTeams.includes(currentTeam)
            ? [...state.completedTeams, currentTeam]
            : state.completedTeams;

        if (newCompletedTeams.length >= TEAM_IDS.length) {
          set({
            status: "finished",
            completedTeams: newCompletedTeams,
            currentTeamId: null,
            currentPackageId: null,
            currentQuestionIndex: 0,
            questionPhase: "star_decision",
            starActive: false,
            starDecisionPending: false,
            selectedStealTeamId: null,
            timerSeconds: 30,
            isTimerRunning: false,
          });
          return;
        }

        set({
          status: "selection",
          completedTeams: newCompletedTeams,
          currentTeamId: null,
          currentPackageId: null,
          currentQuestionIndex: 0,
          questionPhase: "star_decision",
          starActive: false,
          starDecisionPending: false,
          selectedStealTeamId: null,
          timerSeconds: 30,
          isTimerRunning: false,
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
            pkg.id !== packageId
              ? pkg
              : {
                  ...pkg,
                  questions: pkg.questions.map((q, idx) =>
                    idx === questionIndex ? { ...q, ...patch } : q
                  ),
                },
          ),
        }));
      },

      resetRound: () => {
        set(createInitialState());
      },
    }),
    { name: "olympia-finish-game" }
  )
);
