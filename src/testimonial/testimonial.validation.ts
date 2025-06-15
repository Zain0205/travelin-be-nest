import { z } from 'zod';

export const CreateTestimonialSchema = z.object({
  content: z.string().min(20, 'Content must be at least 20 characters').max(2000, 'Content must be at most 2000 characters'),
});

export const UpdateTestimonialSchema = z.object({
  content: z.string().min(20, 'Content must be at least 20 characters').max(2000, 'Content must be at most 2000 characters'),
});
