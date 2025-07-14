// server.js - Your core Express application logic
// This file defines the Express app, its middleware, routes, and Mongoose models.
// It DOES NOT start the server (no app.listen) and handles database connection lazily.

require('dotenv').config(); // Good for local development/testing

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer'); // Keep if you plan to use it later

const app = express();

// --- Middleware ---
// Ensure express.json() is before any routes that need JSON body parsing.
app.use(express.json());

// Enable CORS for all origins. Consider restricting this in production for security.
app.use(cors());

// If you send data from HTML forms with 'application/x-form-urlencoded' Content-Type.
// If all your front-end interactions are JSON, you might not strictly need this.
app.use(express.urlencoded({ extended: true }));

// --- Generic Request Logging Middleware ---
app.use((req, res, next) => {
    console.log(`[Express Debug] ${req.method} ${req.url}`);
    next();
});

// --- Mongoose Schemas and Models ---

const trackingHistorySchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    location: { type: String, default: '' },
    description: { type: String, required: true }
});

const TrackingSchema = new mongoose.Schema({
    trackingId: { type: String, required: true, unique: true },
    status: { type: String, required: true },
    statusLineColor: { type: String, default: '#2196F3' }, // Default blue
    blinkingDotColor: { type: String, default: '#FFFFFF' }, // Default white
    isBlinking: { type: Boolean, default: false },
    origin: { type: String, default: '' },
    destination: { type: String, default: '' },
    expectedDelivery: { type: Date },
    senderName: { type: String, default: '' },
    recipientName: { type: String, default: '' },
    packageContents: { type: String, default: '' },
    serviceType: { type: String, default: '' },
    recipientAddress: { type: String, default: '' },
    specialHandling: { type: String, default: '' },
    weight: { type: Number, default: 0 }, // in kg or lbs
    history: [trackingHistorySchema],
    attachedFileName: { type: String, default: null }, // Stores the filename (or reference like S3 key)
    lastUpdated: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'admin' } // Corrected: default 'admin'
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const Tracking = mongoose.model('Tracking', TrackingSchema);
const User = mongoose.model('User', UserSchema, 'fedex_db.users'); // Corrected collection name


// --- Initial Data Population Function (Exported, not automatically run by app.listen) ---
async function populateInitialData() {
    try {
        // Check and create initial tracking data
        const existingTracking = await Tracking.findOne({ trackingId: '7770947003939' });
        if (existingTracking) {
            console.log('Tracking data already exists. Skipping initial population.');
        } else {
            const newTracking = new Tracking({
                trackingId: '7770947003939',
                status: 'FedEx Hub',
                statusLineColor: '#14b31e', // Green
                blinkingDotColor: '#b93737', // Red
                isBlinking: true,
                origin: 'Texas, USA',
                destination: 'Guangzhou, China', // Corrected 'to' to 'destination' for consistency
                expectedDelivery: new Date('2025-07-13T00:00:00Z'),
                senderName: 'UNDEF Program',
                recipientName: 'David R Fox',
                packageContents: '$250,000 USD',
                serviceType: 'Express',
                recipientAddress: 'Hollywood, Barangay Narvarte, Nibaliw west. San Fabian, Pangasinan, Philippines ,2433.',
                specialHandling: 'Signatured Required',
                weight: 30, // kg
                history: [
                    { location: 'Origin', description: 'Shipment created' }
                ]
            });
            await newTracking.save();
            console.log('New tracking added to MongoDB:', newTracking.toObject());
        }

        // Check and create admin user
        const adminUserExists = await User.findOne({ username: 'admin' });
        if (!adminUserExists) {
            const adminUser = new User({
                username: 'admin',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'adminpass', // Use env var or default
                role: 'admin'
            });
            await adminUser.save();
            console.log('Default admin user created with username "admin".');
            console.log('PLEASE CHANGE THE DEFAULT_ADMIN_PASSWORD IN YOUR .env FILE FOR SECURITY.');
        } else {
            console.log('Admin user "admin" already exists.');
        }

    } catch (error) {
        console.error('Error populating initial data:', error);
    }
}


// --- JWT Authentication Middleware ---
console.log('Server JWT_SECRET (active):', process.env.JWT_SECRET ? 'Loaded' : 'Not Loaded');
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: 'Token required.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired. Please log in again.' });
            }
            return res.status(403).json({ message: 'Invalid token.' });
        }
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }
    });
};


