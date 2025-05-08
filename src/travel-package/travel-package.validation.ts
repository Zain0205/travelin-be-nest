import {z, ZodType} from "zod";

export class TravelPackageValidation {
  static readonly CREATE: ZodType = z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    price: z.number().positive(),
    duration: z.number().positive(),
    destination: z.string().min(1).max(100),
    startDate: z.date(),
    endDate: z.date(),
  })
}