import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Snap, CoreApi } from 'midtrans-client';
import * as crypto from 'crypto';

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);
  private snap: Snap;
  private coreApi: CoreApi;

  constructor(private configService: ConfigService) {
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

  async createTransaction(params: {
    orderId: string;
    amount: number;
    customerDetails: {
      firstName: string;
      email: string;
      phone?: string;
    };
    itemDetails: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
    callbackUrl?: string;
  }) {
    const { orderId, amount, customerDetails, itemDetails, callbackUrl } =
      params;

    const transactionDetails = {
      order_id: orderId,
      gross_amount: amount,
    };

    const customer = {
      first_name: customerDetails.firstName,
      email: customerDetails.email,
      phone: customerDetails.phone || '',
    };

    const parameter = {
      transaction_details: transactionDetails,
      customer_details: customer,
      item_details: itemDetails,
      callbacks: callbackUrl ? { finish: callbackUrl } : undefined,
    };

    try {
      const transaction = await this.snap.createTransaction(parameter);
      return {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      };
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
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
      const cancel = await this.coreApi.transaction.cancel(orderId)
      this.logger.log(
        `Successfully cancelled transaction for order ${orderId}`,
        JSON.stringify(cancel)
      )
    } catch (err) {
      this.logger.error(
        `Failed to cancel transaction for order ${orderId}`,
        err,
      );
      throw err;
    }
  }

  async refundTransaction(orderId: string, amount?: number) {
    try {
      const refundData: any = {
        order_id: orderId,
        reason: `Customer request refund`
      }

      if (amount) {
        refundData.amount = amount;
      }

      const refund = await this.coreApi.transaction.refund(refundData)

      this.logger.log(
        `Successfully processed refund for order ${orderId}`,
        JSON.stringify(refund),
      );

      return refund;
    } catch (err) {
      this.logger.error(
        `Failed to refund transaction for order ${orderId}`,
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
}
