// server.js
require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000; // Or any other port

// CORS middleware to allow requests from your frontend
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Error executing query', err.stack);
        }
        console.log('Successfully connected to PostgreSQL at:', result.rows[0].now);
    });
});

// --- API Route for Tracking Details ---
app.get('/api/track/:trackingId', async (req, res) => {
    const { trackingId } = req.params;

    try {
        const result = await pool.query(
            `SELECT
                t.tracking_id,
                t.status,
                t.expected_delivery,
                t.sender_name,
                t.origin_location,
                t.package_contents,
                t.weight_kg,
                t.service_type,
                t.special_handling,
                t.recipient_name,
                t.recipient_address,
                t.status_line_color,
                t.blinking_dot_color,
                t.is_blinking,
                ARRAY_AGG(
                    JSON_BUILD_OBJECT(
                        'timestamp', h.timestamp,
                        'description', h.description,
                        'location', h.location
                    ) ORDER BY h.timestamp DESC
                ) AS history
            FROM
                trackings t
            LEFT JOIN
                tracking_history h ON t.tracking_id = h.tracking_id
            WHERE
                t.tracking_id = $1
            GROUP BY
                t.tracking_id, t.status, t.expected_delivery, t.sender_name, t.origin_location,
                t.package_contents, t.weight_kg, t.service_type, t.special_handling,
                t.recipient_name, t.recipient_address, t.status_line_color,
                t.blinking_dot_color, t.is_blinking;`,
            [trackingId]
        );

        if (result.rows.length > 0) {
            const trackingData = result.rows[0];
            // If there's no history, ARRAY_AGG will return [null] or an empty array depending on PostgreSQL version/config.
            // Normalize it to an empty array if null is present.
            if (trackingData.history && trackingData.history.length > 0 && trackingData.history[0] === null) {
                trackingData.history = [];
            }
            res.json(trackingData);
        } else {
            res.status(404).json({ message: 'Tracking ID not found.' });
        }
    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
});

// --- Optional: Route to add a new tracking entry (for demonstration) ---
app.post('/api/track', async (req, res) => {
    const {
        trackingId, status, expectedDelivery, senderName, originLocation,
        packageContents, weight, serviceType, specialHandling,
        recipientName, recipientAddress, statusLineColor, blinkingDotColor, isBlinking, history
    } = req.body;

    try {
        await pool.query('BEGIN'); // Start transaction

        await pool.query(
            `INSERT INTO trackings (
                tracking_id, status, expected_delivery, sender_name, origin_location,
                package_contents, weight_kg, service_type, special_handling,
                recipient_name, recipient_address, status_line_color, blinking_dot_color, is_blinking
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (tracking_id) DO UPDATE SET
                status = EXCLUDED.status,
                expected_delivery = EXCLUDED.expected_delivery,
                sender_name = EXCLUDED.sender_name,
                origin_location = EXCLUDED.origin_location,
                package_contents = EXCLUDED.package_contents,
                weight_kg = EXCLUDED.weight_kg,
                service_type = EXCLUDED.service_type,
                special_handling = EXCLUDED.special_handling,
                recipient_name = EXCLUDED.recipient_name,
                recipient_address = EXCLUDED.recipient_address,
                status_line_color = EXCLUDED.status_line_color,
                blinking_dot_color = EXCLUDED.blinking_dot_color,
                is_blinking = EXCLUDED.is_blinking;`,
            [
                trackingId, status, expectedDelivery, senderName, originLocation,
                packageContents, weight, serviceType, specialHandling,
                recipientName, recipientAddress, statusLineColor, blinkingDotColor, isBlinking
            ]
        );

        // Clear existing history for this tracking ID before inserting new ones (simple update strategy)
        await pool.query('DELETE FROM tracking_history WHERE tracking_id = $1', [trackingId]);

        if (history && history.length > 0) {
            for (const item of history) {
                await pool.query(
                    `INSERT INTO tracking_history (tracking_id, timestamp, description, location)
                    VALUES ($1, $2, $3, $4);`,
                    [trackingId, item.timestamp, item.description, item.location]
                );
            }
        }

        await pool.query('COMMIT'); // Commit transaction
        res.status(201).json({ message: 'Tracking data saved successfully!', trackingId });

    } catch (error) {
        await pool.query('ROLLBACK'); // Rollback transaction on error
        console.error('Error saving tracking data:', error);
        res.status(500).json({ message: 'Error saving tracking data.', error: error.message });
    }
});


app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