// --- API Routes ---

// Public endpoint to get tracking details
app.get('/api/track/:trackingId', async (req, res) => {
    try {
        const trackingId = req.params.trackingId;
        const trackingDetails = await Tracking.findOne({ trackingId: trackingId });

        if (!trackingDetails) {
            return res.status(404).json({ message: 'Tracking ID not found.' });
        }

        // Return only necessary public details, NO sensitive info
        const publicDetails = {
            trackingId: trackingDetails.trackingId,
            status: trackingDetails.status,
            statusLineColor: trackingDetails.statusLineColor,
            blinkingDotColor: trackingDetails.blinkingDotColor,
            isBlinking: trackingDetails.isBlinking,
            origin: trackingDetails.origin,
            destination: trackingDetails.destination,
            expectedDelivery: trackingDetails.expectedDelivery,
            senderName: trackingDetails.senderName,
            recipientName: trackingDetails.recipientName,
            packageContents: trackingDetails.packageContents,
            serviceType: trackingDetails.serviceType,
            recipientAddress: trackingDetails.recipientAddress,
            specialHandling: trackingDetails.specialHandling,
            weight: trackingDetails.weight,
            history: trackingDetails.history.map(item => ({
                timestamp: item.timestamp,
                location: item.location,
                description: item.description,
            })),
            attachedFileName: trackingDetails.attachedFileName,
            lastUpdated: trackingDetails.lastUpdated
        };

        res.json(publicDetails);

    } catch (error) {
        console.error('Error fetching public tracking details:', error);
        res.status(500).json({ message: 'Server error while fetching tracking details.' });
    }
});


// Admin Route: Get all tracking records
app.get('/api/admin/trackings', authenticateAdmin, async (req, res) => {
    try {
        console.log('Received GET /api/admin/trackings request.');
        const trackings = await Tracking.find({});
        res.json(trackings);
    } catch (error) {
        console.error('Error fetching all trackings for admin:', error);
        res.status(500).json({ message: 'Server error while fetching all trackings.', error: error.message });
    }
});

// Admin Route: Get a single tracking record by ID
app.get('/api/admin/trackings/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Received GET /api/admin/trackings/${id} request.`);

        const tracking = await Tracking.findById(id);

        if (!tracking) {
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        res.json(tracking); // Return the full tracking object for admin
    } catch (error) {
        console.error(`Error fetching single tracking ${req.params.id} for admin:`, error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid tracking ID format.' });
        }
        res.status(500).json({ message: 'Server error while fetching single tracking details.', error: error.message });
    }
});

