export type AccelerationQuestion = {
  id: string;
  order: number;
  imageUrl: string;
  answer: string;
};

export type AccelerationConfig = {
  id: string;
  name: string;
  timeLimitSeconds: number;
  points: number;
  questions: AccelerationQuestion[];
};
