import { PrismaPlanRepository } from '@/src/infrastructure/database/repositories/prisma-plan.repository';
import { PrismaSubscriptionRepository } from '@/src/infrastructure/database/repositories/prisma-subscription.repository';
import { PrismaPaymentRepository } from '@/src/infrastructure/database/repositories/prisma-payment.repository';
import { PrismaTeachingActivityRepository } from '@/src/infrastructure/database/repositories/prisma-teaching-activity.repository';
import { PrismaReportRepository } from '@/src/infrastructure/database/repositories/prisma-report.repository';
import { PrismaUserRepository } from '@/src/infrastructure/database/repositories/prisma-user.repository';
import { PrismaPasswordResetTokenRepository } from '@/src/infrastructure/database/repositories/prisma-password-reset-token.repository';
import { PrismaEmailVerificationTokenRepository } from '@/src/infrastructure/database/repositories/prisma-email-verification-token.repository';
import { PrismaPasswordChangeTokenRepository } from '@/src/infrastructure/database/repositories/prisma-password-change-token.repository';
import { PrismaTeacherProfileRepository } from '@/src/infrastructure/database/repositories/prisma-teacher-profile.repository';
import { PrismaDosificacaoRepository } from '@/src/infrastructure/database/repositories/prisma-dosificacao.repository';
import { PrismaLessonRepository } from '@/src/infrastructure/database/repositories/prisma-lesson.repository';
import { AIClient } from '@/src/ai/services/ai-client';
import { AIPlanGeneratorService } from '@/src/ai/services/plan-generator.service';
import { AIReportGeneratorService } from '@/src/ai/services/report-generator.service';
import { createCacheService } from '@/src/cache/cache.service';
import { createLogger } from '@/src/shared/logger/logger';
import { AuthService } from '@/src/auth/auth.service';
import { BcryptHashService } from '@/src/infrastructure/services/bcrypt-hash.service';
import { JoseJwtService } from '@/src/infrastructure/services/jose-jwt.service';
import { ConsoleEmailService } from '@/src/infrastructure/services/console-email.service';
import { ResendEmailService } from '@/src/infrastructure/services/email/resend-email.service';
import { LoginUseCase } from '@/src/domain/use-cases/auth/login.use-case';
import { RegisterUseCase } from '@/src/domain/use-cases/auth/register.use-case';
import { RefreshTokenUseCase } from '@/src/domain/use-cases/auth/refresh-token.use-case';
import { ForgotPasswordUseCase } from '@/src/domain/use-cases/auth/forgot-password.use-case';
import { ResetPasswordUseCase } from '@/src/domain/use-cases/auth/reset-password.use-case';
import { UpdateProfileUseCase } from '@/src/domain/use-cases/auth/update-profile.use-case';
import { VerifyEmailUseCase } from '@/src/domain/use-cases/auth/verify-email.use-case';
import { ResendVerificationCodeUseCase } from '@/src/domain/use-cases/auth/resend-verification-code.use-case';
import { RequestPasswordChangeUseCase } from '@/src/domain/use-cases/auth/request-password-change.use-case';
import { ConfirmPasswordChangeUseCase } from '@/src/domain/use-cases/auth/confirm-password-change.use-case';
import { CompleteOnboardingUseCase } from '@/src/domain/use-cases/auth/complete-onboarding.use-case';
import { CreateSchoolCalendarUseCase } from '@/src/domain/use-cases/calendar/create-school-calendar.use-case';
import { GetSchoolCalendarUseCase } from '@/src/domain/use-cases/calendar/get-school-calendar.use-case';
import { ManageCalendarEventsUseCase } from '@/src/domain/use-cases/calendar/manage-calendar-events.use-case';
import { GeneratePlanUseCase } from '@/src/domain/use-cases/plan/generate-plan.use-case';
import { GetPlansUseCase } from '@/src/domain/use-cases/plan/get-plans.use-case';
import { UpdatePlanUseCase } from '@/src/domain/use-cases/plan/update-plan.use-case';
import { AggregateActivitiesUseCase } from '@/src/domain/use-cases/report/aggregate-activities.use-case';
import { GenerateTrimesterReportUseCase } from '@/src/domain/use-cases/report/generate-trimester-report.use-case';
import { GenerateAnnualReportUseCase } from '@/src/domain/use-cases/report/generate-annual-report.use-case';
import { PlanService } from '@/src/application/services/plan.service';
import { ReportService } from '@/src/application/services/report.service';
import { PlanController } from '@/src/presentation/controllers/plan.controller';
import { DosificacaoController } from '@/src/presentation/controllers/dosificacao.controller';
import { ReportController } from '@/src/presentation/controllers/report.controller';
import { AuthController } from '@/src/presentation/controllers/auth.controller';
import { SubscriptionController } from '@/src/presentation/controllers/subscription.controller';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';
import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';
import { IDosificacaoRepository } from '@/src/domain/interfaces/repositories/dosificacao.repository';
import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';
import { ITeachingActivityRepository } from '@/src/domain/interfaces/repositories/teaching-activity.repository';
import { IReportRepository } from '@/src/domain/interfaces/repositories/report.repository';
import { IPasswordResetTokenRepository } from '@/src/domain/interfaces/repositories/password-reset-token.repository';
import { IEmailVerificationTokenRepository } from '@/src/domain/interfaces/repositories/email-verification-token.repository';
import { IPasswordChangeTokenRepository } from '@/src/domain/interfaces/repositories/password-change-token.repository';
import { ITeacherProfileRepository } from '@/src/domain/interfaces/repositories/teacher-profile.repository';
import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { PrismaSchoolCalendarRepository } from '@/src/infrastructure/database/repositories/prisma-school-calendar.repository';
import { PrismaCalendarEventTypeConfigRepository } from '@/src/infrastructure/database/repositories/prisma-calendar-event-type-config.repository';
import { ICalendarEventTypeConfigRepository } from '@/src/domain/interfaces/repositories/calendar-event-type-config.repository';
import { PrismaSubscriptionPlanConfigRepository } from '@/src/infrastructure/database/repositories/prisma-subscription-plan-config.repository';
import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';
import { ListSubscriptionPlanConfigsUseCase } from '@/src/domain/use-cases/subscription/list-subscription-plan-configs.use-case';
import { CreateSubscriptionPlanConfigUseCase } from '@/src/domain/use-cases/subscription/create-subscription-plan-config.use-case';
import { UpdateSubscriptionPlanConfigUseCase } from '@/src/domain/use-cases/subscription/update-subscription-plan-config.use-case';
import { SubscriptionPlanConfigController } from '@/src/presentation/controllers/subscription-plan-config.controller';
import { CreateFreeSubscriptionUseCase } from '@/src/domain/use-cases/subscription/create-free-subscription.use-case';
import { UpgradeToPremiumUseCase } from '@/src/domain/use-cases/subscription/upgrade-to-premium.use-case';
import { GetSubscriptionStatusUseCase } from '@/src/domain/use-cases/subscription/get-subscription-status.use-case';
import { GetSubscriptionUsageUseCase } from '@/src/domain/use-cases/subscription/get-subscription-usage.use-case';
import { ExpireSubscriptionsUseCase } from '@/src/domain/use-cases/subscription/expire-subscriptions.use-case';
import { ConfirmPaymentUseCase } from '@/src/domain/use-cases/payment/confirm-payment.use-case';
import { GetPaymentStatusByReferenceUseCase } from '@/src/domain/use-cases/payment/get-payment-status-by-reference.use-case';
import { ConfirmPaymentByCodeUseCase } from '@/src/domain/use-cases/payment/confirm-payment-by-code.use-case';
import { FakePaymentProvider } from '@/src/infrastructure/services/fake-payment-provider';
import { IPaymentProvider } from '@/src/domain/interfaces/services/payment-provider';
import { SubscriptionAccessMiddleware } from '@/src/presentation/middleware/subscription-access.middleware';
import { IAuditLogRepository } from '@/src/domain/interfaces/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '@/src/infrastructure/database/repositories/prisma-audit-log.repository';
import { CalendarResolutionService } from '@/src/domain/services/calendar-resolution.service';
import { CalendarImpactService } from '@/src/domain/services/calendar-impact.service';
import { CalendarInsightsService } from '@/src/domain/services/calendar-insights.service';
import { SmartNotificationService } from '@/src/domain/services/smart-notification.service';
import { ICacheService } from '@/src/domain/interfaces/services/cache.service';
import { IEmailService } from '@/src/domain/interfaces/services/email.service';
import { IHashService } from '@/src/domain/interfaces/services/hash.service';
import { IJwtService } from '@/src/domain/interfaces/services/jwt.service';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { IAIPlanGeneratorService } from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { IAIReportGeneratorService } from '@/src/domain/interfaces/services/report-generator.service';
import { env } from '@/src/config/env.config';

