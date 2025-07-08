import { BookingStatus, BookingType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { Payment } from 'prisma/generated';

interface BookingBase {
  userId: number;
  travelDate: Date;
  type: BookingType;
}

export interface PackageBooking extends BookingBase {
  packageId: number;
  type: typeof BookingType.package;
}

export interface HotelBookingItem {
  hotelId: number;
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
}

export interface HotelBooking extends BookingBase {
  type: typeof BookingType.hotel;
  hotels: HotelBookingItem[];
}

export interface FlightBookingItem {
  flightId: number;
  passengerName: string;
  seatClass: string;
}

export interface FlightBooking extends BookingBase {
  type: typeof BookingType.flight;
  flights: FlightBookingItem[];
}

export interface CustomBooking extends BookingBase {
  type: typeof BookingType.custom;
  hotels?: HotelBookingItem[];
  flights?: FlightBookingItem[];
}

export type BookingInput =
  | PackageBooking
  | HotelBooking
  | FlightBooking
  | CustomBooking;

export interface PaymentInput {
  bookingId: number;
  method: PaymentMethod;
  amount: number;
  proofUrl?: string;
}

export interface GetBookingsQuery {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  type?: BookingType;
  startDate?: Date;
  endDate?: Date;
  page?: number;   
  limit?: number;  
}

export interface RescheduleInput {
  bookingId: number;
  requestedDate: Date;
}
