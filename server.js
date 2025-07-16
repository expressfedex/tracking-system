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
const nodemailer = require('nodemailer');
const multer = require('multer'); // <--- NEW: Import multer

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// --- Generic Request Logging Middleware ---
app.use((req, res, next) => {
    console.log(`[Express Debug] ${req.method} ${req.url}`);
    next();
});

// --- Multer Setup for file uploads ---
// Configure storage: using memory storage is often best for Netlify Functions
// as functions are stateless and don't have a persistent file system.
const upload = multer({
    storage: multer.memoryStorage(), // Store the file in memory as a Buffer
    limits: {
        fileSize: 5 * 1024 * 1024, // Limit file size to 5MB (adjust as needed)
    },
    fileFilter: (req, file, cb) => {
        // Optional: Filter file types
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype.includes('document')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
        }
    }
});


// --- Mongoose Models ---
// Your schema definitions here...
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
    recipientEmail: { type: String, default: '' },
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
    role: { type: String, enum: ['user', 'admin'], default: 'admin' }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const Tracking = mongoose.model('Tracking', TrackingSchema);
const User = mongoose.model('User', UserSchema, 'users');

// --- Initial Data Population Function (Exported, not automatically run by app.listen) ---
async function populateInitialData() {
    try {
        const existingTracking = await Tracking.findOne({ trackingId: '7770947003939' });
        if (existingTracking) {
            console.log('Tracking data already exists. Skipping initial population.');
        } else {
            const newTracking = new Tracking({
                trackingId: '7770947003939',
                status: 'FedEx Hub',
                statusLineColor: '#14b31e',
                blinkingDotColor: '#b93737',
                isBlinking: true,
                origin: 'Texas, USA',
                destination: 'Guangzhou, China',
                expectedDelivery: new Date('2025-07-13T00:00:00Z'),
                senderName: 'UNDEF Program',
                recipientName: 'David R Fox',
                packageContents: '$250,000 USD',
                serviceType: 'Express',
                recipientAddress: 'Hollywood, Barangay Narvarte, Nibaliw west. San Fabian, Pangasinan, Philippines ,2433.',
                specialHandling: 'Signatured Required',
                weight: 30,
                history: [
                    { location: 'Origin', description: 'Shipment created' }
                ]
            });
            await newTracking.save();
            console.log('New tracking added to MongoDB:', newTracking.toObject());
        }

        const adminUserExists = await User.findOne({ username: 'admin' });
        if (!adminUserExists) {
            const adminUser = new User({
                username: 'admin',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'adminpass',
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
    console.log('Backend: Received Authorization header:', authHeader);
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Backend: Extracted token:', token);

    if (token == null) {
        console.log('Backend: Token is null or undefined, returning 401.');
        return res.status(401).json({ message: 'Token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired. Please log in again.' });
            }
            if (err.name === 'JsonWebTokenError' && err.message === 'jwt malformed') {
                console.error('Backend: Received a malformed JWT. Check frontend token storage/transmission.');
            }
            return res.status(403).json({ message: 'Invalid token.' });
        }
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    console.log('Backend: authenticateAdmin middleware triggered.');
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

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

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
            recipientEmail: trackingDetails.recipientEmail,
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
            status: { $nin: ['Delivered', 'Cancelled', 'On Hold'] }
        });
        const onHoldTrackings = await Tracking.countDocuments({ status: 'On Hold' });

        res.json({
            totalTrackings,
            deliveredTrackings,
            inTransitTrackings,
            onHoldTrackings,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server error while fetching dashboard statistics.', error: error.message });
    }
});

// POST /admin/trackings - Create a new tracking record (Admin only)
// Note: This route still expects JSON data, not multipart/form-data.
// If your 'create new tracking' form also sends files, you'll need multer here too.
app.post('/api/admin/trackings', authenticateAdmin, async (req, res) => {
    try {
        console.log('Received POST /api/admin/trackings request. Initial req.body:', req.body);
        console.log('Type of req.body:', typeof req.body);
        console.log('Is req.rawBody present and type:', req.rawBody ? typeof req.rawBody : 'not present');

        let bodyData = req.body;

        // This workaround is for JSON bodies that might arrive as Buffers in serverless.
        // It's still relevant if this route consistently receives JSON.
        if (bodyData instanceof Buffer) {
            console.log('req.body is a Buffer, attempting to parse it as JSON...');
            try {
                bodyData = JSON.parse(bodyData.toString('utf8'));
                console.log('Successfully parsed req.body from Buffer:', bodyData);
            } catch (parseError) {
                console.error('Failed to parse req.body Buffer as JSON:', parseError);
                return res.status(400).json({ message: 'Invalid JSON body from Buffer parsing.' });
            }
        } else if (typeof bodyData === 'object' && bodyData !== null && Object.keys(bodyData).length === 0 && req.rawBody && req.rawBody instanceof Buffer) {
            console.log('req.body was an empty object, but not a Buffer. Checking for req.rawBody...');
            try {
                bodyData = JSON.parse(req.rawBody.toString('utf8'));
                console.log('Successfully parsed from req.rawBody:', bodyData);
            } catch (parseError) {
                console.error('Failed to parse req.rawBody as JSON:', parseError);
                return res.status(400).json({ message: 'Invalid JSON body in rawBody.' });
            }
        }
        
        const {
            trackingId,
            status,
            statusLineColor,
            blinkingDotColor,
            isBlinking,
            origin,
            destination,
            senderName,
            recipientName,
            recipientEmail,
            packageContents,
            serviceType,
            recipientAddress,
            specialHandling,
            weight,
            history,
            expectedDeliveryDate,
            expectedDeliveryTime
        } = bodyData;

        if (!trackingId || !status) {
            console.error('Validation failed: Tracking ID or Status is missing. Tracking ID:', trackingId, 'Status:', status);
            return res.status(400).json({ message: 'Tracking ID and Status are required.' });
        }

        const existingTracking = await Tracking.findOne({ trackingId });
        if (existingTracking) {
            return res.status(409).json({ message: 'Tracking ID already exists.' });
        }

        let finalExpectedDelivery;
        if (expectedDeliveryDate) {
            const effectiveDate = expectedDeliveryDate;
            const effectiveTimeInput = expectedDeliveryTime || '00:00';
            const parsedTime = parseTimeWithAmPm(effectiveTimeInput);

            if (parsedTime) {
                finalExpectedDelivery = new Date(Date.UTC(
                    new Date(effectiveDate).getUTCFullYear(),
                    new Date(effectiveDate).getUTCMonth(),
                    new Date(effectiveDate).getUTCDate(),
                    parsedTime.hour,
                    parsedTime.minute
                ));
                if (isNaN(finalExpectedDelivery.getTime())) {
                    console.warn(`Could not parse combined expected delivery date/time: ${effectiveDate} ${effectiveTimeInput}`);
                    finalExpectedDelivery = undefined;
                }
            } else {
                console.warn(`Invalid time format for expectedDeliveryTime: ${effectiveTimeInput}`);
            }
        }

        const newTracking = new Tracking({
            trackingId,
            status,
            statusLineColor: statusLineColor || '#2196F3',
            blinkingDotColor: blinkingDotColor || '#FFFFFF',
            isBlinking: typeof isBlinking === 'boolean' ? isBlinking : false,
            origin,
            destination,
            expectedDelivery: finalExpectedDelivery,
            senderName,
            recipientName,
            recipientEmail,
            packageContents,
            serviceType,
            recipientAddress,
            specialHandling,
            weight: parseFloat(weight) || 0,
            history: history && Array.isArray(history) ? history : [],
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
function parseTimeWithAmPm(timeString) {
    const timeRegex24 = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/; // HH:MM (24-hour)
    const timeRegex12 = /^([0]?[1-9]|1[0-2]):([0-5][0-9])\s*([APap][Mm])$/; // HH:MM AM/PM

    let match24 = timeString.match(timeRegex24);
    if (match24) {
        return { hour: parseInt(match24[1], 10), minute: parseInt(match24[2], 10) };
    }

    let match12 = timeString.match(timeRegex12);
    if (match12) {
        let hour = parseInt(match12[1], 10);
        let minute = parseInt(match12[2], 10);
        const ampm = match12[3].toLowerCase();

        if (ampm === 'pm' && hour !== 12) {
            hour += 12;
        } else if (ampm === 'am' && hour === 12) {
            hour = 0; // Midnight (12 AM)
        }
        return { hour, minute };
    }

    return null;
}


// POST /api/admin/trackings/:id/history - Add a new history event to a tracking (Admin only)
// This route is for JSON data, so existing parsing logic is fine.
app.post('/api/admin/trackings/:id/history', authenticateAdmin, async (req, res) => {
    console.log('\n--- Backend: Add History Event Request Received ---');
    console.log('Backend: req.params.id (Tracking ID from URL):', req.params.id);
    console.log('Backend: Full req.body received:', req.body);

    let bodyData = req.body;

    if (bodyData instanceof Buffer) {
        console.log('Backend: req.body for history is a Buffer, attempting to parse it as JSON...');
        try {
            bodyData = JSON.parse(bodyData.toString('utf8'));
            console.log('Backend: Successfully parsed req.body Buffer for history:', bodyData);
        } catch (parseError) {
            console.error('Backend: Failed to parse req.body Buffer as JSON for history:', parseError);
            return res.status(400).json({ message: 'Invalid JSON body for history from Buffer parsing.' });
        }
    } else if (typeof bodyData === 'object' && bodyData !== null && Object.keys(bodyData).length === 0 && req.rawBody && req.rawBody instanceof Buffer) {
        console.log('Backend: req.body for history was empty object, checking req.rawBody...');
        try {
            bodyData = JSON.parse(req.rawBody.toString('utf8'));
            console.log('Backend: Successfully parsed from req.rawBody for history:', bodyData);
        } catch (parseError) {
            console.error('Backend: Failed to parse req.rawBody as JSON for history:', parseError);
            return res.status(400).json({ message: 'Invalid JSON body in rawBody for history.' });
        }
    }

    const { date, time, location, description } = bodyData;

    if (!date || date.trim() === '' || !time || time.trim() === '' || !location || location.trim() === '' || !description || description.trim() === '') {
        console.log('Backend: Validation FAILED - One or more required history fields are missing or empty.');
        return res.status(400).json({ message: 'Date, Time, Location, and Description are required to add a new history event.' });
    }

    try {
        const { id } = req.params;
        const tracking = await Tracking.findById(id);

        if (!tracking) {
            console.log('Backend: Tracking record not found for ID:', id);
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        let eventTimestamp;
        const parsedTime = parseTimeWithAmPm(time);

        console.log('Backend: Raw time string for parsing:', time);
        console.log('Backend: Result of parseTimeWithAmPm:', parsedTime);

        if (parsedTime) {
            eventTimestamp = new Date(Date.UTC(
                new Date(date).getUTCFullYear(),
                new Date(date).getUTCMonth(),
                new Date(date).getUTCDate(),
                parsedTime.hour,
                parsedTime.minute
            ));

            if (isNaN(eventTimestamp.getTime())) {
                console.warn(`Backend: Could not parse combined history date/time. Resulting timestamp is NaN. Date: ${date}, Time: ${time}`);
                return res.status(400).json({ message: 'Invalid date or time format provided for history event.' });
            }
        } else {
            console.warn(`Backend: Invalid time format for history event: "${time}". parseTimeWithAmPm returned null.`);
            return res.status(400).json({ message: 'Invalid time format for history event. Expected HH:MM or HH:MM AM/PM.' });
        }

        const newHistoryEvent = {
            timestamp: eventTimestamp,
            location: location,
            description: description
        };

        if (!tracking.history) {
            tracking.history = [];
        }
        tracking.history.push(newHistoryEvent);
        tracking.lastUpdated = new Date();

        await tracking.save();

        console.log('Backend: History event successfully added to tracking ID:', id);
        res.status(201).json({ message: 'History event added successfully!', tracking: tracking.toObject(), newEvent: newHistoryEvent });

    } catch (error) {
        console.error('Backend: Uncaught error adding history event:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid tracking ID format.' });
        }
        res.status(500).json({ message: 'Server error while adding history event.', error: error.message });
    }
});


// Edit a specific history event
app.put('/api/admin/trackings/:id/history/:historyId', authenticateAdmin, async (req, res) => {
    const { id, historyId } = req.params;
    const { date, time, location, description } = req.body; // This assumes JSON body, which is usually the case for PUT updates

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
    const updateData = req.body; // This route also assumes JSON body, not multipart/form-data.

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
                if (updateData.expectedDeliveryDate === undefined) {
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

    if (typeof req.body === 'object' && req.body !== null && !req.body.username && req.body instanceof Buffer) {
        try {
            requestBody = JSON.parse(req.body.toString('utf8'));
            console.log('Request body AFTER manual .toString() and JSON.parse:', requestBody);
        } catch (parseError) {
            console.error('Error manually parsing request body:', parseError);
            return res.status(400).json({ message: 'Invalid request body format.' });
        }
    } else {
        requestBody = req.body;
        console.log('Request body used directly (assumed parsed by express.json() or non-Buffer):', requestBody);
    }

    const { username, password } = requestBody;

    console.log('Extracted username:', username);
    console.log('Extracted password (first few chars):', password ? password.substring(0, 5) + '...' : 'null/undefined');

    if (!username || !password) {
        console.log('Login failed: Username or password missing');
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
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

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Login successful for user:', username, 'Role:', user.role);
        res.json({ message: 'Login successful!', token, role: user.role });
    } catch (error) {
        console.error('Error during login route execution:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- NEW: Email Sending Route (POST /api/admin/send-email) ---
// This route requires multipart/form-data parsing via Multer.
app.post('/api/admin/send-email', authenticateAdmin, upload.single('attachment'), async (req, res) => {
    console.log('\n--- Backend: Send Email Request Received ---');
    console.log('Backend: req.body (parsed by multer, text fields):', req.body);
    console.log('Backend: req.file (parsed by multer, file data):', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    } : 'No file attached');

    try {
        const { to, subject, message, trackingId } = req.body;
        const attachment = req.file; // This will contain the file data (as a Buffer if using memoryStorage)

        if (!to || !subject || !message || !trackingId) {
            console.log('Validation failed: Missing required email fields.');
            return res.status(400).json({ message: 'Recipient, Subject, Message, and Tracking ID are required.' });
        }

        // Fetch tracking details to get recipient's email if 'to' is not provided directly
        let recipientEmailAddress = to;
        if (trackingId && !recipientEmailAddress) { // If 'to' is empty but trackingId is there, try to get email from DB
            const tracking = await Tracking.findOne({ trackingId: trackingId });
            if (tracking && tracking.recipientEmail) {
                recipientEmailAddress = tracking.recipientEmail;
                console.log(`Found recipient email from tracking ID: ${recipientEmailAddress}`);
            } else {
                console.warn(`Recipient email not provided and not found for tracking ID: ${trackingId}`);
                // Decide if this should be an error or just proceed without a 'to' address
                return res.status(400).json({ message: 'Recipient email address missing or not found for provided tracking ID.' });
            }
        }
        
        if (!recipientEmailAddress) {
             return res.status(400).json({ message: 'Recipient email address is required.' });
        }

        // Nodemailer setup
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Or 'smtp', etc., based on your email provider
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail email address
                pass: process.env.EMAIL_PASS, // Your App Password for Gmail
            },
        });

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_FROM, // Your sender email address (e.g., 'Your App <youremail@gmail.com>')
            to: recipientEmailAddress,
            subject: subject,
            html: message, // Use 'html' if your message contains HTML, otherwise use 'text'
        };

        if (attachment) {
            mailOptions.attachments = [{
                filename: attachment.originalname,
                content: attachment.buffer, // Use the buffer directly from multer's memory storage
                contentType: attachment.mimetype,
            }];
            console.log(`Attached file: ${attachment.originalname}, type: ${attachment.mimetype}, size: ${attachment.size} bytes`);
        } else {
            console.log('No attachment for this email.');
        }

        // Send the email
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');

        res.status(200).json({ success: true, message: 'Email sent successfully!' });

    } catch (error) {
        console.error('Error sending email:', error);
        // Specifically check for Multer errors
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `File upload error: ${error.message}` });
        }
        res.status(500).json({ success: false, message: error.message || 'Failed to send email.' });
    }
});


// --- Serve Static Files (IMPORTANT for Netlify Functions) ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));


// --- Universal 404 Handler ---
app.use((req, res, next) => {
    if (!req.path.startsWith('/api/') && !req.path.includes('.')) {
        res.status(404).json({ message: 'The requested page or API endpoint was not found.' });
    } else {
        res.status(404).json({ message: 'Endpoint not found.' });
    }
});


// --- Global Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR HANDLER:', err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'An unexpected server error occurred.',
        error: process.env.NODE_ENV === 'production' ? {} : err.stack
    });
});


// Export the Express app instance for Netlify Function
module.exports = {
    app,
    populateInitialData,
    mongoose
};