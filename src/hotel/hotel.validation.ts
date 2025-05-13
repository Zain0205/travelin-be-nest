import { z, ZodType } from 'zod';

export class HotelValidation {
  static readonly CREATE: ZodType = z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
  });

  static readonly UPDATE: ZodType = z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
  });
}
