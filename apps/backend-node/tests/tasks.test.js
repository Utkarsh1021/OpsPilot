
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'opspilot-test-secret-only';

const app = require('../src/app');
const pool = require('../src/config/db');

function createAuthToken(userId = '101') {
    return jwt.sign(
        {
            userId,
            email: 'test@opspilot.local'
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
}

test('POST /api/v1/tasks should create a task', async (t) => {
    const createdTask = {
        id: 501,
        title: 'Learn Docker',
        description: 'Understand Docker fundamentals',
        status: 'pending',
        priority: 'high',
        category_id: null,
        due_date: null
    };

    t.mock.method(pool, 'query', async (sql, params) => {
        assert.ok(sql.includes('INSERT INTO tasks'));
        assert.equal(params[0], '101');
        assert.equal(params[1], 'Learn Docker');
        assert.equal(params[2], 'Understand Docker fundamentals');
        assert.equal(params[3], 'high');

        return { rows: [createdTask] };
    });

    const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${createAuthToken()}`)
        .send({
            title: ' Learn Docker ',
            description: 'Understand Docker fundamentals',
            priority: 'high'
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.task.id, 501);
    assert.equal(response.body.task.title, 'Learn Docker');
});

test('GET /api/v1/tasks should return tasks belonging to the authenticated user', async (t) => {
    const tasks = [
        {
            id: 501,
            title: 'Learn Docker',
            status: 'pending',
            priority: 'high'
        },
        {
            id: 502,
            title: 'Learn Jenkins',
            status: 'in_progress',
            priority: 'medium'
        }
    ];

    t.mock.method(pool, 'query', async (sql, params) => {
        assert.ok(sql.includes('WHERE user_id = $1'));
        assert.equal(params[0], '101');

        return { rows: tasks };
    });

    const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${createAuthToken()}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.count, 2);
    assert.equal(response.body.tasks.length, 2);
});

test('GET /api/v1/tasks/:id should return a task belonging to the authenticated user', async (t) => {
    const task = {
        id: 501,
        title: 'Learn Docker',
        status: 'pending',
        priority: 'high'
    };

    t.mock.method(pool, 'query', async (sql, params) => {
        assert.ok(sql.includes('WHERE id = $1 AND user_id = $2'));
        assert.deepEqual(params, ['501', '101']);

        return { rows: [task] };
    });

    const response = await request(app)
        .get('/api/v1/tasks/501')
        .set('Authorization', `Bearer ${createAuthToken()}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.task.id, 501);
});


test('PUT /api/v1/tasks/:id should update a task', async (t) => {
    const updatedTask = {
        id: 501,
        title: 'Master Docker',
        status: 'in_progress',
        priority: 'high'
    };

    t.mock.method(pool, 'query', async (sql, params) => {
        assert.ok(sql.includes('UPDATE tasks'));
        assert.ok(sql.includes('WHERE id = $10 AND user_id = $11'));

        assert.equal(params[0], 'Master Docker');
        assert.equal(params[3], 'in_progress');
        assert.equal(params[9], '501');
        assert.equal(params[10], '101');

        return { rows: [updatedTask] };
    });

    const response = await request(app)
        .put('/api/v1/tasks/501')
        .set('Authorization', `Bearer ${createAuthToken()}`)
        .send({
            title: 'Master Docker',
            status: 'in_progress'
        });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.task.title, 'Master Docker');
    assert.equal(response.body.task.status, 'in_progress');
});

test('PUT /api/v1/tasks/:id should reject an empty update', async () => {
    const response = await request(app)
        .put('/api/v1/tasks/501')
        .set('Authorization', `Bearer ${createAuthToken()}`)
        .send({});

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
});

test('DELETE /api/v1/tasks/:id should delete a task', async (t) => {
    t.mock.method(pool, 'query', async (sql, params) => {
        assert.ok(sql.includes('DELETE FROM tasks'));
        assert.ok(sql.includes('WHERE id = $1 AND user_id = $2'));
        assert.deepEqual(params, ['501', '101']);

        return {
            rows: [{
                id: 501,
                title: 'Master Docker'
            }]
        };
    });

    const response = await request(app)
        .delete('/api/v1/tasks/501')
        .set('Authorization', `Bearer ${createAuthToken()}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.deletedTask.id, 501);
});

test('GET /api/v1/tasks/:id should return 404 for another user task', async (t) => {
    t.mock.method(pool, 'query', async (sql, params) => {
        assert.ok(sql.includes('WHERE id = $1 AND user_id = $2'));
        assert.deepEqual(params, ['501', '101']);

        return { rows: [] };
    });

    const response = await request(app)
        .get('/api/v1/tasks/501')
        .set('Authorization', `Bearer ${createAuthToken('101')}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
});
