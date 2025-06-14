import { z } from 'zod';

export const MonthlyReportQuerySchema = z.object({
  year: z.string().transform(val => parseInt(val)).refine(val => val >= 2020 && val <= 2030, {
    message: 'Year must be between 2020 and 2030'
  }),
  month: z.string().transform(val => parseInt(val)).refine(val => val >= 1 && val <= 12, {
    message: 'Month must be between 1 and 12'
  }).optional(),
});

export const DateRangeQuerySchema = z.object({
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().transform(val => new Date(val)),
});

export type MonthlyReportQuery = z.infer<typeof MonthlyReportQuerySchema>;
export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;
