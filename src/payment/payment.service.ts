import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Snap, CoreApi } from 'midtrans-client';
import { PrismaService } from 'src/common/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private snap: Snap;
  private coreApi: CoreApi;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    this.snap = new Snap({
      isProduction: isProduction,
      serverKey: this.configService.get<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });

    this.coreApi = new CoreApi({
      isProduction: isProduction,
      serverKey: this.configService.get<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });
  }

  async createTransaction(
    bookingId: number,
    amount: number,
    customerDetails: any,
    items: any[],
  ) {
    const orderId = `BOOKING-${bookingId}-${Date.now()}-${customerDetails.id}`;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: items,
      customer_details: customerDetails,
      callbacks: {
        finish: `${this.configService.get<string>('APP_URL')}/payment/finish?order_id=${orderId}`,
        error: `${this.configService.get<string>('APP_URL')}/payment/error?order_id=${orderId}`,
        unfinish: `${this.configService.get<string>('APP_URL')}/payment/unfinish?order_id=${orderId}`,
        pending: `${this.configService.get<string>('APP_URL')}/payment/pending?order_id=${orderId}`,
      },
    };

    try {
      const transaction = await this.snap.createTransaction(parameter);
      this.logger.log(
        `Transaction created for booking ${bookingId}: ${orderId}`,
      );

      return {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
        orderId: orderId,
      };
    } catch (err) {
      this.logger.error(
        `Failed to create transaction for booking ${bookingId}`,
        err,
      );
      throw err;
    }
  }

  async getTransactionStatus(orderId: string) {
    try {
      const status = await this.coreApi.transaction.status(orderId);
      return status;
    } catch (err) {
      this.logger.error(
        `Failed to get transaction status for order ${orderId}`,
        err,
      );
      throw err;
    }
  }

  async cancelTransaction(orderId: string) {
    try {
      const status = await this.coreApi.transaction.cancel(orderId);
      return status;
    } catch (err) {
      this.logger.error(
        `Failed to cancel transaction for order ${orderId}`,
        err,
      );
      throw err;
    }
  }

  verifySignature(data: any): boolean {
    const { order_id, status_code, gross_amount, signature_key } = data;
    const serverKey = this.configService.get('MIDTRANS_SERVER_KEY');

    const hash = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex');

    return hash === signature_key;
  }

  mapTransactionStatus(midtransStatus: string): 'paid' | 'unpaid' | 'failed' {
    switch (midtransStatus) {
      case 'capture':
      case 'settlement':
        return 'paid';
      case 'pending':
        return 'unpaid';
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
        return 'failed';
      default:
        return 'unpaid';
    }
  }

  mapBookingStatus(
    midtransStatus: string,
  ): 'confirmed' | 'pending' | 'rejected' {
    switch (midtransStatus) {
      case 'capture':
      case 'settlement':
        return 'confirmed';
      case 'pending':
        return 'pending';
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
        return 'rejected';
      default:
        return 'pending';
    }
  }
}
