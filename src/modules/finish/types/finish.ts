import type { TeamId } from "../../../core/types/game";

export type FinishQuestion = {
  id: string;
  text: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number; // 10, 20, 30
  isVideo: boolean;
  youtubeUrl: string;
};

export type FinishPackage = {
  id: string;
  label: string;
  selectedBy: TeamId | null;
  starUsed: boolean;
  questions: FinishQuestion[];
};

export type FinishStatus = 'selection' | 'playing' | 'finished';

// Các pha trong một câu hỏi
export type QuestionPhase =
  | 'intro'           // giới thiệu độ khó
  | 'star_decision'   // chọn dùng sao hay không
  | 'playing'         // hiển thị câu hỏi, timer đang chạy
  | 'result'          // kết quả của đội chính (đúng/sai) – có thể bỏ qua
  | 'steal'           // cơ hội cướp cho đội khác
  | 'resolved';       // đã kết thúc câu hỏi

// Dùng để lưu kết quả trả lời
export type AnswerResult = {
  correct: boolean;
  points: number;
  teamId: TeamId | null; // đội đã trả lời (đội chính hoặc đội cướp)
};