/**
 * Composition Root - Central dependency injection container.
 *
 * All dependencies are wired here. No other file should instantiate
 * infrastructure classes directly. This is the ONLY place where
 * concrete implementations meet interfaces.
 */
class Container {
  // --- Infrastructure ---
  private _planRepository: IPlanRepository | null = null;
  private _dosificacaoRepository: IDosificacaoRepository | null = null;
  private _userRepository: IUserRepository | null = null;
  private _lessonRepository: ILessonRepository | null = null;
  private _teachingActivityRepository: ITeachingActivityRepository | null = null;
  private _reportRepository: IReportRepository | null = null;
  private _cache: ICacheService | null = null;
  private _passwordResetTokenRepository: IPasswordResetTokenRepository | null = null;
  private _emailVerificationTokenRepository: IEmailVerificationTokenRepository | null = null;
  private _passwordChangeTokenRepository: IPasswordChangeTokenRepository | null = null;
  private _teacherProfileRepository: ITeacherProfileRepository | null = null;
  private _completeOnboardingUseCase: CompleteOnboardingUseCase | null = null;
  private _schoolCalendarRepository: ISchoolCalendarRepository | null = null;
  private _calendarEventTypeConfigRepository: ICalendarEventTypeConfigRepository | null = null;
  private _calendarResolutionService: CalendarResolutionService | null = null;
  private _calendarImpactService: CalendarImpactService | null = null;
  private _calendarInsightsService: CalendarInsightsService | null = null;
  private _smartNotificationService: SmartNotificationService | null = null;
  private _createSchoolCalendarUseCase: CreateSchoolCalendarUseCase | null = null;
  private _getSchoolCalendarUseCase: GetSchoolCalendarUseCase | null = null;
  private _manageCalendarEventsUseCase: ManageCalendarEventsUseCase | null = null;
  private _hashService: IHashService | null = null;
  private _jwtService: IJwtService | null = null;
  private _emailService: IEmailService | null = null;
  private _aiClient: AIClient | null = null;
  private _aiPlanGenerator: IAIPlanGeneratorService | null = null;
  private _aiReportGenerator: IAIReportGeneratorService | null = null;

