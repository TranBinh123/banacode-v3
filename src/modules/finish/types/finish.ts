import type { TeamId } from "../../../core/types/game";

export type FinishQuestion = {
  id: string;
  text: string;
  answer: string;

  /**
   * Nếu true, Public Screen sẽ hiển thị trình phát YouTube.
   */
  isVideo: boolean;

  /**
   * URL YouTube do BTC nhập.
   * Ví dụ:
   * https://www.youtube.com/watch?v=xxxxx
   */
  youtubeUrl: string;
};

export type FinishPackage = {
  id: string;

  /**
   * Tên hiển thị của gói.
   * Mặc định: GÓI 1, GÓI 2...
   */
  label: string;

  /**
   * Đội đã chọn gói này.
   * null = chưa có đội chọn.
   */
  selectedBy: TeamId | null;

  /**
   * Mỗi gói chỉ được sử dụng Ngôi sao hy vọng 1 lần.
   */
  starUsed: boolean;

  /**
   * Mỗi gói có đúng 5 câu.
   */
  questions: FinishQuestion[];
};

export type FinishStatus =
  | "selection"
  | "playing"
  | "finished";

export type FinishResolution =
  | "idle"
  | "awaiting-main-result"
  | "selecting-steal-team"
  | "awaiting-steal-result"
  | "resolved";