// Admin Route: Get dashboard statistics
app.get('/api/admin/dashboard-stats', authenticateAdmin, async (req, res) => {
    try {
        console.log('Received GET /api/admin/dashboard-stats request.');
        const totalTrackings = await Tracking.countDocuments({});
        const deliveredTrackings = await Tracking.countDocuments({ status: 'Delivered' });
        const inTransitTrackings = await Tracking.countDocuments({
            status: { $nin: ['Delivered', 'Cancelled', 'On Hold'] } // Assuming these are not in transit
        });
        const onHoldTrackings = await Tracking.countDocuments({ status: 'On Hold' });

        res.json({
            totalTrackings,
            deliveredTrackings,
            inTransitTrackings,
            onHoldTrackings,
            // Add more stats as needed (e.g., last 7 days, by origin/destination)
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server error while fetching dashboard statistics.', error: error.message });
    }
});

// POST /admin/trackings - Create a new tracking record (Admin only)
app.post('/api/admin/trackings', authenticateAdmin, async (req, res) => {
    try {
        console.log('Received POST /api/admin/trackings request. Body:', req.body); // Log the body for debugging
        const {
            trackingId,
            status,
            statusLineColor,
            blinkingDotColor,
            isBlinking,
            origin,
            destination,
            expectedDelivery,
            senderName,
            recipientName,
            packageContents,
            serviceType,
            recipientAddress,
            specialHandling,
            weight,
            history
        } = req.body;

        // Basic validation (you might want more robust validation)
        if (!trackingId || !status) {
            return res.status(400).json({ message: 'Tracking ID and Status are required.' });
        }

        // Check if trackingId already exists
        const existingTracking = await Tracking.findOne({ trackingId });
        if (existingTracking) {
            return res.status(409).json({ message: 'Tracking ID already exists.' });
        }

        const newTracking = new Tracking({
            trackingId,
            status,
            statusLineColor: statusLineColor || '#2196F3',
            blinkingDotColor: blinkingDotColor || '#FFFFFF',
            isBlinking: typeof isBlinking === 'boolean' ? isBlinking : false,
            origin,
            destination,
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
            senderName,
            recipientName,
            packageContents,
            serviceType,
            recipientAddress,
            specialHandling,
            weight: parseFloat(weight) || 0,
            history: history && Array.isArray(history) ? history : [{ description: 'Shipment created', location: origin || 'Unknown' }],
            lastUpdated: new Date()
        });

        await newTracking.save();
        res.status(201).json({ message: 'Tracking record created successfully!', tracking: newTracking });

    } catch (error) {
        console.error('Error adding new tracking record:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message, errors: error.errors });
        }
        res.status(500).json({ message: 'Server error while creating tracking record.', error: error.message });
    }
});


// Helper function to parse time including AM/PM
function parseTimeWithAmPm(timeStr) {
    const timeRegex12Hr = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
    const timeRegex24Hr = /^(\d{2}):(\d{2})$/;

    let match = timeStr.match(timeRegex12Hr);
    if (match) {
        let hour = parseInt(match[1], 10);
        let minute = parseInt(match[2], 10);
        const ampm = match[3] ? match[3].toUpperCase() : '';

        if (ampm === 'PM' && hour < 12) {
            hour += 12;
        } else if (ampm === 'AM' && hour === 12) {
            hour = 0;
        }

        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return null;
        }
        return { hour, minute };
    }

    match = timeStr.match(timeRegex24Hr);
    if (match) {
        let hour = parseInt(match[1], 10);
        let minute = parseInt(match[2], 10);
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return null;
        }
        return { hour, minute };
    }

    return null;
}


// Edit a specific history event
app.put('/api/admin/trackings/:id/history/:historyId', authenticateAdmin, async (req, res) => {
    const { id, historyId } = req.params;
    const { date, time, location, description } = req.body;

    if (date === undefined && time === undefined && location === undefined && description === undefined) {
        return res.status(400).json({ message: 'At least one field (date, time, location, or description) is required to update a history event.' });
    }

    try {
        const tracking = await Tracking.findById(id);

        if (!tracking) {
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        const historyEvent = tracking.history.id(historyId);

        if (!historyEvent) {
            return res.status(404).json({ message: 'History event not found.' });
        }

        if (location !== undefined) historyEvent.location = location;
        if (description !== undefined) historyEvent.description = description;

        let newTimestamp;
        if (date !== undefined || time !== undefined) {
            const existingDateISO = historyEvent.timestamp.toISOString().split('T')[0];
            const existingTimeISO = historyEvent.timestamp.toISOString().split('T')[1].substring(0, 5);

            const effectiveDate = date !== undefined ? date : existingDateISO;
            const effectiveTimeInput = time !== undefined ? time : existingTimeISO;

            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(effectiveDate)) {
                console.warn(`Invalid date format for history event update: ${effectiveDate}`);
                return res.status(400).json({ message: 'Invalid date format for history event update. Expected YYYY-MM-DD.' });
            }

            const parsedTime = parseTimeWithAmPm(effectiveTimeInput);
            if (!parsedTime) {
                console.warn(`Invalid time format for history event update: ${effectiveTimeInput}`);
                return res.status(400).json({ message: 'Invalid time format for history event update. Expected HH:MM or HH:MM AM/PM.' });
            }

            newTimestamp = new Date(Date.UTC(
                new Date(effectiveDate).getUTCFullYear(),
                new Date(effectiveDate).getUTCMonth(),
                new Date(effectiveDate).getUTCDate(),
                parsedTime.hour,
                parsedTime.minute
            ));

            if (isNaN(newTimestamp.getTime())) {
                console.warn(`Could not parse combined timestamp from admin input: ${effectiveDate} ${effectiveTimeInput}`);
                return res.status(400).json({ message: 'Invalid date or time provided for history event update.' });
            }
            historyEvent.timestamp = newTimestamp;
        }

        tracking.history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        tracking.lastUpdated = new Date();
        await tracking.save();

        res.json({ message: 'History event updated successfully!', historyEvent: historyEvent.toObject() });
    } catch (error) {
        console.error(`Error updating history event ${historyId} for tracking ID ${id}:`, error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid ID format for tracking or history event.' });
        }
        res.status(500).json({ message: 'Server error while updating history event.', error: error.message });
    }
});