  // --- Services ---
  private _authService: AuthService | null = null;
  private _planService: PlanService | null = null;
  private _reportService: ReportService | null = null;

  private _subscriptionRepository: ISubscriptionRepository | null = null;
  private _paymentRepository: IPaymentRepository | null = null;
  private _paymentProvider: IPaymentProvider | null = null;
  private _createFreeSubscriptionUseCase: CreateFreeSubscriptionUseCase | null = null;
  private _upgradeToPremiumUseCase: UpgradeToPremiumUseCase | null = null;
  private _getSubscriptionStatusUseCase: GetSubscriptionStatusUseCase | null = null;
  private _getSubscriptionUsageUseCase: GetSubscriptionUsageUseCase | null = null;
  private _expireSubscriptionsUseCase: ExpireSubscriptionsUseCase | null = null;
  private _confirmPaymentUseCase: ConfirmPaymentUseCase | null = null;
  private _getPaymentStatusByReferenceUseCase: GetPaymentStatusByReferenceUseCase | null = null;
  private _confirmPaymentByCodeUseCase: ConfirmPaymentByCodeUseCase | null = null;
  private _subscriptionAccessMiddleware: SubscriptionAccessMiddleware | null = null;
  private _auditLogRepository: IAuditLogRepository | null = null;

  private _subscriptionPlanConfigRepository: ISubscriptionPlanConfigRepository | null = null;
  private _listSubscriptionPlanConfigsUseCase: ListSubscriptionPlanConfigsUseCase | null = null;
  private _createSubscriptionPlanConfigUseCase: CreateSubscriptionPlanConfigUseCase | null = null;
  private _updateSubscriptionPlanConfigUseCase: UpdateSubscriptionPlanConfigUseCase | null = null;

  // --- Controllers ---
  private _planController: PlanController | null = null;
  private _dosificacaoController: DosificacaoController | null = null;
  private _reportController: ReportController | null = null;
  private _authController: AuthController | null = null;
  private _subscriptionController: SubscriptionController | null = null;
  private _subscriptionPlanConfigController: SubscriptionPlanConfigController | null = null;

