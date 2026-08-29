import { describe, expect, it, vi } from 'vitest';
import {
  bucketCount,
  bucketKm,
  bucketMb,
  sanitizeAnalyticsParams,
  trackEvent,
} from './analytics';

describe('analytics buckets', () => {
  it('buckets location counts without exposing exact values at scale', () => {
    expect(bucketCount(0)).toBe('0');
    expect(bucketCount(25)).toBe('1-50');
    expect(bucketCount(1500)).toBe('1000+');
  });

  it('buckets journey distance', () => {
    expect(bucketKm(10)).toBe('0-50');
    expect(bucketKm(1200)).toBe('500-5000');
    expect(bucketKm(9000)).toBe('5000+');
  });

  it('buckets export file size', () => {
    expect(bucketMb(2_000_000)).toBe('0-5');
    expect(bucketMb(25_000_000)).toBe('20+');
  });
});

describe('sanitizeAnalyticsParams', () => {
  it('drops keys that could carry personal content', () => {
    expect(sanitizeAnalyticsParams({
      source: 'file',
      title: 'My Trip to Seoul',
      latitude: 37.5,
      point_count_bucket: '51-200',
    })).toEqual({
      source: 'file',
      point_count_bucket: '51-200',
    });
  });
});

describe('trackEvent', () => {
  it('calls gtag in production with sanitized params', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', { gtag });
    vi.stubEnv('PROD', true);

    trackEvent('export_success', {
      export_id: 'abc-123',
      file_size_mb_bucket: '5-20',
      file_name: 'secret.json',
    });

    expect(gtag).toHaveBeenCalledWith('event', 'export_success', {
      export_id: 'abc-123',
      file_size_mb_bucket: '5-20',
    });

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('logs to console in development', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.stubEnv('PROD', false);

    trackEvent('preview_started', { duration_s: 15 });

    expect(debug).toHaveBeenCalledWith('[analytics]', 'preview_started', { duration_s: 15 });

    debug.mockRestore();
    vi.unstubAllEnvs();
  });
});
