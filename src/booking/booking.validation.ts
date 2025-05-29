import { z } from 'zod';
import { BookingType, PaymentMethod, BookingStatus, PaymentStatus } from '@prisma/client';

export const CreateBookingValidation = z.object({
  packageId: z.number().optional(),
  travelDate: z.string().datetime(),
  type: z.nativeEnum(BookingType),
  hotelBookings: z.array(z.object({
    hotelId: z.number(),
    checkInDate: z.string().datetime(),
    checkOutDate: z.string().datetime(),
    nights: z.number().min(1)
  })).optional(),
  flightBookings: z.array(z.object({
    flightId: z.number(),
    passengerName: z.string().min(1),
    seatClass: z.string().min(1)
  })).optional()
}).refine(data => {
  if (data.type === BookingType.package && !data.packageId) {
    return false;
  }
  if (data.type === BookingType.hotel && (!data.hotelBookings || data.hotelBookings.length === 0)) {
    return false;
  }
  if (data.type === BookingType.flight && (!data.flightBookings || data.flightBookings.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Invalid booking data for the specified type"
});

export const CreatePaymentValidation = z.object({
  bookingId: z.number(),
  method: z.nativeEnum(PaymentMethod)
});

export const BookingQueryValidation = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => parseInt(val) || 10).optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  type: z.nativeEnum(BookingType).optional(),
  userId: z.string().transform(val => parseInt(val)).optional(),
  agentId: z.string().transform(val => parseInt(val)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const UpdateBookingStatusValidation = z.object({
  status: z.nativeEnum(BookingStatus)
});

export const MidtransCallbackValidation = z.object({
  order_id: z.string(),
  status_code: z.string(),
  gross_amount: z.string(),
  signature_key: z.string(),
  transaction_status: z.string(),
  transaction_id: z.string(),
  payment_type: z.string(),
  transaction_time: z.string(),
  fraud_status: z.string().optional()
});