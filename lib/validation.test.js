import { describe, it, expect } from 'vitest';
import {
  parsePosition,
  parseLimit,
  parseId,
  parseControllerToken,
  ValidationError,
} from './validation';

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

describe('parseId', () => {
  it('양의 정수는 그대로 반환한다', () => {
    expect(parseId(1)).toBe(1);
    expect(parseId('42')).toBe(42);
  });

  it('없으면(undefined/null/빈 문자열) 거부한다', () => {
    expect(() => parseId(undefined)).toThrow(ValidationError);
    expect(() => parseId(null)).toThrow(ValidationError);
    expect(() => parseId('')).toThrow(ValidationError);
  });

  it('0 이하는 거부한다', () => {
    expect(() => parseId(0)).toThrow(ValidationError);
    expect(() => parseId(-1)).toThrow(ValidationError);
  });

  it('정수가 아니면 거부한다', () => {
    expect(() => parseId(1.5)).toThrow(ValidationError);
    expect(() => parseId('abc')).toThrow(ValidationError);
  });

  it('에러 메시지에 name을 반영한다', () => {
    expect(() => parseId(undefined, 'matchId')).toThrow('matchId is required');
  });
});

describe('parseControllerToken', () => {
  it('비어있지 않은 문자열은 그대로 반환한다', () => {
    expect(parseControllerToken('abc')).toBe('abc');
  });

  it('빈 문자열은 거부한다', () => {
    expect(() => parseControllerToken('')).toThrow(ValidationError);
  });

  it('문자열이 아니면 거부한다', () => {
    expect(() => parseControllerToken(undefined)).toThrow(ValidationError);
    expect(() => parseControllerToken(null)).toThrow(ValidationError);
    expect(() => parseControllerToken(123)).toThrow(ValidationError);
  });

  it('64자를 초과하면 거부한다', () => {
    expect(() => parseControllerToken('a'.repeat(65))).toThrow(ValidationError);
    expect(parseControllerToken('a'.repeat(64))).toBe('a'.repeat(64));
  });
});
