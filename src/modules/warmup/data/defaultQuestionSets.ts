import type { QuestionSet } from "../types/warmup";

const makeSet = (id: string, name: string, topic: string): QuestionSet => ({
  id,
  name,
  phase: "warmup",
  questions: Array.from({ length: 10 }, (_, index) => ({
    id: `${id}-q-${index + 1}`,
    setId: id,
    order: index + 1,
    question: `(${topic}) Câu hỏi mẫu số ${index + 1}: Hãy thay bằng nội dung câu hỏi chính thức.`,
  })),
});

export const DEFAULT_QUESTION_SETS: QuestionSet[] = [
  makeSet("set-a", "Bộ câu hỏi A", "A"),
  makeSet("set-b", "Bộ câu hỏi B", "B"),
  makeSet("set-c", "Bộ câu hỏi C", "C"),
  makeSet("set-d", "Bộ câu hỏi D", "D"),
];