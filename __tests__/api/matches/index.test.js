import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '@/pages/api/matches/index';

vi.mock('@/lib/queries', () => ({
  createMatch: vi.fn(),
  getAllMatches: vi.fn(),
}));

const { createMatch, getAllMatches } = await import('@/lib/queries');

function createRes() {
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/matches', () => {
  it('새 경기를 만들고 201로 반환한다', async () => {
    const match = {
      id: 1,
      startedAt: new Date(),
      endedAt: null,
      status: 'in_progress',
    };
    createMatch.mockResolvedValue(match);

    const req = { method: 'POST' };
    const res = createRes();
    await handler(req, res);

    expect(createMatch).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(match);
  });

  it('DB 오류 시 500을 반환한다', async () => {
    createMatch.mockRejectedValue(new Error('db down'));

    const req = { method: 'POST' };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });
});

describe('GET /api/matches', () => {
  it('전체 경기 목록을 반환한다', async () => {
    const items = [
      { id: 2, startedAt: new Date(), endedAt: null, status: 'in_progress' },
      { id: 1, startedAt: new Date(), endedAt: new Date(), status: 'ended' },
    ];
    getAllMatches.mockResolvedValue(items);

    const req = { method: 'GET' };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ items, count: items.length });
  });
});

describe('그 외 HTTP 메서드', () => {
  it('405와 Allow 헤더를 반환한다', async () => {
    const req = { method: 'DELETE' };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['GET', 'POST']);
  });
});