// Admin Route to Update Tracking Details (general updates, including trackingId change)
app.put('/api/admin/trackings/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        let currentTracking = await Tracking.findById(id);

        if (!currentTracking) {
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        if (updateData.trackingId && updateData.trackingId !== currentTracking.trackingId) {
            const newTrackingId = updateData.trackingId;

            const existingTrackingWithNewId = await Tracking.findOne({ trackingId: newTrackingId });
            if (existingTrackingWithNewId && String(existingTrackingWithNewId._id) !== id) {
                return res.status(409).json({ message: 'New Tracking ID already exists. Please choose a different one.' });
            }
            currentTracking.trackingId = newTrackingId;
            console.log(`Tracking ID changed from (old): ${currentTracking.trackingId} to (new): ${newTrackingId}`);
        }

        Object.keys(updateData).forEach(key => {
            if (key === 'trackingId' || key === 'history' || key === '_id' || key === '__v' || updateData[key] === undefined) {
                return;
            }
            // Block updating recipientEmail if it's sent in the payload for this PUT route
            if (key === 'recipientEmail') {
                console.warn('Attempt to update recipientEmail via PUT /api/admin/trackings/:id ignored.');
                return;
            }

            if (key === 'expectedDeliveryDate') {
                const effectiveDate = updateData.expectedDeliveryDate;
                const effectiveTimeInput = updateData.expectedDeliveryTime || (currentTracking.expectedDelivery ? currentTracking.expectedDelivery.toISOString().split('T')[1].substring(0, 5) : '00:00');

                if (effectiveDate) {
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(effectiveDate)) {
                        console.warn(`Invalid date format for expectedDeliveryDate: ${effectiveDate}`);
                        return;
                    }
                    const parsedTime = parseTimeWithAmPm(effectiveTimeInput);
                    if (!parsedTime) {
                        console.warn(`Could not parse expectedDeliveryTime for combined timestamp: ${effectiveTimeInput}`);
                        return;
                    }

                    const newExpectedDelivery = new Date(Date.UTC(
                        new Date(effectiveDate).getUTCFullYear(),
                        new Date(effectiveDate).getUTCMonth(),
                        new Date(effectiveDate).getUTCDate(),
                        parsedTime.hour,
                        parsedTime.minute
                    ));

                    if (!isNaN(newExpectedDelivery.getTime())) {
                        currentTracking.expectedDelivery = newExpectedDelivery;
                    } else {
                        console.warn(`Could not parse new expectedDelivery with existing date: ${effectiveDate} ${effectiveTimeInput}`);
                    }
                }
            } else if (key === 'expectedDeliveryTime') {
                if (updateData.expectedDeliveryDate === undefined) { // Only update time if date wasn't also provided
                    const effectiveDate = currentTracking.expectedDelivery ? currentTracking.expectedDelivery.toISOString().split('T')[0] : (new Date().toISOString().split('T')[0]);
                    const effectiveTimeInput = updateData.expectedDeliveryTime;

                    if (effectiveTimeInput) {
                        const parsedTime = parseTimeWithAmPm(effectiveTimeInput);
                        if (!parsedTime) {
                            console.warn(`Invalid time format for expectedDeliveryTime: ${effectiveTimeInput}`);
                            return;
                        }
                        const newExpectedDelivery = new Date(Date.UTC(
                            new Date(effectiveDate).getUTCFullYear(),
                            new Date(effectiveDate).getUTCMonth(),
                            new Date(effectiveDate).getUTCDate(),
                            parsedTime.hour,
                            parsedTime.minute
                        ));
                        if (!isNaN(newExpectedDelivery.getTime())) {
                            currentTracking.expectedDelivery = newExpectedDelivery;
                        } else {
                            console.warn(`Could not parse new expectedDelivery with existing date: ${effectiveDate} ${effectiveTimeInput}`);
                        }
                    }
                }
            } else if (key === 'isBlinking') {
                currentTracking.isBlinking = typeof updateData[key] === 'boolean' ? updateData[key] : currentTracking.isBlinking;
            } else if (key === 'weight') {
                currentTracking.weight = parseFloat(updateData.weight) || 0;
            } else {
                currentTracking[key] = updateData[key];
            }
        });

        currentTracking.lastUpdated = new Date();
        await currentTracking.save();
        res.json({ message: 'Tracking updated successfully!', tracking: currentTracking });
    } catch (error) {
        console.error('Error updating tracking details:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid tracking ID format.' });
        }
        res.status(500).json({ message: 'Server error when updating tracking details.', error: error.message });
    }
});
// Delete a specific history event by _id
app.delete('/api/admin/trackings/:id/history/:historyId', authenticateAdmin, async (req, res) => {
    const { id, historyId } = req.params;

    try {
        const tracking = await Tracking.findById(id);
        if (!tracking) {
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        const historyLengthBeforePull = tracking.history.length;
        tracking.history.pull({ _id: historyId });

        if (tracking.history.length === historyLengthBeforePull) {
            return res.status(404).json({ message: 'History event not found with the provided ID.' });
        }

        tracking.lastUpdated = new Date();
        await tracking.save();
        res.json({ message: 'History event deleted successfully!', tracking });
    } catch (error) {
        console.error('Error deleting history event:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid ID format for tracking or history event.' });
        }
        res.status(500).json({ message: 'Server error while deleting history event.', error: error.message });
    }
});


