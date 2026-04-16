import { describe, it, expect } from 'vitest';
import { InMemoryCacheService, buildCacheKey } from '@/src/cache/cache.service';

describe('InMemoryCacheService', () => {
  it('should delete only entries matching prefix', async () => {
    const cache = new InMemoryCacheService();

    await cache.set('plan:cal-1:ANNUAL:dos-1:Math:10', 'data1');
    await cache.set('plan:cal-1:TRIMESTER:dos-1:Math:10', 'data2');
    await cache.set('plan:cal-2:ANNUAL:dos-2:Physics:11', 'data3');
    await cache.set('plan:_:ANNUAL:dos-3:Bio:10', 'data4');

    // Delete only cal-1 entries
    const deleted = await cache.deleteByPrefix('plan:cal-1:');
    expect(deleted).toBe(2);

    // cal-2 and no-calendar entries should remain
    expect(await cache.has('plan:cal-2:ANNUAL:dos-2:Physics:11')).toBe(true);
    expect(await cache.has('plan:_:ANNUAL:dos-3:Bio:10')).toBe(true);
    expect(await cache.has('plan:cal-1:ANNUAL:dos-1:Math:10')).toBe(false);
  });

  it('should delete legacy keys with plan:_: prefix', async () => {
    const cache = new InMemoryCacheService();

    await cache.set('plan:_:ANNUAL:dos-1:Math:10', 'data1');
    await cache.set('plan:cal-1:ANNUAL:dos-2:Math:10', 'data2');

    const deleted = await cache.deleteByPrefix('plan:_:');
    expect(deleted).toBe(1);

    expect(await cache.has('plan:cal-1:ANNUAL:dos-2:Math:10')).toBe(true);
  });
});

describe('buildCacheKey', () => {
  it('should include calendarId in cache key', () => {
    const key = buildCacheKey('plan', 'cal-123', 'ANNUAL', 'dos-1', 'Math', '10');
    expect(key).toBe('plan:cal-123:ANNUAL:dos-1:Math:10');
  });

  it('should use _ as placeholder when no calendarId', () => {
    const key = buildCacheKey('plan', '_', 'ANNUAL', 'dos-1', 'Math', '10');
    expect(key).toBe('plan:_:ANNUAL:dos-1:Math:10');
  });
});
