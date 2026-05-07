import request from 'supertest';
import { app } from '../apps/runner/src/index'; // adjust import as needed

describe('GET /api/agents/:id/metrics', () => {
  it('should return 400 for invalid id', async () => {
    const res = await request(app).get('/api/agents/abc/metrics');
    expect(res.status).toBe(400);
  });
});
