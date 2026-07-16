import { describe, it, expect } from 'vitest';
import { calculateOccupancy } from './occupancy';

const t = (iso) => new Date(iso);

describe('calculateOccupancy', () => {
  it('0건이면 insufficient_data', () => {
    expect(calculateOccupancy([], { boundary: 50 })).toEqual({
      status: 'insufficient_data',
      sampleCount: 0,
    });
  });

  it('1건이면 insufficient_data', () => {
    const result = calculateOccupancy(
      [{ position: 30, recordedAt: t('2026-01-01T00:00:00Z') }],
      { boundary: 50 }
    );
    expect(result.status).toBe('insufficient_data');
  });

  it('2건 이상이면 구간별 시간 비율을 계산한다', () => {
    const records = [
      { position: 20, recordedAt: t('2026-01-01T00:00:00Z') }, // left, 10s
      { position: 80, recordedAt: t('2026-01-01T00:00:10Z') }, // right, 5s
      { position: 80, recordedAt: t('2026-01-01T00:00:15Z') }, // last, 구간 없음
    ];
    const result = calculateOccupancy(records, { boundary: 50 });
    expect(result).toMatchObject({
      status: 'ok',
      sampleCount: 3,
      leftDurationMs: 10000,
      rightDurationMs: 5000,
      totalDurationMs: 15000,
    });
  });

  it('경계값(position === boundary)은 right로 취급한다', () => {
    const records = [
      { position: 50, recordedAt: t('2026-01-01T00:00:00Z') },
      { position: 50, recordedAt: t('2026-01-01T00:00:10Z') },
    ];
    const result = calculateOccupancy(records, { boundary: 50 });
    expect(result).toMatchObject({ rightDurationMs: 10000, leftDurationMs: 0 });
  });

  it('정렬되지 않은 입력도 timestamp 기준으로 정렬해 계산한다', () => {
    const records = [
      { position: 80, recordedAt: t('2026-01-01T00:00:10Z') },
      { position: 20, recordedAt: t('2026-01-01T00:00:00Z') },
    ];
    const result = calculateOccupancy(records, { boundary: 50 });
    expect(result).toMatchObject({ leftDurationMs: 10000, rightDurationMs: 0 });
  });

  it('모든 timestamp가 동일하면 insufficient_data', () => {
    const same = t('2026-01-01T00:00:00Z');
    const records = [
      { position: 20, recordedAt: same },
      { position: 80, recordedAt: same },
    ];
    expect(calculateOccupancy(records, { boundary: 50 }).status).toBe('insufficient_data');
  });

  it('입력 배열을 변경하지 않는다 (순수 함수)', () => {
    const records = [
      { position: 80, recordedAt: t('2026-01-01T00:00:10Z') },
      { position: 20, recordedAt: t('2026-01-01T00:00:00Z') },
    ];
    const copy = [...records];
    calculateOccupancy(records, { boundary: 50 });
    expect(records).toEqual(copy);
  });
});