  // --- Loggers ---
  private loggers = new Map<string, ILogger>();

  getLogger(service: string): ILogger {
    if (!this.loggers.has(service)) {
      this.loggers.set(service, createLogger(service));
    }
    return this.loggers.get(service)!;
  }

  // ==========================================
  //  INFRASTRUCTURE
  // ==========================================

  get cache(): ICacheService {
    if (!this._cache) {
      this._cache = createCacheService();
    }
    return this._cache;
  }

  get planRepository(): IPlanRepository {
    if (!this._planRepository) {
      this._planRepository = new PrismaPlanRepository();
    }
    return this._planRepository;
  }

  get dosificacaoRepository(): IDosificacaoRepository {
    if (!this._dosificacaoRepository) {
      this._dosificacaoRepository = new PrismaDosificacaoRepository();
    }
    return this._dosificacaoRepository;
  }

  get userRepository(): IUserRepository {
    if (!this._userRepository) {
      this._userRepository = new PrismaUserRepository();
    }
    return this._userRepository;
  }

  get passwordResetTokenRepository(): IPasswordResetTokenRepository {
    if (!this._passwordResetTokenRepository) {
      this._passwordResetTokenRepository = new PrismaPasswordResetTokenRepository();
    }
    return this._passwordResetTokenRepository;
  }

  get emailVerificationTokenRepository(): IEmailVerificationTokenRepository {
    if (!this._emailVerificationTokenRepository) {
      this._emailVerificationTokenRepository = new PrismaEmailVerificationTokenRepository();
    }
    return this._emailVerificationTokenRepository;
  }

  get passwordChangeTokenRepository(): IPasswordChangeTokenRepository {
    if (!this._passwordChangeTokenRepository) {
      this._passwordChangeTokenRepository = new PrismaPasswordChangeTokenRepository();
    }
    return this._passwordChangeTokenRepository;
  }

  get teacherProfileRepository(): ITeacherProfileRepository {
    if (!this._teacherProfileRepository) {
      this._teacherProfileRepository = new PrismaTeacherProfileRepository();
    }
    return this._teacherProfileRepository;
  }

  get completeOnboardingUseCase(): CompleteOnboardingUseCase {
    if (!this._completeOnboardingUseCase) {
      this._completeOnboardingUseCase = new CompleteOnboardingUseCase(
        this.userRepository,
        this.teacherProfileRepository,
      );
    }
    return this._completeOnboardingUseCase;
  }

  get schoolCalendarRepository(): ISchoolCalendarRepository {
    if (!this._schoolCalendarRepository) {
      this._schoolCalendarRepository = new PrismaSchoolCalendarRepository();
    }
    return this._schoolCalendarRepository;
  }

  get calendarResolutionService(): CalendarResolutionService {
    if (!this._calendarResolutionService) {
      this._calendarResolutionService = new CalendarResolutionService(
        this.schoolCalendarRepository,
        this.userRepository,
        this.planRepository,
        this.cache,
        this.getLogger('calendar-resolution'),
      );
    }
    return this._calendarResolutionService;
  }

  get calendarEventTypeConfigRepository(): ICalendarEventTypeConfigRepository {
    if (!this._calendarEventTypeConfigRepository) {
      this._calendarEventTypeConfigRepository = new PrismaCalendarEventTypeConfigRepository();
    }
    return this._calendarEventTypeConfigRepository;
  }

  get calendarImpactService(): CalendarImpactService {
    if (!this._calendarImpactService) {
      this._calendarImpactService = new CalendarImpactService();
    }
    return this._calendarImpactService;
  }

  get calendarInsightsService(): CalendarInsightsService {
    if (!this._calendarInsightsService) {
      this._calendarInsightsService = new CalendarInsightsService(this.calendarImpactService);
    }
    return this._calendarInsightsService;
  }

  get smartNotificationService(): SmartNotificationService {
    if (!this._smartNotificationService) {
      this._smartNotificationService = new SmartNotificationService(
        this.calendarInsightsService,
        this.calendarResolutionService,
      );
    }
    return this._smartNotificationService;
  }

  get createSchoolCalendarUseCase(): CreateSchoolCalendarUseCase {
    if (!this._createSchoolCalendarUseCase) {
      this._createSchoolCalendarUseCase = new CreateSchoolCalendarUseCase(
        this.schoolCalendarRepository,
      );
    }
    return this._createSchoolCalendarUseCase;
  }

