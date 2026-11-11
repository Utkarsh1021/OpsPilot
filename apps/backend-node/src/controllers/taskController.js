
const pool = require('../config/db');

const createTask = async (req, res) => {
    try {
        const {
            title,
            description,
            priority = 'medium',
            category_id,
            due_date
        } = req.body;

        // Validate title
        if (typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Task title is required'
            });
        }

        if (title.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: 'Task title cannot exceed 200 characters'
            });
        }

        // Validate description
        if (
            description !== undefined &&
            description !== null &&
            (typeof description !== 'string' || description.length > 5000)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Description must be text and cannot exceed 5000 characters'
            });
        }

        // Validate priority
        if (!['low', 'medium', 'high'].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: 'Priority must be low, medium or high'
            });
        }

        // Validate category ID
        if (
            category_id !== undefined &&
            category_id !== null &&
            (!Number.isSafeInteger(category_id) || category_id <= 0)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Category ID must be a positive integer'
            });
        }

        // Validate due date
        if (due_date !== undefined && due_date !== null) {
            if (
                typeof due_date !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(due_date) ||
                Number.isNaN(Date.parse(due_date))
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Due date must be a valid date'
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO tasks
                (user_id, title, description, priority, category_id, due_date)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, title, description, status, priority,
                       category_id, due_date, created_at, updated_at`,
            [
                req.user.userId,
                title.trim(),
                description?.trim() || null,
                priority,
                category_id ?? null,
                due_date ?? null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Task created successfully',
            task: result.rows[0]
        });

    } catch (error) {
        console.error('Create task error:', error.message);

        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Invalid category'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


const getTasks = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                title,
                description,
                status,
                priority,
                category_id,
                due_date,
                created_at,
                updated_at
             FROM tasks
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.userId]
        );

        return res.status(200).json({
            success: true,
            message: 'Tasks retrieved successfully',
            count: result.rows.length,
            tasks: result.rows
        });

    } catch (error) {
        console.error('Get tasks error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const result = await pool.query(
            `SELECT
                id,
                title,
                description,
                status,
                priority,
                category_id,
                due_date,
                created_at,
                updated_at
             FROM tasks
             WHERE id = $1 AND user_id = $2`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Task retrieved successfully',
            task: result.rows[0]
        });

    } catch (error) {
        console.error('Get task by ID error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


const updateTask = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const {
            title,
            description,
            status,
            priority,
            category_id,
            due_date
        } = req.body;

        // Only allow supported fields
        const allowedFields = [
            'title',
            'description',
            'status',
            'priority',
            'category_id',
            'due_date'
        ];

        const providedFields = Object.keys(req.body);

        if (
            providedFields.length === 0 ||
            providedFields.some(field => !allowedFields.includes(field))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Provide at least one valid task field to update'
            });
        }

        // Validate title
        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Title must be a non-empty string'
                });
            }

            if (title.trim().length > 200) {
                return res.status(400).json({
                    success: false,
                    message: 'Title cannot exceed 200 characters'
                });
            }
        }

        // Validate description
        if (
            description !== undefined &&
            description !== null &&
            (typeof description !== 'string' || description.length > 5000)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Description must be text and cannot exceed 5000 characters'
            });
        }

        // Validate status
        if (
            status !== undefined &&
            !['pending', 'in_progress', 'completed'].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task status'
            });
        }

        // Validate priority
        if (
            priority !== undefined &&
            !['low', 'medium', 'high'].includes(priority)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task priority'
            });
        }

        // Validate category ID
        if (
            category_id !== undefined &&
            category_id !== null &&
            (!Number.isSafeInteger(category_id) || category_id <= 0)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Category ID must be a positive integer'
            });
        }

        // Validate due date
        if (due_date !== undefined && due_date !== null) {
            if (
                typeof due_date !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(due_date) ||
                Number.isNaN(Date.parse(due_date))
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Due date must be a valid date'
                });
            }
        }

        // Update only the fields supplied by the client
        const result = await pool.query(
            `UPDATE tasks
             SET
                title = COALESCE($1, title),
                description = CASE WHEN $2 THEN $3 ELSE description END,
                status = COALESCE($4, status),
                priority = COALESCE($5, priority),
                category_id = CASE WHEN $6 THEN $7 ELSE category_id END,
                due_date = CASE WHEN $8 THEN $9 ELSE due_date END,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $10 AND user_id = $11
             RETURNING id, title, description, status, priority,
                       category_id, due_date, created_at, updated_at`,
            [
                title === undefined ? null : title.trim(),
                description !== undefined,
                description === undefined ? null : description,
                status ?? null,
                priority ?? null,
                category_id !== undefined,
                category_id ?? null,
                due_date !== undefined,
                due_date ?? null,
                id,
                req.user.userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            task: result.rows[0]
        });

    } catch (error) {
        console.error('Update task error:', error.message);

        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Invalid category'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate task ID
        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        // Delete only if the task belongs to the authenticated user
        const result = await pool.query(
            `DELETE FROM tasks
             WHERE id = $1 AND user_id = $2
             RETURNING id, title`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Task deleted successfully',
            deletedTask: result.rows[0]
        });

    } catch (error) {
        console.error('Delete task error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};



module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
