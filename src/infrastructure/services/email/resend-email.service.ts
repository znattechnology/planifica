import { Resend } from 'resend';
import { IEmailService, PaymentEmailData } from '@/src/domain/interfaces/services/email.service';
import {
  passwordResetTemplate,
  welcomeTemplate,
  verificationCodeTemplate,
  passwordChangeCodeTemplate,
  paymentReferenceTemplate,
} from './templates';
import { env } from '@/src/config/env.config';

export class ResendEmailService implements IEmailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY não configurada');
    }
    this.resend = new Resend(env.RESEND_API_KEY);
    this.from = env.RESEND_FROM_EMAIL;
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const { subject, html } = passwordResetTemplate(resetUrl);

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error (password reset):', error);
      throw new Error('Falha ao enviar email de recuperação');
    }
  }

  async sendVerificationCodeEmail(to: string, code: string, name: string): Promise<void> {
    const { subject, html } = verificationCodeTemplate(code, name);

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error (verification code):', error);
      throw new Error('Falha ao enviar código de verificação');
    }
  }

  async sendPasswordChangeCodeEmail(to: string, code: string, name: string): Promise<void> {
    const { subject, html } = passwordChangeCodeTemplate(code, name);

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error (password change code):', error);
      throw new Error('Falha ao enviar código de confirmação');
    }
  }

  async sendPaymentReferenceEmail(to: string, name: string, data: PaymentEmailData): Promise<void> {
    const { subject, html } = paymentReferenceTemplate(name, data.reference, data.amount, data.expiresAt, data.confirmationCode);

    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });

    if (error) {
      console.error('Resend error (payment reference):', error);
      throw new Error('Falha ao enviar referência de pagamento');
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const { subject, html: rawHtml } = welcomeTemplate(name);
    const html = rawHtml.replace('{dashboardUrl}', `${env.NEXTAUTH_URL}/dashboard`);

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error (welcome):', error);
      // Non-critical — don't throw, just log
    }
  }
}
