import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIClient } from '@/src/ai/services/ai-client';

const mockSuccessResponse = {
  choices: [{ message: { content: '{"objectives": ["test"]}' } }],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  model: 'gpt-4o',
};

describe('AIClient', () => {
  let client: AIClient;

  beforeEach(() => {
    client = new AIClient({ apiKey: 'test-key' });
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return parsed response on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockSuccessResponse), { status: 200 }),
    );

    const result = await client.complete({
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(result.content).toBe('{"objectives": ["test"]}');
    expect(result.usage.totalTokens).toBe(30);
    expect(result.model).toBe('gpt-4o');
  });

  it('should throw on non-retryable error (400)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('Bad request', { status: 400 }),
    );

    await expect(
      client.complete({ messages: [{ role: 'user', content: 'test' }] }),
    ).rejects.toThrow('AI API error (400)');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 rate limit', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('Rate limited', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockSuccessResponse), { status: 200 }),
      );

    const promise = client.complete({
      messages: [{ role: 'user', content: 'test' }],
    });

    // Advance past the backoff delay
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result.content).toBe('{"objectives": ["test"]}');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should retry on 500 server errors', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('Server error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockSuccessResponse), { status: 200 }),
      );

    const promise = client.complete({
      messages: [{ role: 'user', content: 'test' }],
    });

    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.content).toBe('{"objectives": ["test"]}');
  });

  it('should throw after exhausting all retries', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response('Server error', { status: 500 })),
    );

    const promise = client.complete({
      messages: [{ role: 'user', content: 'test' }],
    });

    // Catch rejection immediately to prevent unhandled rejection warning
    const resultPromise = promise.catch(e => e);

    // Advance past all retry delays: 1s + 2s + 4s = 7s
    await vi.advanceTimersByTimeAsync(10000);

    const error = await resultPromise;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('AI API error (500)');
    // 1 initial + 3 retries = 4 calls
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('should retry on network errors (fetch throws)', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockSuccessResponse), { status: 200 }),
      );

    const promise = client.complete({
      messages: [{ role: 'user', content: 'test' }],
    });

    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.content).toBe('{"objectives": ["test"]}');
  });

  it('should respect Retry-After header on 429', async () => {
    const headers = new Headers({ 'retry-after': '2' });
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('Rate limited', { status: 429, headers }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockSuccessResponse), { status: 200 }),
      );

    const promise = client.complete({
      messages: [{ role: 'user', content: 'test' }],
    });

    // Retry-After: 2 means 2000ms
    await vi.advanceTimersByTimeAsync(3000);

    const result = await promise;
    expect(result.content).toBe('{"objectives": ["test"]}');
  });

  it('should send json response_format when requested', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockSuccessResponse), { status: 200 }),
    );

    await client.complete({
      messages: [{ role: 'user', content: 'test' }],
      responseFormat: 'json',
    });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('should not retry on 401 unauthorized', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    );

    await expect(
      client.complete({ messages: [{ role: 'user', content: 'test' }] }),
    ).rejects.toThrow('AI API error (401)');

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
