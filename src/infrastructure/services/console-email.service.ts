import { IEmailService } from '@/src/domain/interfaces/services/email.service';

/**
 * Development-only email service that logs to console.
 * Used when RESEND_API_KEY is not configured.
 */
export class ConsoleEmailService implements IEmailService {
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    console.log('═══════════════════════════════════════════');
    console.log('EMAIL DE RECUPERACAO DE PALAVRA-PASSE');
    console.log('═══════════════════════════════════════════');
    console.log(`Para: ${to}`);
    console.log(`Link: ${resetUrl}`);
    console.log('═══════════════════════════════════════════');
  }

  async sendVerificationCodeEmail(to: string, code: string, name: string): Promise<void> {
    console.log('═══════════════════════════════════════════');
    console.log('EMAIL DE CODIGO DE VERIFICACAO');
    console.log('═══════════════════════════════════════════');
    console.log(`Para: ${to}`);
    console.log(`Nome: ${name}`);
    console.log(`Código: ${code}`);
    console.log('═══════════════════════════════════════════');
  }

  async sendPasswordChangeCodeEmail(to: string, code: string, name: string): Promise<void> {
    console.log('═══════════════════════════════════════════');
    console.log('EMAIL DE CODIGO DE ALTERACAO DE PALAVRA-PASSE');
    console.log('═══════════════════════════════════════════');
    console.log(`Para: ${to}`);
    console.log(`Nome: ${name}`);
    console.log(`Código: ${code}`);
    console.log('═══════════════════════════════════════════');
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    console.log('═══════════════════════════════════════════');
    console.log('EMAIL DE BOAS-VINDAS');
    console.log('═══════════════════════════════════════════');
    console.log(`Para: ${to}`);
    console.log(`Nome: ${name}`);
    console.log('═══════════════════════════════════════════');
  }
}
