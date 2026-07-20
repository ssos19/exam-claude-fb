import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '@/pages/api/positions';

vi.mock('@/lib/queries', () => ({
  insertPosition: vi.fn(),
  getRecentPositions: vi.fn(),
  getMatchById: vi.fn(),
  claimOrRenewController: vi.fn(),
}));

const { insertPosition, getRecentPositions, getMatchById, claimOrRenewController } =
  await import('@/lib/queries');

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
    end(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

const freshNow = () => new Date().toISOString();
const staleTime = () => new Date(Date.now() - 20000).toISOString(); // 20초 전 (10초 초과)

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/positions', () => {
  it('진행 중인 경기의 유효한 요청이면 201과 저장된 레코드를 반환한다', async () => {
    getMatchById.mockResolvedValue({
      id: 1,
      status: 'in_progress',
      controllerToken: null,
      controllerHeartbeatAt: null,
    });
    const record = {
      id: 1,
      matchId: 1,
      position: 42,
      recordedAt: new Date('2026-01-01T00:00:00Z'),
    };
    insertPosition.mockResolvedValue(record);

    const req = {
      method: 'POST',
      body: { matchId: 1, position: 42, controllerToken: 'token-a' },
    };
    const res = createRes();
    await handler(req, res);

    expect(getMatchById).toHaveBeenCalledWith(1);
    expect(insertPosition).toHaveBeenCalledWith(1, 42);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(record);
  });

  it('matchId가 없으면 400을 반환하고 저장하지 않는다', async () => {
    const req = { method: 'POST', body: { position: 42, controllerToken: 'token-a' } };
    const res = createRes();
    await handler(req, res);

    expect(getMatchById).not.toHaveBeenCalled();
    expect(insertPosition).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it('controllerToken이 없으면 400을 반환하고 저장하지 않는다', async () => {
    const req = { method: 'POST', body: { matchId: 1, position: 42 } };
    const res = createRes();
    await handler(req, res);

    expect(getMatchById).not.toHaveBeenCalled();
    expect(insertPosition).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it('존재하지 않는 matchId면 400을 반환한다', async () => {
    getMatchById.mockResolvedValue(null);

    const req = {
      method: 'POST',
      body: { matchId: 999, position: 42, controllerToken: 'token-a' },
    };
    const res = createRes();
    await handler(req, res);

    expect(insertPosition).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'match not found' });
  });

  it('종료된 경기면 403을 반환하고 저장하지 않는다', async () => {
    getMatchById.mockResolvedValue({ id: 1, status: 'ended' });

    const req = {
      method: 'POST',
      body: { matchId: 1, position: 42, controllerToken: 'token-a' },
    };
    const res = createRes();
    await handler(req, res);

    expect(insertPosition).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'match has ended' });
  });

  it('범위를 벗어난 position이면 400을 반환하고 저장하지 않는다', async () => {
    getMatchById.mockResolvedValue({ id: 1, status: 'in_progress' });

    const req = {
      method: 'POST',
      body: { matchId: 1, position: 101, controllerToken: 'token-a' },
    };
    const res = createRes();
    await handler(req, res);

    expect(insertPosition).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'position must be between 0 and 100' });
  });

  it('DB 오류 시 500을 반환한다', async () => {
    getMatchById.mockResolvedValue({
      id: 1,
      status: 'in_progress',
      controllerToken: null,
      controllerHeartbeatAt: null,
    });
    insertPosition.mockRejectedValue(new Error('db down'));

    const req = {
      method: 'POST',
      body: { matchId: 1, position: 10, controllerToken: 'token-a' },
    };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'internal server error' });
  });

  describe('제어권(controller lock)', () => {
    it('제어자가 없으면(controller_token null) 이 토큰으로 선점하고 저장한다', async () => {
      getMatchById.mockResolvedValue({
        id: 1,
        status: 'in_progress',
        controllerToken: null,
        controllerHeartbeatAt: null,
      });
      insertPosition.mockResolvedValue({ id: 1, matchId: 1, position: 30 });

      const req = {
        method: 'POST',
        body: { matchId: 1, position: 30, controllerToken: 'token-a' },
      };
      const res = createRes();
      await handler(req, res);

      expect(claimOrRenewController).toHaveBeenCalledWith(1, 'token-a');
      expect(insertPosition).toHaveBeenCalled();
      expect(res.statusCode).toBe(201);
    });

    it('같은 토큰이 다시 요청하면(fresh) heartbeat를 갱신하고 저장한다', async () => {
      getMatchById.mockResolvedValue({
        id: 1,
        status: 'in_progress',
        controllerToken: 'token-a',
        controllerHeartbeatAt: freshNow(),
      });
      insertPosition.mockResolvedValue({ id: 1, matchId: 1, position: 30 });

      const req = {
        method: 'POST',
        body: { matchId: 1, position: 30, controllerToken: 'token-a' },
      };
      const res = createRes();
      await handler(req, res);

      expect(claimOrRenewController).toHaveBeenCalledWith(1, 'token-a');
      expect(insertPosition).toHaveBeenCalled();
      expect(res.statusCode).toBe(201);
    });

    it('다른 토큰이 fresh한 제어권을 가진 경기에 요청하면 403이고 저장하지 않는다', async () => {
      getMatchById.mockResolvedValue({
        id: 1,
        status: 'in_progress',
        controllerToken: 'token-a',
        controllerHeartbeatAt: freshNow(),
      });

      const req = {
        method: 'POST',
        body: { matchId: 1, position: 30, controllerToken: 'token-b' },
      };
      const res = createRes();
      await handler(req, res);

      expect(claimOrRenewController).not.toHaveBeenCalled();
      expect(insertPosition).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({
        error: 'another user is controlling this match',
      });
    });

    it('제어권이 stale(10초 초과)이면 다른 토큰이 선점하고 저장한다', async () => {
      getMatchById.mockResolvedValue({
        id: 1,
        status: 'in_progress',
        controllerToken: 'token-a',
        controllerHeartbeatAt: staleTime(),
      });
      insertPosition.mockResolvedValue({ id: 1, matchId: 1, position: 30 });

      const req = {
        method: 'POST',
        body: { matchId: 1, position: 30, controllerToken: 'token-b' },
      };
      const res = createRes();
      await handler(req, res);

      expect(claimOrRenewController).toHaveBeenCalledWith(1, 'token-b');
      expect(insertPosition).toHaveBeenCalled();
      expect(res.statusCode).toBe(201);
    });
  });
});

describe('GET /api/positions', () => {
  it('matchId와 limit을 반영해 최근 기록을 반환한다', async () => {
    const items = [{ id: 2, matchId: 1, position: 10, recordedAt: new Date() }];
    getRecentPositions.mockResolvedValue(items);

    const req = { method: 'GET', query: { matchId: '1', limit: '5' } };
    const res = createRes();
    await handler(req, res);

    expect(getRecentPositions).toHaveBeenCalledWith(1, 5);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ items, count: items.length });
  });

  it('matchId가 없으면 400을 반환한다', async () => {
    const req = { method: 'GET', query: {} };
    const res = createRes();
    await handler(req, res);

    expect(getRecentPositions).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it('limit이 범위를 벗어나면 400을 반환한다', async () => {
    const req = { method: 'GET', query: { matchId: '1', limit: '501' } };
    const res = createRes();
    await handler(req, res);

    expect(getRecentPositions).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
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