  get getSchoolCalendarUseCase(): GetSchoolCalendarUseCase {
    if (!this._getSchoolCalendarUseCase) {
      this._getSchoolCalendarUseCase = new GetSchoolCalendarUseCase(
        this.schoolCalendarRepository,
      );
    }
    return this._getSchoolCalendarUseCase;
  }

  get manageCalendarEventsUseCase(): ManageCalendarEventsUseCase {
    if (!this._manageCalendarEventsUseCase) {
      this._manageCalendarEventsUseCase = new ManageCalendarEventsUseCase(
        this.schoolCalendarRepository,
        this.cache,
        this.getLogger('calendar-events'),
      );
    }
    return this._manageCalendarEventsUseCase;
  }

  get emailService(): IEmailService {
    if (!this._emailService) {
      if (env.RESEND_API_KEY) {
        this._emailService = new ResendEmailService();
      } else {
        this._emailService = new ConsoleEmailService();
      }
    }
    return this._emailService;
  }

  get hashService(): IHashService {
    if (!this._hashService) {
      this._hashService = new BcryptHashService();
    }
    return this._hashService;
  }

  get jwtService(): IJwtService {
    if (!this._jwtService) {
      this._jwtService = new JoseJwtService(env.NEXTAUTH_SECRET);
    }
    return this._jwtService;
  }

  get lessonRepository(): ILessonRepository {
    if (!this._lessonRepository) {
      this._lessonRepository = new PrismaLessonRepository();
    }
    return this._lessonRepository;
  }

  get teachingActivityRepository(): ITeachingActivityRepository {
    if (!this._teachingActivityRepository) {
      this._teachingActivityRepository = new PrismaTeachingActivityRepository();
    }
    return this._teachingActivityRepository;
  }

  get reportRepository(): IReportRepository {
    if (!this._reportRepository) {
      this._reportRepository = new PrismaReportRepository();
    }
    return this._reportRepository;
  }

  get subscriptionRepository(): ISubscriptionRepository {
    if (!this._subscriptionRepository) {
      this._subscriptionRepository = new PrismaSubscriptionRepository();
    }
    return this._subscriptionRepository;
  }

  get paymentRepository(): IPaymentRepository {
    if (!this._paymentRepository) {
      this._paymentRepository = new PrismaPaymentRepository();
    }
    return this._paymentRepository;
  }

  get createFreeSubscriptionUseCase(): CreateFreeSubscriptionUseCase {
    if (!this._createFreeSubscriptionUseCase) {
      this._createFreeSubscriptionUseCase = new CreateFreeSubscriptionUseCase(
        this.subscriptionRepository,
      );
    }
    return this._createFreeSubscriptionUseCase;
  }

  get paymentProvider(): IPaymentProvider {
    if (!this._paymentProvider) {
      this._paymentProvider = new FakePaymentProvider(this.paymentRepository);
    }
    return this._paymentProvider;
  }

  get upgradeToPremiumUseCase(): UpgradeToPremiumUseCase {
    if (!this._upgradeToPremiumUseCase) {
      this._upgradeToPremiumUseCase = new UpgradeToPremiumUseCase(
        this.subscriptionRepository,
        this.paymentRepository,
        this.userRepository,
        this.emailService,
        this.paymentProvider,
        this.subscriptionPlanConfigRepository,
      );
    }
    return this._upgradeToPremiumUseCase;
  }

  get getSubscriptionStatusUseCase(): GetSubscriptionStatusUseCase {
    if (!this._getSubscriptionStatusUseCase) {
      this._getSubscriptionStatusUseCase = new GetSubscriptionStatusUseCase(
        this.subscriptionRepository,
        this.paymentRepository,
      );
    }
    return this._getSubscriptionStatusUseCase;
  }

  get getSubscriptionUsageUseCase(): GetSubscriptionUsageUseCase {
    if (!this._getSubscriptionUsageUseCase) {
      this._getSubscriptionUsageUseCase = new GetSubscriptionUsageUseCase(
        this.subscriptionRepository,
        this.planRepository,
        this.subscriptionPlanConfigRepository,
      );
    }
    return this._getSubscriptionUsageUseCase;
  }

