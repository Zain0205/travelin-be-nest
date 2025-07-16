import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: configService.get<string>("EMAIL_USER"),
        pass: configService.get<string>("EMAIL_PASSWORD"),
      },
    });
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verification/${token}`;

    await this.transporter.sendMail({
      from: process.env.EMAIL_USER || '"Be Travelin" <noreply@betravelin.com>',
      to: email,
      subject: 'Verifikasi Email Anda - Be Travelin',
      html: `
        <div>
          <h2>Halo ${name},</h2>
          <p>Terima kasih telah mendaftar di Be Travelin. Silakan verifikasi email Anda dengan mengklik tombol di bawah ini:</p>
          <p>
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Verifikasi Email
            </a>
          </p>
          <p>Atau gunakan link berikut: <a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>Link akan aktif selama 24 jam.</p>
          <p>Jika Anda tidak mendaftar di Be Travelin, silakan abaikan email ini.</p>
          <p>Salam,<br/>Tim Be Travelin</p>
        </div>
      `,
    });
  }
}
