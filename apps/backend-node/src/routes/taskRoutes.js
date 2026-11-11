
const express = require('express');

const {
    createTask,
    getTasks,
    getTaskById, updateTask, deleteTask
} = require('../controllers/taskController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all task endpoints
router.use(authenticateToken);

// Create a task
router.post('/', createTask);

// Get all tasks
router.get('/', getTasks);

// Get a specific task
router.get('/:id', getTaskById);

router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