  get expireSubscriptionsUseCase(): ExpireSubscriptionsUseCase {
    if (!this._expireSubscriptionsUseCase) {
      this._expireSubscriptionsUseCase = new ExpireSubscriptionsUseCase(
        this.subscriptionRepository,
        this.paymentRepository,
      );
    }
    return this._expireSubscriptionsUseCase;
  }

  get auditLogRepository(): IAuditLogRepository {
    if (!this._auditLogRepository) {
      this._auditLogRepository = new PrismaAuditLogRepository();
    }
    return this._auditLogRepository;
  }

  get subscriptionPlanConfigRepository(): ISubscriptionPlanConfigRepository {
    if (!this._subscriptionPlanConfigRepository) {
      this._subscriptionPlanConfigRepository = new PrismaSubscriptionPlanConfigRepository();
    }
    return this._subscriptionPlanConfigRepository;
  }

  get listSubscriptionPlanConfigsUseCase(): ListSubscriptionPlanConfigsUseCase {
    if (!this._listSubscriptionPlanConfigsUseCase) {
      this._listSubscriptionPlanConfigsUseCase = new ListSubscriptionPlanConfigsUseCase(
        this.subscriptionPlanConfigRepository,
      );
    }
    return this._listSubscriptionPlanConfigsUseCase;
  }

  get createSubscriptionPlanConfigUseCase(): CreateSubscriptionPlanConfigUseCase {
    if (!this._createSubscriptionPlanConfigUseCase) {
      this._createSubscriptionPlanConfigUseCase = new CreateSubscriptionPlanConfigUseCase(
        this.subscriptionPlanConfigRepository,
      );
    }
    return this._createSubscriptionPlanConfigUseCase;
  }

  get updateSubscriptionPlanConfigUseCase(): UpdateSubscriptionPlanConfigUseCase {
    if (!this._updateSubscriptionPlanConfigUseCase) {
      this._updateSubscriptionPlanConfigUseCase = new UpdateSubscriptionPlanConfigUseCase(
        this.subscriptionPlanConfigRepository,
      );
    }
    return this._updateSubscriptionPlanConfigUseCase;
  }

  get confirmPaymentUseCase(): ConfirmPaymentUseCase {
    if (!this._confirmPaymentUseCase) {
      this._confirmPaymentUseCase = new ConfirmPaymentUseCase(
        this.paymentRepository,
        this.subscriptionRepository,
        this.auditLogRepository,
        this.subscriptionPlanConfigRepository,
      );
    }
    return this._confirmPaymentUseCase;
  }

  get getPaymentStatusByReferenceUseCase(): GetPaymentStatusByReferenceUseCase {
    if (!this._getPaymentStatusByReferenceUseCase) {
      this._getPaymentStatusByReferenceUseCase = new GetPaymentStatusByReferenceUseCase(
        this.paymentRepository,
      );
    }
    return this._getPaymentStatusByReferenceUseCase;
  }

  get confirmPaymentByCodeUseCase(): ConfirmPaymentByCodeUseCase {
    if (!this._confirmPaymentByCodeUseCase) {
      this._confirmPaymentByCodeUseCase = new ConfirmPaymentByCodeUseCase(
        this.paymentRepository,
        this.confirmPaymentUseCase,
        this.getLogger('confirm-payment-by-code'),
      );
    }
    return this._confirmPaymentByCodeUseCase;
  }

  get subscriptionAccessMiddleware(): SubscriptionAccessMiddleware {
    if (!this._subscriptionAccessMiddleware) {
      this._subscriptionAccessMiddleware = new SubscriptionAccessMiddleware(
        this.subscriptionRepository,
        this.planRepository,
        this.subscriptionPlanConfigRepository,
      );
    }
    return this._subscriptionAccessMiddleware;
  }

  get aiClient(): AIClient {
    if (!this._aiClient) {
      this._aiClient = new AIClient();
    }
    return this._aiClient;
  }

  get aiPlanGenerator(): IAIPlanGeneratorService {
    if (!this._aiPlanGenerator) {
      this._aiPlanGenerator = new AIPlanGeneratorService(
        this.aiClient,
        this.cache,
        this.getLogger('ai-plan-generator'),
      );
    }
    return this._aiPlanGenerator;
  }

  get aiReportGenerator(): IAIReportGeneratorService {
    if (!this._aiReportGenerator) {
      this._aiReportGenerator = new AIReportGeneratorService(
        this.aiClient,
        this.cache,
        this.getLogger('ai-report-generator'),
      );
    }
    return this._aiReportGenerator;
  }

