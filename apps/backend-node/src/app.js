
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./config/db');
const app = express();
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);

app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'OpsPilot API is running',
        service: 'TaskFlow Backend',
        timestamp: new Date().toISOString()
    });
});


app.get('/api/v1/instance', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Request handled by backend instance',
        instance: require('os').hostname(),
        timestamp: new Date().toISOString()
    });
});


app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Welcome to TaskFlow API',
        documentation: '/api/v1/health'
    });
});
app.get('/api/v1/health/db', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT current_database() AS database, NOW() AS server_time'
        );

        res.status(200).json({
            success: true,
            message: 'Database connection successful',
            database: result.rows[0].database,
            timestamp: result.rows[0].server_time
        });

    } catch (error) {
        console.error('Database health check failed:', error.message);

        res.status(503).json({
            success: false,
            message: 'Database connection unavailable'
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

module.exports = app;
