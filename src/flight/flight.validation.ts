import { z, ZodType } from 'zod';

export class FlightValidation {
  static readonly CREATE: ZodType = z.object({
    airlineName: z.string().min(1, 'Airline name is required'),
    origin: z.string().min(1, 'Origin is required'),
    destination: z.string().min(1, 'Destination is required'),
    departureTime: z.string().min(1, 'Departure time is required'),
    arrivalTime: z.string().min(1, 'Arrival time is required'),
    price: z.union([
      z.number().positive('Price must be positive'),
      z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
    ]),
    thumbnail: z.string().optional(), // Akan diset dari file upload
  });

  static readonly UPDATE: ZodType = z.object({
    airlineName: z.string().min(1).optional(),
    origin: z.string().min(1).optional(),
    destination: z.string().min(1).optional(),
    departureTime: z.string().min(1).optional(),
    arrivalTime: z.string().min(1).optional(),
    price: z.union([
      z.number().positive(),
      z.string().regex(/^\d+(\.\d{1,2})?$/)
    ]).optional(),
    thumbnail: z.string().optional(),
  });
}