import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamId } from "../../../core/types/game";
import type { FinishPackage, FinishQuestion, FinishStatus, QuestionPhase } from "../types/finish";

const TEAM_IDS: TeamId[] = ["team-1", "team-2", "team-3", "team-4"];

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

function shuffleArray<T>(array: T[]): T[] {
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

  lastResult: { correct: boolean; points: number; teamId: TeamId | null } | null;
  stealResult: { correct: boolean; points: number; teamId: TeamId | null } | null;

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

const getInitialState = (): Omit<
  FinishStore,
  | "selectPackage" | "startQuestion" | "decideStar" | "startTimer" | "tickTimer"
  | "markCorrect" | "markWrong" | "selectStealTeam" | "markStealCorrect"
  | "markStealWrong" | "advanceQuestion" | "nextTeam" | "updatePackage"
  | "updateQuestion" | "resetRound"
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

        const shuffledQuestions = shuffleArray(pkg.questions);

        set({
          packages: state.packages.map((p) =>
            p.id === packageId ? { ...p, selectedBy: teamId, questions: shuffledQuestions } : p
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

        if (!pkg.starUsed) {
          set({ questionPhase: "star_decision", starDecisionPending: true });
        } else {
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

        set({
          packages: state.packages.map((p) =>
            p.id === pkg.id ? { ...p, starUsed: useStar ? true : p.starUsed } : p
          ),
          starActive: useStar,
          starDecisionPending: false,
          questionPhase: "playing",
          timerSeconds: 30,
          isTimerRunning: false,
        });
      },

      startTimer: () => set({ isTimerRunning: true }),

      tickTimer: () => {
        const { timerSeconds, isTimerRunning } = get();
        if (!isTimerRunning) return;
        if (timerSeconds <= 1) {
          set({ timerSeconds: 0, isTimerRunning: false });
          get().markWrong();
        } else {
          set({ timerSeconds: timerSeconds - 1 });
        }
      },

      markCorrect: () => {
        const state = get();
        if (state.questionPhase !== "playing" || !state.currentTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        const points = state.starActive ? question.points * 2 : question.points;

        set({
          questionPhase: "resolved",
          lastResult: { correct: true, points, teamId: state.currentTeamId },
          isTimerRunning: false,
        });
      },

      markWrong: () => {
        const state = get();
        if (state.questionPhase !== "playing" || !state.currentTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        const points = state.starActive ? -question.points : 0;

        set({
          questionPhase: "steal",
          lastResult: { correct: false, points, teamId: state.currentTeamId },
          isTimerRunning: false,
          selectedStealTeamId: null,
          stealResult: null,
        });
      },

      selectStealTeam: (teamId) => {
        const state = get();
        if (state.questionPhase !== "steal" || !state.currentTeamId) return;
        if (teamId === state.currentTeamId || !TEAM_IDS.includes(teamId)) return;

        set({ selectedStealTeamId: teamId });
      },

      markStealCorrect: () => {
        const state = get();
        if (state.questionPhase !== "steal" || !state.selectedStealTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        set({
          questionPhase: "resolved",
          stealResult: { correct: true, points: question.points, teamId: state.selectedStealTeamId },
        });
      },

      markStealWrong: () => {
        const state = get();
        if (state.questionPhase !== "steal" || !state.selectedStealTeamId) return;

        const pkg = state.packages.find((p) => p.id === state.currentPackageId);
        if (!pkg) return;
        const question = pkg.questions[state.currentQuestionIndex];
        if (!question) return;

        set({
          questionPhase: "resolved",
          stealResult: {
            correct: false,
            points: -(question.points / 2),
            teamId: state.selectedStealTeamId,
          },
        });
      },

      advanceQuestion: () => {
        const state = get();
        if (state.questionPhase !== "resolved") return;

        const nextIndex = state.currentQuestionIndex + 1;
        set({
          currentQuestionIndex: nextIndex,
          questionPhase: "intro",
          starActive: false,
          starDecisionPending: false,
          timerSeconds: 30,
          isTimerRunning: false,
          lastResult: null,
          stealResult: null,
          selectedStealTeamId: null,
        });
      },

      nextTeam: () => {
        const state = get();
        if (state.selectionOrder.length >= TEAM_IDS.length) {
          set({ status: "finished", currentTeamId: null, currentPackageId: null });
        } else {
          set({ status: "selection", currentTeamId: null, currentPackageId: null });
        }
      },

      updatePackage: (packageId, patch) => {
        set((state) => ({
          packages: state.packages.map((pkg) => (pkg.id === packageId ? { ...pkg, ...patch } : pkg)),
        }));
      },

      updateQuestion: (packageId, questionIndex, patch) => {
        set((state) => ({
          packages: state.packages.map((pkg) =>
            pkg.id === packageId
              ? {
                  ...pkg,
                  questions: pkg.questions.map((q, idx) => (idx === questionIndex ? { ...q, ...patch } : q)),
                }
              : pkg
          ),
        }));
      },

      resetRound: () => set(getInitialState()),
    }),
    { name: "olympia-finish-game" }
  )
);
