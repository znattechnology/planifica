import { describe, it, expect } from 'vitest';
import {
  DomainError,
  EntityNotFoundError,
  ValidationError,
  UnauthorizedError,
  EmailNotVerifiedError,
} from '@/src/domain/errors/domain.error';

describe('Domain Errors', () => {
  it('DomainError should have code and message', () => {
    const err = new DomainError('test error', 'TEST_CODE');
    expect(err.message).toBe('test error');
    expect(err.code).toBe('TEST_CODE');
    expect(err.name).toBe('DomainError');
    expect(err).toBeInstanceOf(Error);
  });

  it('EntityNotFoundError should format message with entity and id', () => {
    const err = new EntityNotFoundError('Plan', 'abc-123');
    expect(err.message).toBe('Plan with id abc-123 not found');
    expect(err.code).toBe('ENTITY_NOT_FOUND');
    expect(err.name).toBe('EntityNotFoundError');
    expect(err).toBeInstanceOf(DomainError);
  });

  it('ValidationError should have VALIDATION_ERROR code', () => {
    const err = new ValidationError('Campo obrigatório');
    expect(err.message).toBe('Campo obrigatório');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.name).toBe('ValidationError');
  });

  it('UnauthorizedError should have UNAUTHORIZED code', () => {
    const err = new UnauthorizedError('Sem permissão');
    expect(err.message).toBe('Sem permissão');
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('UnauthorizedError should have default message', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('Unauthorized');
  });

  it('EmailNotVerifiedError should contain userId and email', () => {
    const err = new EmailNotVerifiedError('user-1', 'test@test.ao');
    expect(err.userId).toBe('user-1');
    expect(err.email).toBe('test@test.ao');
    expect(err.code).toBe('EMAIL_NOT_VERIFIED');
    expect(err.name).toBe('EmailNotVerifiedError');
  });
});
