
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'opspilot-test-secret-only';

const app = require('../src/app');
const pool = require('../src/config/db');

test('GET /api/v1/tasks should reject requests without a token', async () => {
    const response = await request(app)
        .get('/api/v1/tasks');

    assert.equal(response.status, 401);
});

test('GET /api/v1/tasks should reject an invalid token', async () => {
    const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', 'Bearer invalid-token');

    assert.equal(response.status, 403);
});

test('GET /api/v1/tasks should accept a valid token', async (t) => {
    t.mock.method(pool, 'query', async () => ({
        rows: [],
    }));

    const token = jwt.sign(
        {
            userId: 42,
            email: 'test@opspilot.local',
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.tasks));
});



test('POST /api/v1/auth/register should register a new user', async (t) => {
    const createdAt = new Date();

    t.mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('SELECT id FROM users WHERE email')) {
            assert.equal(params[0], 'test@opspilot.local');
            return { rows: [] };
        }

        if (sql.includes('INSERT INTO users')) {
            assert.equal(params[0], 'Test User');
            assert.equal(params[1], 'test@opspilot.local');
            assert.notEqual(params[2], 'TestPassword123');

            return {
                rows: [{
                    id: 101,
                    name: 'Test User',
                    email: 'test@opspilot.local',
                    created_at: createdAt
                }]
            };
        }

        throw new Error(`Unexpected SQL query: ${sql}`);
    });

    const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
            name: ' Test User ',
            email: ' TEST@OPSPILOT.LOCAL ',
            password: 'TestPassword123'
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.user.email, 'test@opspilot.local');
    assert.ok(response.body.token);

    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    assert.equal(decoded.userId, '101');
});

test('POST /api/v1/auth/register should reject duplicate email', async (t) => {
    t.mock.method(pool, 'query', async () => ({
        rows: [{ id: 101 }]
    }));

    const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
            name: 'Test User',
            email: 'test@opspilot.local',
            password: 'TestPassword123'
        });

    assert.equal(response.status, 409);
    assert.equal(response.body.success, false);
});

test('POST /api/v1/auth/register should reject missing fields', async () => {
    const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
            name: 'Test User',
            email: 'test@opspilot.local'
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
});

test('POST /api/v1/auth/login should authenticate valid credentials', async (t) => {
    const passwordHash = await bcrypt.hash('TestPassword123', 12);

    t.mock.method(pool, 'query', async (sql, params) => {
        assert.ok(sql.includes('password_hash FROM users'));
        assert.equal(params[0], 'test@opspilot.local');

        return {
            rows: [{
                id: 101,
                name: 'Test User',
                email: 'test@opspilot.local',
                password_hash: passwordHash
            }]
        };
    });

    const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
            email: ' TEST@OPSPILOT.LOCAL ',
            password: 'TestPassword123'
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.user.email, 'test@opspilot.local');
    assert.ok(response.body.token);

    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    assert.equal(decoded.userId, '101');
});

test('POST /api/v1/auth/login should reject an incorrect password', async (t) => {
    const passwordHash = await bcrypt.hash('CorrectPassword123', 12);

    t.mock.method(pool, 'query', async () => ({
        rows: [{
            id: 101,
            name: 'Test User',
            email: 'test@opspilot.local',
            password_hash: passwordHash
        }]
    }));

    const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
            email: 'test@opspilot.local',
            password: 'WrongPassword123'
        });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
});


test('GET /api/v1/auth/me should return the authenticated user profile', async (t) => {
    t.mock.method(pool, 'query', async (sql, params) => {
        assert.ok(sql.includes('FROM users'));
        assert.equal(params[0], '101');

        return {
            rows: [{
                id: 101,
                name: 'Test User',
                email: 'test@opspilot.local',
                created_at: new Date('2026-01-01T00:00:00.000Z')
            }]
        };
    });

    const token = jwt.sign(
        {
            userId: '101',
            email: 'test@opspilot.local'
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.user.id, 101);
    assert.equal(response.body.user.email, 'test@opspilot.local');
});

test('GET /api/v1/auth/me should return 404 if user does not exist', async (t) => {
    t.mock.method(pool, 'query', async () => ({
        rows: []
    }));

    const token = jwt.sign(
        {
            userId: '999',
            email: 'missing@opspilot.local'
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
});
