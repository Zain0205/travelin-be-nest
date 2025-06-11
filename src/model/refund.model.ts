export interface RefundInput {
  bookingId: number;
  reason?: string;
}

export interface ProcessRefundInput {
  refundId: number;
  status: 'approved' | 'rejected';
  refundMethod?: 'bank_transfer' | 'e_wallet' | 'credit_card' | 'original_payment';
  refundProof?: string;
  adminNote?: string;
}

export interface CancelBookingInput {
  bookingId: number;
  reason?: string;
  requestRefund?: boolean;
}

export interface RefundQueryInput {
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  userId?: number;
  bookingType?: 'package' | 'hotel' | 'flight' | 'custom';
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface BookingDetails {
  id: number;
  type: 'package' | 'hotel' | 'flight' | 'custom';
  totalPrice: number;
  travelDate: Date;
  status: string;
  paymentStatus: string;
  items: {
    package?: {
      id: number;
      title: string;
      agentId: number;
    };
    hotels?: Array<{
      id: number;
      name: string;
      checkInDate: Date;
      checkOutDate: Date;
      nights: number;
      totalPrice: number;
      agentId: number;
    }>;
    flights?: Array<{
      id: number;
      airlineName: string;
      origin: string;
      destination: string;
      departureTime: Date;
      arrivalTime: Date;
      totalPrice: number;
      agentId: number;
    }>;
  };
}
