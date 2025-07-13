// server.js - Your core Express application logic
// This file defines the Express app, its middleware, routes, and Mongoose models.
// It DOES NOT start the server (no app.listen) and handles database connection lazily.

require('dotenv').config(); // Good for local development/testing

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser'); // Keep this require if you use bodyParser for other things, like urlencoded
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
// const multer = require('multer'); // <--- COMMENTED OUT: LOCAL FILE UPLOADS WON'T WORK ON NETLIFY
const nodemailer = require('nodemailer');

const app = express();

// --- Middleware ---
// This middleware parses JSON bodies from incoming requests.
// It should be placed early in your middleware chain.
app.use(express.json());

// Keep CORS if your frontend and backend are on different domains (which they are with Netlify).
app.use(cors());

// Keep this if you need to parse URL-encoded bodies (e.g., from HTML forms that aren't JSON)
app.use(express.urlencoded({ extended: true }));

// app.use(express.static(path.join(__dirname, 'public'))); // <--- COMMENTED OUT: Frontend served directly by Netlify
// app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // <--- COMMENTED OUT: Local file serving won't work on Netlify


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
    recipientEmail: { type: String, default: '' }, // Added recipientEmail field
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
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const Tracking = mongoose.model('Tracking', TrackingSchema);
const User = mongoose.model('User', UserSchema);


