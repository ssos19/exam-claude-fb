import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from './occupancy';

vi.mock('@/lib/queries', () => ({
  getAllPositionsOrdered: vi.fn(),
}));

const { getAllPositionsOrdered } = await import('@/lib/queries');

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/occupancy', () => {
  it('기록이 2건 미만이면 insufficient_data를 반환한다', async () => {
    getAllPositionsOrdered.mockResolvedValue([]);

    const req = { method: 'GET' };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'insufficient_data', sampleCount: 0 });
  });

  it('기록이 2건 이상이면 팀별 공격 점유율을 계산한다', async () => {
    getAllPositionsOrdered.mockResolvedValue([
      { position: 20, recordedAt: new Date('2026-01-01T00:00:00Z') },
      { position: 80, recordedAt: new Date('2026-01-01T00:00:10Z') },
    ]);

    const req = { method: 'GET' };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    // 20(left) -> 80(right)까지 10초 구간은 공이 왼쪽(A 진영)에 머문 시간이므로 B의 공격 점유율이다.
    expect(res.body.teams.A.attackRatio).toBe(0);
    expect(res.body.teams.B.attackRatio).toBe(1);
  });

  it('DB 오류 시 500을 반환한다', async () => {
    getAllPositionsOrdered.mockRejectedValue(new Error('db down'));

    const req = { method: 'GET' };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'internal server error' });
  });

  it('GET 이외의 메서드는 405를 반환한다', async () => {
    const req = { method: 'POST' };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['GET']);
  });
});