// Delete an entire tracking record
app.delete('/api/admin/trackings/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const trackingToDelete = await Tracking.findById(id);
        if (!trackingToDelete) {
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        /*
        // IMPORTANT: THIS SECTION NEEDS REFACTORING FOR CLOUD STORAGE (e.g., S3)
        // If an attached file exists, delete it from the cloud storage (e.g., S3)
        if (trackingToDelete.attachedFileName) {
            // Example for S3 deletion (requires S3 SDK setup)
            // const s3Key = trackingToDelete.attachedFileName;
            // await s3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: s3Key }).promise();
            console.log(`Placeholder: Would delete file from cloud storage: ${trackingToDelete.attachedFileName}`);
        }
        */

        const result = await Tracking.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Tracking record not found.' });
        }
        res.json({ message: 'Tracking deleted successfully!' });
    } catch (error) {
        console.error('Error deleting tracking:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid tracking ID format.' });
        }
        res.status(500).json({ message: 'Error deleting tracking data.', error: error.message });
    }
});


// --- Initial User Creation (Admin only) ---
app.post('/api/admin/create-user', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists.' });
        }

        if (role && !['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified. Must be "user" or "admin".' });
        }

        const newUser = new User({ username, password, role: role || 'user' });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully!', user: { username: newUser.username, role: newUser.role } });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user.' });
    }
});

