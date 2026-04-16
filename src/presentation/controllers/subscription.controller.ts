import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/auth/auth.service';
import { UpgradeToPremiumUseCase } from '@/src/domain/use-cases/subscription/upgrade-to-premium.use-case';
import { GetSubscriptionStatusUseCase } from '@/src/domain/use-cases/subscription/get-subscription-status.use-case';
import { GetSubscriptionUsageUseCase } from '@/src/domain/use-cases/subscription/get-subscription-usage.use-case';
import { ConfirmPaymentUseCase } from '@/src/domain/use-cases/payment/confirm-payment.use-case';
import { ExpireSubscriptionsUseCase } from '@/src/domain/use-cases/subscription/expire-subscriptions.use-case';
import { GetPaymentStatusByReferenceUseCase } from '@/src/domain/use-cases/payment/get-payment-status-by-reference.use-case';
import { ConfirmPaymentByCodeUseCase } from '@/src/domain/use-cases/payment/confirm-payment-by-code.use-case';
import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';
import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';
import { IAuditLogRepository } from '@/src/domain/interfaces/repositories/audit-log.repository';
import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IEmailService } from '@/src/domain/interfaces/services/email.service';
import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';
import { UserRole } from '@/src/domain/entities/user.entity';
import { SubscriptionStatus, SubscriptionPlan, FREE_SUBSCRIPTION_END } from '@/src/domain/entities/subscription.entity';
import { PaymentStatus } from '@/src/domain/entities/payment.entity';
import { ForbiddenError, EntityNotFoundError } from '@/src/domain/errors/domain.error';
import { successResponse, handleApiError } from '@/src/shared/lib/api-response';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { extractRequestMetadata } from '@/src/shared/lib/request-metadata';

export class SubscriptionController {
  constructor(
    private readonly authService: AuthService,
    private readonly upgradeToPremiumUseCase: UpgradeToPremiumUseCase,
    private readonly getStatusUseCase: GetSubscriptionStatusUseCase,
    private readonly getUsageUseCase: GetSubscriptionUsageUseCase,
    private readonly confirmPaymentUseCase: ConfirmPaymentUseCase,
    private readonly expireSubscriptionsUseCase: ExpireSubscriptionsUseCase,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly logger: ILogger,
    private readonly userRepository?: IUserRepository,
    private readonly emailService?: IEmailService,
    private readonly auditLogRepository?: IAuditLogRepository,
    private readonly getPaymentStatusByReferenceUseCase?: GetPaymentStatusByReferenceUseCase,
    private readonly confirmPaymentByCodeUseCase?: ConfirmPaymentByCodeUseCase,
    private readonly planConfigRepository?: ISubscriptionPlanConfigRepository,
  ) {}

