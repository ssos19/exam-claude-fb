import { describe, it, expect } from 'vitest';
import { parsePosition, parseLimit, ValidationError } from './validation';

describe('parsePosition', () => {
  it('경계값 0은 허용한다', () => {
    expect(parsePosition(0)).toBe(0);
  });

  it('경계값 100은 허용한다', () => {
    expect(parsePosition(100)).toBe(100);
  });

  it('음수는 거부한다', () => {
    expect(() => parsePosition(-1)).toThrow(ValidationError);
  });

  it('101은 거부한다', () => {
    expect(() => parsePosition(101)).toThrow(ValidationError);
  });

  it('정수가 아니면 거부한다', () => {
    expect(() => parsePosition(50.5)).toThrow(ValidationError);
  });

  it('숫자가 아니면 거부한다', () => {
    expect(() => parsePosition('50')).toThrow(ValidationError);
    expect(() => parsePosition(undefined)).toThrow(ValidationError);
    expect(() => parsePosition(null)).toThrow(ValidationError);
  });
});

describe('parseLimit', () => {
  it('값이 없으면 defaultValue를 반환한다', () => {
    expect(parseLimit(undefined)).toBe(100);
    expect(parseLimit(null)).toBe(100);
  });

  it('범위 내 정수는 그대로 반환한다', () => {
    expect(parseLimit(1)).toBe(1);
    expect(parseLimit(500)).toBe(500);
  });

  it('0은 거부한다', () => {
    expect(() => parseLimit(0)).toThrow(ValidationError);
  });

  it('max(기본 500) 초과는 거부한다', () => {
    expect(() => parseLimit(501)).toThrow(ValidationError);
  });

  it('정수가 아니면 거부한다', () => {
    expect(() => parseLimit('abc')).toThrow(ValidationError);
    expect(() => parseLimit(1.5)).toThrow(ValidationError);
  });

  it('커스텀 max를 적용한다', () => {
    expect(parseLimit(10, { max: 10 })).toBe(10);
    expect(() => parseLimit(11, { max: 10 })).toThrow(ValidationError);
  });
});
