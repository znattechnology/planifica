import { describe, it, expect } from 'vitest';
import { handleApiError } from '@/src/shared/lib/api-response';
import { EntityNotFoundError, ValidationError, UnauthorizedError } from '@/src/domain/errors/domain.error';

describe('handleApiError', () => {
  it('should return 404 for EntityNotFoundError', async () => {
    const err = new EntityNotFoundError('Plan', 'abc');
    const response = handleApiError(err);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 422 for ValidationError', async () => {
    const err = new ValidationError('Campo obrigatório');
    const response = handleApiError(err);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Campo obrigatório');
  });

  it('should return 401 for UnauthorizedError', async () => {
    const err = new UnauthorizedError('Sem permissão');
    const response = handleApiError(err);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 500 for unknown errors', async () => {
    const err = new Error('Something broke');
    const response = handleApiError(err);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should return 500 for non-Error objects', async () => {
    const response = handleApiError('string error');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
