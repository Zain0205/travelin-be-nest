import { z, ZodType } from "zod";

export class UserValidation {
  static readonly REGISTER: ZodType = z.object({
    password: z.string().min(8).max(100),
    email: z.string().email(),
    name: z.string().min(1).max(100),
    role: z.enum(['customer', 'admin', 'agent']).optional(),
  }) 
}