// User Login (Public Endpoint)
app.post('/api/login', async (req, res) => {
    console.log('--- RECEIVED LOGIN REQUEST ---');
    console.log('Request body BEFORE any custom parsing (from Express):', req.body);
    console.log('Type of req.body BEFORE any custom parsing (from Express):', typeof req.body);
    console.log('Is req.body an object and not null BEFORE any custom parsing (from Express)?', typeof req.body === 'object' && req.body !== null);

    let requestBody;

    // Check if req.body is already a plain object with 'username' or if it's a Buffer that needs parsing
    if (typeof req.body === 'object' && req.body !== null && !req.body.username && req.body instanceof Buffer) {
        try {
            // Attempt to convert buffer to string and then parse JSON
            requestBody = JSON.parse(req.body.toString('utf8'));
            console.log('Request body AFTER manual .toString() and JSON.parse:', requestBody);
        } catch (parseError) {
            console.error('Error manually parsing request body:', parseError);
            return res.status(400).json({ message: 'Invalid request body format.' });
        }
    } else {
        // If express.json() already parsed it, or it's not a buffer, use it directly
        requestBody = req.body;
        console.log('Request body used directly (assumed parsed by express.json() or non-Buffer):', requestBody);
    }

    const { username, password } = requestBody; // Destructure from requestBody, not req.body

    console.log('Extracted username:', username);
    console.log('Extracted password (first few chars):', password ? password.substring(0, 5) + '...' : 'null/undefined');

    if (!username || !password) {
        console.log('Login failed: Username or password missing');
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try { // This is the main try block for the route
        // Your debug logs before the findOne call
        console.log(`[DEBUG] Attempting User.findOne for username: "${username}"`);
        const user = await User.findOne({ username });
        console.log(`[DEBUG] Result of User.findOne for "${username}":`, user ? `User found with ID: ${user._id} and role: ${user.role}` : 'No user document found.');

        if (!user) {
            console.log('Login failed: User not found for username:', username);
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Login failed: Password mismatch for user:', username);
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Login successful for user:', username, 'Role:', user.role);
        res.json({ message: 'Login successful!', token, role: user.role });
    } catch (error) { // This catch block correctly handles errors for the entire route's logic
        console.error('Error during login route execution:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


// --- Serve Static Files (IMPORTANT for Netlify Functions) ---
// Netlify automatically serves files from your 'public' folder.
// If your HTML/CSS/JS are directly in the project root, this also helps for local dev.
// For Netlify Functions, it primarily serves the function itself.
// Client-side routes (like /admin_dashboard.html) need to be handled by Netlify's redirects
// or by serving a single-page app's index.html for all non-API routes.
app.use(express.static(path.join(__dirname, 'public'))); // Assuming a 'public' folder for your frontend assets
app.use(express.static(__dirname)); // Fallback if files like admin_login.html are in the root


// --- Universal 404 Handler ---
// This should be after all your API routes and static file serving.
app.use((req, res, next) => {
    // If the request path does not start with /api, and it's not a static file,
    // you might want to serve your main HTML file for client-side routing.
    // For Netlify Functions, this typically means a catch-all.
    if (!req.path.startsWith('/api/') && !req.path.includes('.')) { // Avoid redirecting known file types or API calls
        // For Single Page Applications, redirect all non-API routes to index.html
        // You'll likely need a Netlify _redirects file for this as well for deployment
        // E.g., /* /index.html 200
        // For now, return a 404 for clarity.
        res.status(404).json({ message: 'The requested page or API endpoint was not found.' });
    } else {
        // For other unmatched requests (e.g., missing static files), return a standard 404
        res.status(404).json({ message: 'Endpoint not found.' });
    }
});


// --- Global Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR HANDLER:', err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'An unexpected server error occurred.',
        // Only send stack trace in development for security
        error: process.env.NODE_ENV === 'production' ? {} : err.stack
    });
});


// Export the Express app instance for Netlify Function
module.exports = app;