  // ==========================================
  //  SERVICES
  // ==========================================

  get authService(): AuthService {
    if (!this._authService) {
      this._authService = new AuthService(
        this.userRepository,
        this.jwtService,
        this.getLogger('auth'),
      );
    }
    return this._authService;
  }

  get planService(): PlanService {
    if (!this._planService) {
      const generateUseCase = new GeneratePlanUseCase(
        this.planRepository,
        this.dosificacaoRepository,
        this.aiPlanGenerator,
        this.schoolCalendarRepository,
        this.lessonRepository,
        this.teachingActivityRepository,
        this.calendarResolutionService,
        this.calendarImpactService,
      );
      const getUseCase = new GetPlansUseCase(this.planRepository);
      const updateUseCase = new UpdatePlanUseCase(this.planRepository, this.cache);

      this._planService = new PlanService(generateUseCase, getUseCase, updateUseCase, this.schoolCalendarRepository);
    }
    return this._planService;
  }

  get reportService(): ReportService {
    if (!this._reportService) {
      const aggregateUseCase = new AggregateActivitiesUseCase(
        this.teachingActivityRepository,
        this.lessonRepository,
      );

      const trimesterUseCase = new GenerateTrimesterReportUseCase(
        this.reportRepository,
        this.planRepository,
        aggregateUseCase,
        this.aiReportGenerator,
        this.getLogger('trimester-report'),
        this.schoolCalendarRepository,
        this.calendarResolutionService,
      );

      const annualUseCase = new GenerateAnnualReportUseCase(
        this.reportRepository,
        this.planRepository,
        aggregateUseCase,
        this.aiReportGenerator,
        this.getLogger('annual-report'),
      );

      this._reportService = new ReportService(
        trimesterUseCase,
        annualUseCase,
        this.reportRepository,
      );
    }
    return this._reportService;
  }

  // ==========================================
  //  CONTROLLERS (Presentation Layer)
  // ==========================================

  get planController(): PlanController {
    if (!this._planController) {
      this._planController = new PlanController(
        this.planService,
        this.authService,
        this.getLogger('plan-controller'),
        this.subscriptionAccessMiddleware,
      );
    }
    return this._planController;
  }

  get dosificacaoController(): DosificacaoController {
    if (!this._dosificacaoController) {
      this._dosificacaoController = new DosificacaoController(
        this.dosificacaoRepository,
        this.authService,
        this.getLogger('dosificacao-controller'),
      );
    }
    return this._dosificacaoController;
  }

  get authController(): AuthController {
    if (!this._authController) {
      const loginUseCase = new LoginUseCase(
        this.userRepository,
        this.hashService,
        this.jwtService,
      );
      const registerUseCase = new RegisterUseCase(
        this.userRepository,
        this.hashService,
        this.emailService,
        this.emailVerificationTokenRepository,
        this.jwtService,
        this.subscriptionRepository,
      );
      const refreshTokenUseCase = new RefreshTokenUseCase(
        this.userRepository,
        this.jwtService,
      );
      const forgotPasswordUseCase = new ForgotPasswordUseCase(
        this.userRepository,
        this.passwordResetTokenRepository,
        this.emailService,
        env.NEXTAUTH_URL,
      );
      const resetPasswordUseCase = new ResetPasswordUseCase(
        this.userRepository,
        this.passwordResetTokenRepository,
        this.hashService,
      );
      const updateProfileUseCase = new UpdateProfileUseCase(
        this.userRepository,
      );
      const verifyEmailUseCase = new VerifyEmailUseCase(
        this.userRepository,
        this.emailVerificationTokenRepository,
        this.emailService,
        this.jwtService,
        this.subscriptionRepository,
      );
      const resendVerificationCodeUseCase = new ResendVerificationCodeUseCase(
        this.userRepository,
        this.emailVerificationTokenRepository,
        this.emailService,
      );
      const requestPasswordChangeUseCase = new RequestPasswordChangeUseCase(
        this.userRepository,
        this.hashService,
        this.passwordChangeTokenRepository,
        this.emailService,
      );
      const confirmPasswordChangeUseCase = new ConfirmPasswordChangeUseCase(
        this.userRepository,
        this.passwordChangeTokenRepository,
      );

      this._authController = new AuthController(
        loginUseCase,
        registerUseCase,
        refreshTokenUseCase,
        forgotPasswordUseCase,
        resetPasswordUseCase,
        updateProfileUseCase,
        verifyEmailUseCase,
        resendVerificationCodeUseCase,
        requestPasswordChangeUseCase,
        confirmPasswordChangeUseCase,
        this.userRepository,
        this.jwtService,
        this.getLogger('auth-controller'),
      );
    }
    return this._authController;
  }

