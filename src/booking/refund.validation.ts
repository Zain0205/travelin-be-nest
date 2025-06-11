import { z } from 'zod';

export const RefundValidation = z.object({
  bookingId: z.number().positive('Booking ID harus berupa angka positif'),
  reason: z.string().optional(),
});

export const ProcessRefundValidation = z.object({
  refundId: z.number().positive('Refund ID harus berupa angka positif'),
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Status harus approved atau rejected' })
  }),
  refundMethod: z.enum(['bank_transfer', 'e_wallet', 'credit_card', 'original_payment']).optional(),
  refundProof: z.string().url('Refund proof harus berupa URL yang valid').optional(),
  adminNote: z.string().optional(),
});

export const CancelBookingValidation = z.object({
  bookingId: z.number().positive('Booking ID harus berupa angka positif'),
  reason: z.string().optional(),
  requestRefund: z.boolean().optional().default(false),
});

export const RefundQueryValidation = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed']).optional(),
  userId: z.number().positive().optional(),
  bookingType: z.enum(['package', 'hotel', 'flight', 'custom']).optional(),
  page: z.number().positive().optional().default(1),
  limit: z.number().positive().max(100).optional().default(10),
  startDate: z.string().datetime().transform((str) => new Date(str)).optional(),
  endDate: z.string().datetime().transform((str) => new Date(str)).optional(),
});
