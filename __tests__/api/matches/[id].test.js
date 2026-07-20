import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '@/pages/api/matches/[id]';

vi.mock('@/lib/queries', () => ({
  getMatchById: vi.fn(),
  endMatch: vi.fn(),
}));

const { getMatchById, endMatch } = await import('@/lib/queries');

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

describe('GET /api/matches/:id', () => {
  it('경기 정보를 반환한다 (controller 필드 포함)', async () => {
    const match = {
      id: 1,
      startedAt: new Date(),
      endedAt: null,
      status: 'in_progress',
      controllerToken: 'token-a',
      controllerHeartbeatAt: new Date(),
    };
    getMatchById.mockResolvedValue(match);

    const req = { method: 'GET', query: { id: '1' } };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(match);
  });

  it('존재하지 않는 경기면 404를 반환한다', async () => {
    getMatchById.mockResolvedValue(null);

    const req = { method: 'GET', query: { id: '999' } };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  it('id가 유효하지 않으면 400을 반환한다', async () => {
    const req = { method: 'GET', query: { id: 'abc' } };
    const res = createRes();
    await handler(req, res);

    expect(getMatchById).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /api/matches/:id', () => {
  it('진행 중인 경기를 종료 처리한다', async () => {
    getMatchById.mockResolvedValue({ id: 1, status: 'in_progress' });
    const updated = {
      id: 1,
      startedAt: new Date(),
      endedAt: new Date(),
      status: 'ended',
    };
    endMatch.mockResolvedValue(updated);

    const req = { method: 'PATCH', query: { id: '1' } };
    const res = createRes();
    await handler(req, res);

    expect(endMatch).toHaveBeenCalledWith(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(updated);
  });

  it('존재하지 않는 경기면 404를 반환한다', async () => {
    getMatchById.mockResolvedValue(null);

    const req = { method: 'PATCH', query: { id: '999' } };
    const res = createRes();
    await handler(req, res);

    expect(endMatch).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('이미 종료된 경기면 400을 반환한다', async () => {
    getMatchById.mockResolvedValue({ id: 1, status: 'ended' });

    const req = { method: 'PATCH', query: { id: '1' } };
    const res = createRes();
    await handler(req, res);

    expect(endMatch).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'match already ended' });
  });

  it('id가 유효하지 않으면 400을 반환한다', async () => {
    const req = { method: 'PATCH', query: { id: 'abc' } };
    const res = createRes();
    await handler(req, res);

    expect(getMatchById).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});

describe('그 외 HTTP 메서드', () => {
  it('405와 Allow 헤더를 반환한다', async () => {
    const req = { method: 'DELETE', query: { id: '1' } };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['GET', 'PATCH']);
  });
});
