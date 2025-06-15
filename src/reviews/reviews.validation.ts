import { z } from 'zod';

export const CreateReviewSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000, 'Comment must be at most 1000 characters'),
});

export const UpdateReviewSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5').optional(),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000, 'Comment must be at most 1000 characters').optional(),
});

export const ReviewQuerySchema = z.object({
  page: z.string().transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
  limit: z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
  rating: z.string().transform(Number).refine(n => n >= 1 && n <= 5, 'Rating must be between 1 and 5').optional(),
  sortBy: z.enum(['newest', 'oldest', 'rating_high', 'rating_low']).optional(),
});

