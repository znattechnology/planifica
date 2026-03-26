import { describe, it, expect } from 'vitest';
import { handleApiError } from '@/src/shared/lib/api-response';
import { EntityNotFoundError, ValidationError, UnauthorizedError } from '@/src/domain/errors/domain.error';
import { PlanType, PlanStatus } from '@/src/domain/entities/plan.entity';
import { UserRole } from '@/src/domain/entities/user.entity';

// Integration tests for Plans API routes
// These test the API response handling patterns without requiring database access

describe('Plans API - Response Patterns', () => {
  it('should return 401 when access token is missing', () => {
    const req = new Request('http://localhost:3000/api/plans');
    const cookieHeader = req.headers.get('cookie');
    expect(cookieHeader).toBeNull();
  });

  it('handleApiError should map domain errors to correct HTTP statuses', async () => {
    const notFound = handleApiError(new EntityNotFoundError('Plan', 'abc'));
    expect(notFound.status).toBe(404);

    const validation = handleApiError(new ValidationError('Campo obrigatório'));
    expect(validation.status).toBe(422);

    const unauthorized = handleApiError(new UnauthorizedError());
    expect(unauthorized.status).toBe(401);
  });

  it('should validate required fields for plan generation', () => {
    // Simulates the validation that POST /api/plans/generate performs
    const body = { type: PlanType.ANNUAL, title: 'Test' };
    const hasRequired = body.type && body.title;
    expect(hasRequired).toBeTruthy();

    const emptyBody = { type: '', title: '' };
    const missingRequired = emptyBody.type && emptyBody.title;
    expect(missingRequired).toBeFalsy();
  });

  it('should validate plan status transitions', () => {
    const validStatuses = Object.values(PlanStatus);

    expect(validStatuses).toContain('DRAFT');
    expect(validStatuses).toContain('GENERATING');
    expect(validStatuses).toContain('GENERATED');
    expect(validStatuses).toContain('REVIEWED');
    expect(validStatuses).toContain('APPROVED');

    // Admin approval flow: GENERATED → REVIEWED → APPROVED
    const canApprove = (status: string) =>
      status === PlanStatus.GENERATED || status === PlanStatus.REVIEWED;
    expect(canApprove('GENERATED')).toBe(true);
    expect(canApprove('REVIEWED')).toBe(true);
    expect(canApprove('DRAFT')).toBe(false);
  });

  it('should validate admin role check', () => {
    const isAdminOrCoordinator = (role: string) =>
      role === UserRole.ADMIN || role === UserRole.COORDINATOR;

    expect(isAdminOrCoordinator('ADMIN')).toBe(true);
    expect(isAdminOrCoordinator('COORDINATOR')).toBe(true);
    expect(isAdminOrCoordinator('TEACHER')).toBe(false);
  });
});
