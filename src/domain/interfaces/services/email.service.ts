export interface IEmailService {
  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
  sendWelcomeEmail(to: string, name: string): Promise<void>;
  sendVerificationCodeEmail(to: string, code: string, name: string): Promise<void>;
  sendPasswordChangeCodeEmail(to: string, code: string, name: string): Promise<void>;
}
