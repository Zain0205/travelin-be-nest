import { z } from 'zod';

// Fixed RefundQueryValidation schema
export const RefundQueryValidation = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed']).optional(),
  userId: z.number().optional(),
  bookingType: z.enum(['package', 'hotel', 'flight', 'custom']).optional(),
  page: z.number().default(1),
  limit: z.number().default(10),
  startDate: z.string().datetime().transform(val => new Date(val)).optional(),
  endDate: z.string().datetime().transform(val => new Date(val)).optional(),
});

// Other validation schemas remain the same
export const CancelBookingValidation = z.object({
  bookingId: z.number(),
  reason: z.string().min(1, 'Cancellation reason is required'),
});

export const RefundValidation = z.object({
  bookingId: z.number(),
  reason: z.string().min(1, 'Refund reason is required'),
  amount: z.number().optional(), // Optional if auto-calculated
});

export const ProcessRefundValidation = z.object({
  refundId: z.number(),
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().optional(),
});