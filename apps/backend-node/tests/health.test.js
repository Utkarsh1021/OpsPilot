
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const pool = require('../src/config/db');

test('GET /api/v1/health should return HTTP 200', async (t) => {
    t.mock.method(pool, 'query', async () => ({
        rows: [{ now: new Date() }],
    }));

    const response = await request(app)
        .get('/api/v1/health');

    assert.equal(response.status, 200);
});
