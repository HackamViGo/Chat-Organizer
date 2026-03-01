import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { syncBatchService } from '../sync-batch.service';

describe('SyncBatchService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('window', {}); // Bypass SSR guard
    syncBatchService._clearForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('batches multiple requests with the same debounceId into one fetch call', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: '123', name: 'Final Name' }),
    } as any);

    const promise1 = syncBatchService.enqueue('/api/test', 'PUT', JSON.stringify({ name: 'A' }), 'item-123');
    const promise2 = syncBatchService.enqueue('/api/test', 'PUT', JSON.stringify({ name: 'B' }), 'item-123');
    const promise3 = syncBatchService.enqueue('/api/test', 'PUT', JSON.stringify({ name: 'Final Name' }), 'item-123');

    // Fast-forward timers to trigger flush
    await vi.runAllTimersAsync();

    const [res1, res2, res3] = await Promise.all([promise1, promise2, promise3]);

    // Should only have been called ONCE with the final payload
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ name: 'Final Name' })
    }));

    // All promises should resolve with the same data
    expect(res1).toEqual({ id: '123', name: 'Final Name' });
    expect(res2).toEqual({ id: '123', name: 'Final Name' });
    expect(res3).toEqual({ id: '123', name: 'Final Name' });
  });

  it('handles distinct debounceIds separately', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } as any);

    const promiseA = syncBatchService.enqueue('/api/test?id=A', 'DELETE', undefined, 'delete-A');
    const promiseB = syncBatchService.enqueue('/api/test?id=B', 'DELETE', undefined, 'delete-B');

    await vi.runAllTimersAsync();

    await Promise.all([promiseA, promiseB]);

    // Should be called twice, once for each distinct distinct ID
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects all chained promises if the final fetch fails', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    } as any);

    const promise1 = syncBatchService.enqueue('/api/test', 'PUT', JSON.stringify({ name: 'A' }), 'item-123');
    const promise2 = syncBatchService.enqueue('/api/test', 'PUT', JSON.stringify({ name: 'B' }), 'item-123');

    promise1.catch(() => {});
    promise2.catch(() => {});

    await vi.runAllTimersAsync();

    await expect(promise1).rejects.toThrow('Request failed: Internal Server Error');
    await expect(promise2).rejects.toThrow('Request failed: Internal Server Error');
  });
});