// --- Initial Data Population Function (Exported, not automatically run by app.listen) ---
// This function can be called once, manually, or as part of a deployment script.
async function populateInitialData() {
    try {
        const existingTracking = await Tracking.findOne({ trackingId: '7770947003939' });
        if (existingTracking) {
            console.log('Tracking data already exists. Skipping initial population.');
            return;
        }

        const newTracking = new Tracking({
            trackingId: '7770947003939',
            status: 'FedEx Hub',
            statusLineColor: '#14b31e', // Green
            blinkingDotColor: '#b93737', // Red
            isBlinking: true,
            origin: 'Texas, USA',
            destination: 'Guangzhou, China',
            expectedDelivery: new Date('2025-07-13T00:00:00Z'),
            senderName: 'UNDEF Program',
            recipientName: 'David R Fox',
            recipientEmail: 'mistycpayne@gmail.com', // Added recipient email for initial data
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
    } catch (error) {
        console.error('Error populating initial data:', error);
    }
}


// --- JWT Authentication Middleware ---
console.log('Server JWT_SECRET (active):', process.env.JWT_SECRET ? 'Loaded' : 'Not Loaded'); // Improved log
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


// --- User Authentication Routes ---
app.post('/api/login', async (req, res) => {
    // --- START LOGIN REQUEST DEBUGGING ---
    console.log('Received login request. Full request object (DEBUG):', req);
    console.log('Received login request. Headers:', req.headers);
    console.log('Received login request. Raw Body from Netlify (if available):', req.rawBody);
    console.log('Received login request. Parsed Body (as Buffer/string from Netlify):', req.body);
    console.log('--- END LOGIN REQUEST DEBUGGING ---');

    let parsedBody;
    try {
        // Manually attempt to parse req.body if it's a Buffer or string
        if (Buffer.isBuffer(req.body)) {
            parsedBody = JSON.parse(req.body.toString('utf8'));
        } else if (typeof req.body === 'string') {
            // Handle cases where body might be a string (e.g., base64 encoded by Netlify)
            try {
                parsedBody = JSON.parse(req.body);
            } catch (e) {
                // If it's a base64 string, decode it first
                if (req.isBase64Encoded) { // Netlify specific property
                    const decodedBody = Buffer.from(req.body, 'base64').toString('utf8');
                    parsedBody = JSON.parse(decodedBody);
                } else {
                    throw e; // Not base64, rethrow parse error
                }
            }
        } else {
            // If express.json() *did* work correctly and it's already an object, use it directly
            parsedBody = req.body;
        }
    } catch (e) {
        console.error('Error manually parsing request body:', e);
        return res.status(400).json({ message: 'Invalid request body format (parsing error).' });
    }

    // Now, destructure username and password from the correctly parsed object
    const { username, password } = parsedBody;

    console.log('Login attempt for username (after custom parsing):', username);
    // console.log('Password received (DO NOT LOG IN PRODUCTION):', password); // Remove this line in production!

    try {
        const user = await User.findOne({ username });

        if (!user) {
            console.log('User not found for username:', username);
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        console.log('User found:', user.username);

        const isMatch = await bcrypt.compare(password, user.password);

        console.log('Password comparison result (isMatch):', isMatch);
        if (!isMatch) {
            console.log('Password mismatch for user:', username);
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ message: 'Logged in successfully!', token, role: user.role });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


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
            const effectiveDate = date !== undefined ? date : historyEvent.timestamp.toISOString().split('T')[0];
            const effectiveTime = time !== undefined ? time : historyEvent.timestamp.toISOString().split('T')[1].substring(0, 5);

            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            const timeRegex = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/;

            if (date !== undefined && !dateRegex.test(effectiveDate)) {
                console.warn(`Invalid date format for history event update: ${effectiveDate}`); // Log the invalid format
                return res.status(400).json({ message: 'Invalid date format for history event update. Expected YYYY-MM-DD.' });
            }
            if (time !== undefined && !timeRegex.test(effectiveTime)) {
                console.warn(`Invalid time format for history event update: ${effectiveTime}`); // Log the invalid format
                return res.status(400).json({ message: 'Invalid time format for history event update. Expected HH:MM.' });
            }

            newTimestamp = new Date(`${effectiveDate}T${effectiveTime}:00`);
            if (isNaN(newTimestamp.getTime())) {
                console.warn(`Could not parse combined timestamp: ${effectiveDate}T${effectiveTime}:00`);
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

            if (key === 'expectedDeliveryDate') {
                const effectiveDate = updateData.expectedDeliveryDate;
                const effectiveTime = updateData.expectedDeliveryTime || (currentTracking.expectedDelivery ? currentTracking.expectedDelivery.toISOString().split('T')[1].substring(0, 5) : '00:00');

                if (effectiveDate) {
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(effectiveDate)) {
                        console.warn(`Invalid date format for expectedDeliveryDate: ${effectiveDate}`);
                        return; // Or handle more gracefully
                    }
                    const newExpectedDelivery = new Date(`${effectiveDate}T${effectiveTime}:00`);
                    if (!isNaN(newExpectedDelivery.getTime())) {
                        currentTracking.expectedDelivery = newExpectedDelivery;
                    } else {
                        console.warn(`Could not parse new expectedDelivery: ${effectiveDate} ${effectiveTime}`);
                    }
                }
            } else if (key === 'expectedDeliveryTime') {
                if (updateData.expectedDeliveryDate === undefined) { // Only update time if date wasn't also provided
                    const effectiveDate = currentTracking.expectedDelivery ? currentTracking.expectedDelivery.toISOString().split('T')[0] : (new Date().toISOString().split('T')[0]);
                    const effectiveTime = updateData.expectedDeliveryTime;

                    if (effectiveTime) {
                        const timeRegex = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/;
                        if (!timeRegex.test(effectiveTime)) {
                            console.warn(`Invalid time format for expectedDeliveryTime: ${effectiveTime}`);
                            return; // Or handle more gracefully
                        }
                        const newExpectedDelivery = new Date(`${effectiveDate}T${effectiveTime}:00`);
                        if (!isNaN(newExpectedDelivery.getTime())) {
                            currentTracking.expectedDelivery = newExpectedDelivery;
                        } else {
                            console.warn(`Could not parse new expectedDelivery with existing date: ${effectiveDate} ${effectiveTime}`);
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

        // IMPORTANT: THIS SECTION NEEDS REFACTORING FOR CLOUD STORAGE
        // If an attached file exists, delete it from the cloud storage (e.g., S3)
        /*
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


// --- Initial User Creation ---
// IMPORTANT: This route should be protected or removed after initial admin user creation in a production environment.
// For initial setup, you might run it once and then remove/protect it.
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


// --- Serve Static HTML Files ---
// IMPORTANT: These routes are for local development ONLY.
// Netlify will serve your 'public' folder directly.
/*
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin_login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_login.html'));
});

app.get('/admin_dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
});

app.get('/track_details.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track_details.html'));
});
*/

// Universal 404 handler (optional, but good practice)
app.use((req, res, next) => {
    res.status(404).json({ message: 'Endpoint not found.' });
});


// Error handling middleware (should be last)
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error stack for debugging
    res.status(err.statusCode || 500).json({
        message: err.message || 'An unexpected error occurred on the server.',
        error: process.env.NODE_ENV === 'production' ? {} : err.stack // Avoid sending stack trace in production
    });
});

// Export the Express app instance for Netlify Function
module.exports = app;