  async getStatus(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      const status = await this.getStatusUseCase.execute(user.id);
      return successResponse(status);
    } catch (error) {
      this.logger.error('Failed to get subscription status', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  async getUsage(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      const usage = await this.getUsageUseCase.execute(user.id);
      return successResponse(usage);
    } catch (error) {
      this.logger.error('Failed to get subscription usage', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  async upgrade(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      const result = await this.upgradeToPremiumUseCase.execute(user.id);
      this.logger.info('PREMIUM upgrade initiated', {
        event: 'payment.created',
        requestId,
        userId: user.id,
        paymentRef: result.payment.reference,
        amount: result.payment.amount,
      });
      return successResponse(result, 201);
    } catch (error) {
      this.logger.error('Failed to initiate PREMIUM upgrade', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  // ─── Admin endpoints ───────────────────────────────────────

  async listPayments(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Apenas administradores podem listar pagamentos');
      }

      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page') ?? '1');
      const limit = Number(url.searchParams.get('limit') ?? '20');

      const result = await this.paymentRepository.findAll({ page, limit });
      return successResponse(result);
    } catch (error) {
      this.logger.error('Failed to list payments', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  async confirmPayment(request: NextRequest, paymentId: string) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Apenas administradores podem confirmar pagamentos');
      }

      const result = await this.confirmPaymentUseCase.execute(paymentId, user.id);
      this.logger.info('Payment confirmed by admin', {
        event: 'payment.confirmed',
        requestId,
        paymentId,
        adminId: user.id,
      });
      return successResponse(result);
    } catch (error) {
      this.logger.error('Failed to confirm payment', error as Error, { requestId, paymentId });
      return handleApiError(error);
    }
  }

  async listSubscriptions(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Apenas administradores podem listar subscrições');
      }

      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page') ?? '1');
      const limit = Number(url.searchParams.get('limit') ?? '20');

      const result = await this.subscriptionRepository.findAll({ page, limit });
      return successResponse(result);
    } catch (error) {
      this.logger.error('Failed to list subscriptions', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  // ─── User: own payment history ──────────────────────────────────

  async getMyPayments(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      const payments = await this.paymentRepository.findByUserId(user.id);
      // Strip confirmationCode — must never be exposed via API
      const safe = payments.map(({ confirmationCode: _, ...p }) => p);
      return successResponse(safe);
    } catch (error) {
      this.logger.error('Failed to get user payments', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  // ─── Admin: manage subscription status ─────────────────────────

  async manageSubscription(request: NextRequest, subscriptionId: string) {
    const requestId = crypto.randomUUID();
    const metadata = extractRequestMetadata(request);
    try {
      const user = await this.authService.getUserFromRequest(request);
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Apenas administradores podem gerir subscrições');
      }

      const body = await request.json() as { action?: string };
      const { action } = body;

      const sub = await this.subscriptionRepository.findById(subscriptionId);
      if (!sub) throw new EntityNotFoundError('Subscription', subscriptionId);

      const stateBefore = { id: sub.id, status: sub.status, plan: sub.plan };

      let updated;
      if (action === 'activate') {
        const now = new Date();
        const endDate = new Date(now);
        const premiumConfig = await this.planConfigRepository?.findBySlug('PREMIUM');
        endDate.setDate(endDate.getDate() + (premiumConfig?.durationDays ?? 30));
        updated = await this.subscriptionRepository.update(subscriptionId, {
          status: SubscriptionStatus.ACTIVE,
          plan: SubscriptionPlan.PREMIUM,
          startDate: now,
          endDate,
        });
        this.logger.info('Subscription activated by admin', {
          event: 'subscription.activated',
          requestId,
          subscriptionId,
          adminId: user.id,
        });
      } else if (action === 'expire') {
        updated = await this.subscriptionRepository.update(subscriptionId, {
          status: SubscriptionStatus.EXPIRED,
        });
        this.logger.info('Subscription expired by admin', {
          event: 'subscription.expired',
          requestId,
          subscriptionId,
          adminId: user.id,
        });
      } else if (action === 'cancel') {
        updated = await this.subscriptionRepository.update(subscriptionId, {
          status: SubscriptionStatus.CANCELLED,
        });
        this.logger.info('Subscription cancelled by admin', {
          event: 'subscription.cancelled',
          requestId,
          subscriptionId,
          adminId: user.id,
        });
        // Provision a FREE subscription immediately so the user is not left without access.
        // Only create if there is no other active/pending subscription already.
        const existing = await this.subscriptionRepository.findActiveByUserId(sub.userId);
        if (!existing) {
          const now = new Date();
          await this.subscriptionRepository.create({
            userId: sub.userId,
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.ACTIVE,
            startDate: now,
            endDate: FREE_SUBSCRIPTION_END,
          });
        }
      } else {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Acção inválida. Use: activate, expire, cancel' } },
          { status: 400 },
        );
      }

      // Audit trail (fire-and-forget)
      if (this.auditLogRepository && updated) {
        this.auditLogRepository
          .create({
            adminId: user.id,
            action: action.toUpperCase(),
            entityType: 'SUBSCRIPTION',
            entityId: subscriptionId,
            before: stateBefore,
            after: { id: updated.id, status: updated.status, plan: updated.plan },
            metadata,
          })
          .catch(() => { /* never block primary response */ });
      }

      return successResponse(updated);
    } catch (error) {
      this.logger.error('Failed to manage subscription', error as Error, { requestId, subscriptionId });
      return handleApiError(error);
    }
  }

  // ─── Admin: expire a payment ────────────────────────────────────

  async expirePayment(request: NextRequest, paymentId: string) {
    const requestId = crypto.randomUUID();
    const metadata = extractRequestMetadata(request);
    try {
      const user = await this.authService.getUserFromRequest(request);
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Apenas administradores podem expirar pagamentos');
      }

      const payment = await this.paymentRepository.findById(paymentId);
      if (!payment) throw new EntityNotFoundError('Payment', paymentId);

      const updated = await this.paymentRepository.update(paymentId, {
        status: PaymentStatus.EXPIRED,
      });

      this.logger.info('Payment expired by admin', {
        event: 'payment.expired',
        requestId,
        paymentId,
        adminId: user.id,
      });

      // Audit trail
      if (this.auditLogRepository) {
        this.auditLogRepository
          .create({
            adminId: user.id,
            action: 'EXPIRE_PAYMENT',
            entityType: 'PAYMENT',
            entityId: paymentId,
            before: { id: payment.id, status: payment.status },
            after: { id: updated.id, status: updated.status },
            metadata,
          })
          .catch(() => { /* non-blocking */ });
      }

      return successResponse(updated);
    } catch (error) {
      this.logger.error('Failed to expire payment', error as Error, { requestId, paymentId });
      return handleApiError(error);
    }
  }

  // ─── Admin: resend payment reference email ──────────────────────

  async resendPaymentReference(request: NextRequest, paymentId: string) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Apenas administradores podem reenviar referências');
      }

      const payment = await this.paymentRepository.findById(paymentId);
      if (!payment) throw new EntityNotFoundError('Payment', paymentId);

      if (payment.status !== PaymentStatus.PENDING) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Só é possível reenviar referências de pagamentos pendentes' } },
          { status: 400 },
        );
      }

      if (this.userRepository && this.emailService) {
        const teacher = await this.userRepository.findById(payment.userId);
        if (teacher) {
          await this.emailService.sendPaymentReferenceEmail(teacher.email, teacher.name, {
            reference: payment.reference,
            amount: payment.amount,
            expiresAt: payment.expiresAt,
            confirmationCode: payment.confirmationCode,
          });
        }
      }

      this.logger.info('Payment reference re-sent by admin', {
        event: 'payment.reference_resent',
        requestId,
        paymentId,
        adminId: user.id,
      });
      return successResponse({ sent: true });
    } catch (error) {
      this.logger.error('Failed to resend payment reference', error as Error, { requestId, paymentId });
      return handleApiError(error);
    }
  }

  // ─── User: confirm payment with code ───────────────────────────────

  async confirmPaymentByCode(request: NextRequest) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);

      if (!this.confirmPaymentByCodeUseCase) {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Not configured' } },
          { status: 500 },
        );
      }

      const body = await request.json() as { reference?: string; code?: string };
      const reference = body.reference?.trim();
      const code = body.code?.trim();

      if (!reference || !code) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Referência e código são obrigatórios' } },
          { status: 400 },
        );
      }

      const result = await this.confirmPaymentByCodeUseCase.execute(reference, code, user.id);

      this.logger.info('Payment confirmed by code', {
        event: 'payment.confirmed_by_code',
        requestId,
        reference,
        userId: user.id,
      });

      return successResponse(result);
    } catch (error) {
      this.logger.error('Failed to confirm payment by code', error as Error, { requestId });
      return handleApiError(error);
    }
  }

  // ─── User: payment status by reference (polling) ─────────────────

  async getPaymentStatus(request: NextRequest, reference: string) {
    const requestId = crypto.randomUUID();
    try {
      const user = await this.authService.getUserFromRequest(request);

      if (!this.getPaymentStatusByReferenceUseCase) {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Not configured' } },
          { status: 500 },
        );
      }

      // userId is passed for ownership validation inside the use case
      const result = await this.getPaymentStatusByReferenceUseCase.execute(reference, user.id);
      return successResponse(result);
    } catch (error) {
      this.logger.error('Failed to get payment status', error as Error, { requestId, reference });
      return handleApiError(error);
    }
  }

  async runExpireCron(request: NextRequest) {
    // Auth check outside try/catch — invalid secret must always return 401, never 500
    const cronSecret = request.headers.get('x-cron-secret');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } },
        { status: 401 },
      );
    }

    const requestId = crypto.randomUUID();
    try {
      const result = await this.expireSubscriptionsUseCase.execute();
      this.logger.info('Cron expire-subscriptions completed', {
        event: 'cron.expire_subscriptions.completed',
        requestId,
        ...result,
      });
      return successResponse(result);
    } catch (error) {
      this.logger.error('Cron expire-subscriptions failed', error as Error, { requestId });
      return handleApiError(error);
    }
  }
}
