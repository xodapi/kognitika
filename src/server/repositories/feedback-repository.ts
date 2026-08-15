export type CreateFeedbackInput = {
  userId: string;
  type: string;
  content: string;
  trackingNum: string;
};

export type CreatedFeedback = {
  trackingNum: string;
};

export interface FeedbackRepository {
  create(input: CreateFeedbackInput): Promise<CreatedFeedback>;
}