  get reportController(): ReportController {
    if (!this._reportController) {
      this._reportController = new ReportController(
        this.reportService,
        this.authService,
        this.getLogger('report-controller'),
        this.subscriptionAccessMiddleware,
      );
    }
    return this._reportController;
  }

  get subscriptionController(): SubscriptionController {
    if (!this._subscriptionController) {
      this._subscriptionController = new SubscriptionController(
        this.authService,
        this.upgradeToPremiumUseCase,
        this.getSubscriptionStatusUseCase,
        this.getSubscriptionUsageUseCase,
        this.confirmPaymentUseCase,
        this.expireSubscriptionsUseCase,
        this.subscriptionRepository,
        this.paymentRepository,
        this.getLogger('subscription-controller'),
        this.userRepository,
        this.emailService,
        this.auditLogRepository,
        this.getPaymentStatusByReferenceUseCase,
        this.confirmPaymentByCodeUseCase,
        this.subscriptionPlanConfigRepository,
      );
    }
    return this._subscriptionController;
  }

  get subscriptionPlanConfigController(): SubscriptionPlanConfigController {
    if (!this._subscriptionPlanConfigController) {
      this._subscriptionPlanConfigController = new SubscriptionPlanConfigController(
        this.authService,
        this.listSubscriptionPlanConfigsUseCase,
        this.createSubscriptionPlanConfigUseCase,
        this.updateSubscriptionPlanConfigUseCase,
        this.getLogger('subscription-plan-config-controller'),
      );
    }
    return this._subscriptionPlanConfigController;
  }

  // ==========================================
  //  TEST HELPERS
  // ==========================================

  override<K extends keyof this>(key: K, value: this[K]): void {
    (this as Record<string, unknown>)[`_${String(key)}`] = value;
  }

  reset(): void {
    this._planRepository = null;
    this._dosificacaoRepository = null;
    this._userRepository = null;
    this._lessonRepository = null;
    this._teachingActivityRepository = null;
    this._reportRepository = null;
    this._cache = null;
    this._aiClient = null;
    this._aiPlanGenerator = null;
    this._aiReportGenerator = null;
    this._authService = null;
    this._planService = null;
    this._reportService = null;
    this._passwordResetTokenRepository = null;
    this._emailVerificationTokenRepository = null;
    this._passwordChangeTokenRepository = null;
    this._teacherProfileRepository = null;
    this._completeOnboardingUseCase = null;
    this._schoolCalendarRepository = null;
    this._calendarResolutionService = null;
    this._calendarImpactService = null;
    this._calendarInsightsService = null;
    this._smartNotificationService = null;
    this._calendarEventTypeConfigRepository = null;
    this._createSchoolCalendarUseCase = null;
    this._getSchoolCalendarUseCase = null;
    this._manageCalendarEventsUseCase = null;
    this._hashService = null;
    this._jwtService = null;
    this._emailService = null;
    this._planController = null;
    this._dosificacaoController = null;
    this._reportController = null;
    this._authController = null;
    this._subscriptionRepository = null;
    this._paymentRepository = null;
    this._paymentProvider = null;
    this._createFreeSubscriptionUseCase = null;
    this._upgradeToPremiumUseCase = null;
    this._getSubscriptionStatusUseCase = null;
    this._getSubscriptionUsageUseCase = null;
    this._expireSubscriptionsUseCase = null;
    this._confirmPaymentUseCase = null;
    this._subscriptionAccessMiddleware = null;
    this._subscriptionController = null;
    this._auditLogRepository = null;
    this._getPaymentStatusByReferenceUseCase = null;
    this._confirmPaymentByCodeUseCase = null;
    this._subscriptionPlanConfigRepository = null;
    this._listSubscriptionPlanConfigsUseCase = null;
    this._createSubscriptionPlanConfigUseCase = null;
    this._updateSubscriptionPlanConfigUseCase = null;
    this._subscriptionPlanConfigController = null;
    this.loggers.clear();
  }
}

// Singleton container instance
export const container = new Container();
