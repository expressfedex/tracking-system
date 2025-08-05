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
        
        // --- ADD THIS LINE ---
        const numericId = parseInt(trackingId, 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ message: 'Invalid Tracking ID format.' });
        }

        // Use the numeric ID in the query
        const trackingDetails = await Tracking.findOne({ trackingId: numericId });

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

// Admin Route: Fetch history for a tracking
app.get('/api/admin/trackings/:trackingIdValue/history', authenticateToken, async (req, res) => {
    try {
        const { trackingIdValue } = req.params;

        console.log('Backend: Fetching history for trackingIdValue:', trackingIdValue);
        
        // --- ADD THESE LINES ---
        const numericId = parseInt(trackingIdValue, 10);
        if (isNaN(numericId)) {
            console.log('Backend: Invalid Tracking ID format for history fetch:', trackingIdValue);
            return res.status(400).json({ message: 'Invalid Tracking ID format.' });
        }

        // Use the numeric ID in the query
        const tracking = await Tracking.findOne({ trackingId: numericId });

        if (!tracking) {
            console.log('Backend: Tracking record not found for custom ID (history fetch):', trackingIdValue);
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        res.json({ success: true, history: tracking.history || [] });
    } catch (error) {
        console.error('Error fetching tracking history:', error);
        res.status(500).json({ message: 'Error fetching tracking history.' });
    }
});

// Admin Route: Get a single tracking record by ID (Corrected to find by custom 'trackingId')
app.get('/api/admin/trackings/:trackingIdValue', authenticateAdmin, async (req, res) => {
    try {
        const { trackingIdValue } = req.params;
        console.log(`Backend: Received GET /api/admin/trackings/${trackingIdValue} request.`); // This will log the ID received by backend

        const tracking = await Tracking.findOne({ trackingId: trackingIdValue });

        if (!tracking) {
            console.log(`Backend: Tracking record not found for custom ID: ${trackingIdValue}`); // This log means the ID wasn't found in DB
            return res.status(404).json({ message: 'Tracking record not found.' }); // This is the exact message you're seeing
        }

        res.json(tracking); // Returns the full tracking object
    } catch (error) {
        console.error(`Error fetching single tracking ${req.params.trackingIdValue} for admin:`, error);
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

// POST /api/admin/trackings/:trackingIdValue/history - Add a new history event to a tracking (Admin only)
app.post('/api/admin/trackings/:trackingIdValue/history', authenticateAdmin, async (req, res) => {
    console.log('\n--- Backend: Add History Event Request Received ---');
    // Changed param name for clarity
    const { trackingIdValue } = req.params;
    console.log('Backend: req.params.trackingIdValue (Tracking ID from URL):', trackingIdValue);
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
        // --- CORRECTED LINE: Use findOne with the 'trackingId' field ---
        const tracking = await Tracking.findOne({ trackingId: trackingIdValue });

        if (!tracking) {
            console.log('Backend: Tracking record not found for custom ID:', trackingIdValue);
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

        console.log('Backend: History event successfully added to tracking ID:', trackingIdValue);
        res.status(201).json({ success: true, message: 'History event added successfully!', tracking: tracking.toObject(), newEvent: newHistoryEvent }); // Added success: true
    } catch (error) {
        console.error('Backend: Uncaught error adding history event:', error);
        // CastError should no longer occur here for valid trackingIdValue
        res.status(500).json({ success: false, message: 'Server error while adding history event.', error: error.message }); // Added success: false
    }
});

// Edit a specific history event
app.put('/api/admin/trackings/:id/history/:historyId', authenticateAdmin, async (req, res) => {
    const { id, historyId } = req.params;
    let requestBody = req.body; // Use a temporary variable for req.body initially

    // --- CRITICAL: MANUAL PARSING LOGIC TO ENSURE req.body IS A PARSED OBJECT ---
    // (These are the lines that were missing from your previous logs)
    console.log(`Backend: Received PUT request for History ID: ${historyId} on Tracking ID: ${id}`);
    console.log('Backend: History Data to update (initial req.body):', req.body);
    console.log('Backend: Type of requestBody (initial):', typeof requestBody);
    console.log('Backend: Keys of requestBody (initial):', Object.keys(requestBody));

    if (Buffer.isBuffer(requestBody)) {
        try {
            // Convert Buffer to string, then parse as JSON
            const parsedBody = JSON.parse(requestBody.toString('utf8'));
            requestBody = parsedBody; // Reassign requestBody to the parsed object
            console.log('Backend: Manually parsed history body. New requestBody:', requestBody);
            console.log('Backend: Type of requestBody (after manual parse):', typeof requestBody);
            console.log('Backend: Keys of requestBody (after manual parse):', Object.keys(requestBody));
        } catch (parseError) {
            console.error('Backend: Failed to manually parse history body (likely invalid JSON or empty body):', parseError);
            return res.status(400).json({ message: 'Invalid JSON body format or empty request body for history update.' });
        }
    }
    // -----------------------------------------------------------------------------

    // Now, destructure from the (potentially) parsed requestBody
    const { date, time, location, description } = requestBody;

    if (date === undefined && time === undefined && location === undefined && description === undefined) {
        console.log("Backend: Validation failed - no valid fields found in parsed body.");
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
        console.log('Backend: History event updated successfully. New event:', historyEvent.toObject());

        res.json({ message: 'History event updated successfully!', historyEvent: historyEvent.toObject() });
    } catch (error) {
        console.error(`Error updating history event ${historyId} for tracking ID ${id}:`, error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid ID format for tracking or history event.' });
        }
        res.status(500).json({ message: 'Server error while updating history event.', error: error.message });
    }
});

// Admin Route: Get all users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        console.log('Received GET /api/admin/users request.');
        // Fetch all users from the database, but exclude their password for security
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        console.error('Error fetching all users for admin:', error);
        res.status(500).json({ message: 'Server error while fetching users.', error: error.message });
    }
});

// Admin Route to Update Tracking Details (general updates, including trackingId change)
app.put('/api/admin/trackings/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    let updateData = req.body; // Initialize updateData with the raw req.body

    // --- IMPORTANT: ADD THIS MANUAL PARSING LOGIC HERE ---
    console.log(`Backend: Received PUT request for MongoDB ID: ${id}`);
    console.log('Backend: Data to update (initial req.body):', req.body);
    console.log('Backend: Type of updateData (initial):', typeof updateData);
    console.log('Backend: Keys of updateData (initial):', Object.keys(updateData));

    // Check if req.body is a Buffer (as confirmed by your logs)
    if (Buffer.isBuffer(updateData)) {
        try {
            // Attempt to parse the Buffer as a JSON string
            const parsedBody = JSON.parse(updateData.toString('utf8'));
            updateData = parsedBody; // Reassign updateData to the parsed object
            console.log('Backend: Manually parsed body. New updateData:', updateData);
            console.log('Backend: Type of updateData (after manual parse):', typeof updateData);
            console.log('Backend: Keys of updateData (after manual parse):', Object.keys(updateData));
        } catch (parseError) {
            console.error('Backend: Failed to manually parse body (likely invalid JSON or empty body):', parseError);
            // Return an error if parsing fails, as we can't process the request
            return res.status(400).json({ message: 'Invalid JSON body format or empty request body.' });
        }
    }
    // --------------------------------------------------------

    try {
        let currentTracking = await Tracking.findById(id);

        if (!currentTracking) {
            console.log(`Backend: Tracking record not found for ID: ${id}`);
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        // The rest of your logic remains the same.
        // The `for (const key of Object.keys(updateData))` loop will now
        // operate on the correctly parsed JSON object.

        if (updateData.trackingId && updateData.trackingId !== currentTracking.trackingId) {
            const newTrackingId = updateData.trackingId;
            const existingTrackingWithNewId = await Tracking.findOne({ trackingId: newTrackingId });

            if (existingTrackingWithNewId && String(existingTrackingWithNewId._id) !== id) {
                return res.status(409).json({ message: 'New Tracking ID already exists. Please choose a different one.' });
            }

            console.log(`Tracking ID changed from (old): ${currentTracking.trackingId} to (new): ${newTrackingId}`);
            currentTracking.trackingId = newTrackingId;
        }

        for (const key of Object.keys(updateData)) {
            if (key === 'expectedDeliveryDate') {
                const effectiveDate = updateData.expectedDeliveryDate;
                const effectiveTimeInput = updateData.expectedDeliveryTime;

                if (effectiveDate && effectiveTimeInput) {
                    const parsedTime = parseTimeWithAmPm(effectiveTimeInput);
                    if (!parsedTime) {
                        console.warn(`Invalid time format for expectedDeliveryTime: ${effectiveTimeInput}`);
                        continue;
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
                        console.warn(`Could not parse expectedDelivery: ${effectiveDate} ${effectiveTimeInput}`);
                    }
                }
            } else if (key === 'expectedDeliveryTime') {
                if (updateData.expectedDeliveryDate === undefined) {
                    const effectiveDate = currentTracking.expectedDelivery
                        ? currentTracking.expectedDelivery.toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0];

                    const effectiveTimeInput = updateData.expectedDeliveryTime;
                    if (effectiveTimeInput) {
                        const parsedTime = parseTimeWithAmPm(effectiveTimeInput);
                        if (!parsedTime) {
                            console.warn(`Invalid time format: ${effectiveTimeInput}`);
                            continue;
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
                            console.warn(`Could not parse expectedDelivery: ${effectiveDate} ${effectiveTimeInput}`);
                        }
                    }
                }
            } else if (key === 'isBlinking') {
                currentTracking.isBlinking = typeof updateData[key] === 'boolean' ? updateData[key] : currentTracking.isBlinking;
            } else if (key === 'weight') {
                currentTracking.weight = parseFloat(updateData.weight) || 0;
            } else if (key !== 'trackingId') {
                currentTracking[key] = updateData[key];
            }
        }

        currentTracking.lastUpdated = new Date();
        await currentTracking.save();
        console.log('Backend: Successfully updated tracking. New data:', currentTracking);

        res.json({ success: true, message: 'Tracking updated successfully!', tracking: currentTracking });
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid tracking ID format.' });
    }

    if (!mongoose.Types.ObjectId.isValid(historyId)) {
        return res.status(400).json({ message: 'Invalid history ID format.' });
    }

    try {
        const tracking = await Tracking.findById(id);
        if (!tracking) {
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        const before = tracking.history.length;
        // Corrected line: Use 'new' keyword for ObjectId
        tracking.history.pull({ _id: new mongoose.Types.ObjectId(historyId) }); // <-- Fix is here!

        if (tracking.history.length === before) {
            return res.status(404).json({ message: 'History event not found with the provided ID.' });
        }

        tracking.lastUpdated = new Date();
        await tracking.save();

        res.json({
            message: 'History event deleted successfully!',
            history: tracking.history
        });

    } catch (error) {
        console.error('Error deleting history event:', error); // Check your server logs for the exact error here!
        res.status(500).json({ message: 'Server error while deleting history event.', error: error.message });
    }
});


// Delete an entire tracking record
app.delete('/api/admin/trackings/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;

    // Validate the format of the tracking ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid tracking ID format.' });
    }

    try {
        // Use findByIdAndDelete directly.
        // It returns the deleted document if found, null if not found.
        const deletedTracking = await Tracking.findByIdAndDelete(id); // *** THIS IS THE KEY CHANGE ***

        if (!deletedTracking) {
            // If deletedTracking is null, it means no document with that _id was found and deleted.
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        // Optional: Delete attached file if using cloud storage
        // This logic now correctly runs only if the tracking record was found AND deleted.
        if (deletedTracking.attachedFileName) {
            console.log(`Placeholder: Would delete file: ${deletedTracking.attachedFileName}`);
            // Implement your file deletion logic here (e.g., from AWS S3, Cloudinary, etc.)
            // Example (pseudo-code): await deleteFileFromCloud(deletedTracking.attachedFileName);
        }

        // If we reach here, the tracking was found and successfully deleted.
        res.json({ success: true, message: 'Tracking deleted successfully!' }); // Added success: true for consistency with frontend

    } catch (error) {
        console.error('Error deleting tracking:', error);
        res.status(500).json({ success: false, message: 'Error deleting tracking data.', error: error.message });
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
        // 1. Destructure values from req.body (matching frontend keys)
        const { recipientEmail, subject, message, trackingId } = req.body;
        const attachment = req.file;

        // 2. Initial Validation (already fixed based on previous discussion)
        if (!recipientEmail || !subject || !message) {
            console.log('Validation failed: Recipient, Subject, and Message fields are required.');
            return res.status(400).json({ message: 'Recipient, Subject, and Message fields are required.' });
        }

        // 3. Determine the final recipient email address
        let finalRecipientEmailAddress = recipientEmail;
        let tracking = null; // Initialize tracking object

        // Only attempt to fetch from DB if a trackingId was provided
        if (trackingId) {
            tracking = await Tracking.findOne({ trackingId: trackingId });
            // If recipientEmail was empty from the form but trackingId exists and has an email, use it
            if (!finalRecipientEmailAddress && tracking && tracking.recipientEmail) {
                finalRecipientEmailAddress = tracking.recipientEmail;
                console.log(`Found recipient email from tracking ID: ${finalRecipientEmailAddress}`);
            }
        }
        
        // Final check to ensure we have a recipient email address before trying to send
        if (!finalRecipientEmailAddress) {
            return res.status(400).json({ message: 'Recipient email address is required (either directly provided or linked to a tracking ID).' });
        }

        // --- NODEMAILER SETUP (Your existing code) ---
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Or 'smtp', etc., based on your email provider
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail email address
                pass: process.env.EMAIL_PASS, // Your App Password for Gmail
            },
        });

       // --- CONSTRUCTING THE HTML EMAIL CONTENT ---
// Ensure 'tracking' object is available and populated before this block.
// If no trackingId was selected or found, 'tracking' will be null, so provide fallbacks.
const dynamicTrackingId = tracking ? tracking.trackingId || 'N/A' : 'N/A';
const dynamicRecipientName = tracking ? tracking.recipientName || 'Customer' : 'Customer';
const dynamicStatus = tracking ? tracking.status || 'N/A' : 'N/A';

// Logic to determine the latest update timestamp and location from history or fallback
let latestUpdateTimestamp = 'N/A';
let latestUpdateLocation = tracking ? tracking.location || 'N/A' : 'N/A'; // Default to tracking.location

if (tracking && tracking.history && tracking.history.length > 0) {
    // Sort history to get the truly latest event by timestamp (descending)
    const sortedHistory = [...tracking.history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const latestEvent = sortedHistory[0];
    if (latestEvent) {
        latestUpdateTimestamp = new Date(latestEvent.timestamp).toLocaleString();
        latestUpdateLocation = latestEvent.location || latestUpdateLocation; // Use event location, fallback to general tracking location
    }
} else if (tracking && tracking.lastUpdated) {
    latestUpdateTimestamp = new Date(tracking.lastUpdated).toLocaleString();
} else {
    latestUpdateTimestamp = new Date().toLocaleString(); // Fallback to current time if no tracking or history
}

// Ensure expectedDelivery is correctly formatted from the `expectedDelivery` field, not `expectedDeliveryDate`
const dynamicExpectedDelivery = tracking && tracking.expectedDelivery
    ? new Date(tracking.expectedDelivery).toLocaleDateString()
    : 'N/A';

const yourWebsiteBaseUrl = process.env.FRONTEND_URL || 'https://fedeix.netlify.app';

// --- FIXED LOGO IMAGE URL ---
const logoImageUrl = 'https://i.imgur.com/nShHzww.png'; // Direct link to the image

const emailHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Shipment Update</title>
        <style type="text/css">
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background-color: #350056ff; padding: 20px; text-align: center; color: white; border-top-left-radius: 8px; border-top-right-radius: 8px; }
            .logo { max-width: 150px; height: auto; display: block; margin: 0 auto 20px auto; }
            .content { padding: 20px; line-height: 1.6; color: #333; }
            .footer { text-align: center; font-size: 12px; color: #777; padding: 20px; }
            .status-box { background-color: #e0f2f7; padding: 15px; border-left: 5px solid #440279ff; margin-bottom: 20px; }
            .status-box p { margin: 0; }
            /* Original link style for comparison if needed, overridden by inline for button */
            a { color: #0056b3; text-decoration: none; }
            a:hover { text-decoration: underline; }

            /* New style for the custom message box */
            .message-section {
                margin-top: 20px;
                padding: 15px;
                border: 1px solid #dcdcdc; /* Light gray border */
                border-left: 4px solid #350056ff; /* Matches header color */
                background-color: #f8f8f8; /* Very light gray background */
                border-radius: 5px; /* Slightly rounded corners */
                font-size: 14px;
                line-height: 1.5;
                color: #555;
            }
            .message-section p {
                margin: 0; /* Remove default paragraph margins inside the box */
            }
            .message-section strong {
                color: #333; /* Make title bolder */
            }
        </style>
    </head>
    <body>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                        <tr>
                            <td class="header" style="background-color: #350056ff; padding: 20px; text-align: center; color: white; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                                <img src="${logoImageUrl}" alt="FedEx Logo" class="logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 20px auto;">
                                <h2 style="color: white; margin: 0;">Shipment Update Notification</h2>
                            </td>
                        </tr>
                        <tr>
                            <td class="content" style="padding: 20px; line-height: 1.6; color: #333;">
                                <p style="margin-bottom: 10px;">Dear ${dynamicRecipientName},</p>
                                <p style="margin-bottom: 10px;">This is an important update regarding your FedEx shipment.</p>
                                
                                <div class="status-box" style="background-color: #e0f2f7; padding: 15px; border-left: 5px solid #440279ff; margin-bottom: 20px;">
                                    <p style="margin: 0; font-weight: bold;">Tracking ID: <span style="font-weight: normal;">${dynamicTrackingId}</span></p>
                                    <p style="margin: 5px 0 0 0; font-weight: bold;">Current Status: <span style="font-weight: normal;">${dynamicStatus}</span></p>
                                    <p style="margin: 5px 0 0 0; font-weight: bold;">Latest Update: <span style="font-weight: normal;">${latestUpdateTimestamp} at ${latestUpdateLocation}</span></p>
                                    <p style="margin: 5px 0 0 0; font-weight: bold;">Expected Delivery: <span style="font-weight: normal;">${dynamicExpectedDelivery}</span></p>
                                </div>

                                <p style="margin-bottom: 10px;">You can track your package anytime by visiting our website: 
                                    <a href="${yourWebsiteBaseUrl}" 
                                       style="
                                           display: inline-block; /* Makes padding work correctly */
                                           background-color: #350056ff; /* Purple background */
                                           color: #ffffff; /* White text */
                                           padding: 10px 20px; /* Space around text */
                                           text-decoration: none; /* Remove underline */
                                           border-radius: 5px; /* Slightly rounded corners */
                                           font-weight: bold; /* Make the text bold */
                                       "
                                    >Track My Package</a>
                                </p>

                                ${message ? `
                                    <div class="message-section" style="
                                        margin-top: 20px;
                                        padding: 15px;
                                        border: 1px solid #dcdcdc;
                                        border-left: 4px solid #d2290fff; /* Matches header color */
                                        background-color: #350056ff;
                                        border-radius: 5px;
                                        font-size: 14px;                             
                                        line-height: 1.5;
                                        color: #fffdfdff;
                                    ">
                                        <p style="margin: 0; font-weight: bold; color: #fffdfdff;">From FedEx Management:</p>
                                        <p style="margin: 10px 0 0 0; padding: 0 5px;">"<i>${message}</i>"</p>
                                    </div>
                                ` : ''}

                                <p style="margin-top: 20px;">Thank you for choosing FedEx for your shipping needs.</p>
                                <p style="margin-bottom: 0;">Sincerely,</p>
                                <p style="margin-top: 5px;">The FedEx Team</p>
                            </td>
                        </tr>
                        <tr>
                            <td class="footer" style="text-align: center; font-size: 12px; color: #777; padding: 20px;">
                                <p style="margin: 0;">&copy; ${new Date().getFullYear()} FedEx. All rights reserved.</p>
                                <p style="margin: 5px 0 0 0;">This is an automated email, please do not reply.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
`;
        // --- EMAIL OPTIONS (Nodemailer) ---
        const mailOptions = {
            from: `"FedEx Delivery Service" <${process.env.EMAIL_USER}>`, // Now it will show "FedEx Delivery Service" as the sender name
            to: finalRecipientEmailAddress,
            subject: subject,
            html: emailHtmlContent, // <-- Use the generated HTML here
            // Plain text version - crucial for email clients that don't render HTML, or for accessibility
            text: `Dear ${dynamicRecipientName},\n\nYour shipment with tracking ID ${dynamicTrackingId} is currently "${dynamicStatus}".\n\nLatest update: ${new Date().toLocaleString()} at ${latestUpdateLocation}.\n\nExpected delivery: ${dynamicExpectedDelivery}.\n\n${message ? `Admin's message: ${message}\n\n` : ''}Thank you for choosing FedEx.\n\nTrack your package: ${yourWebsiteBaseUrl}/track?id=${dynamicTrackingId}`,
        };

        // --- ATTACHMENT HANDLING (Your existing code) ---
        if (attachment) {
            mailOptions.attachments = [{
                filename: attachment.originalname,
                content: attachment.buffer,
                contentType: attachment.mimetype,
            }];
            console.log(`Attached file: ${attachment.originalname}, type: ${attachment.mimetype}, size: ${attachment.size} bytes`);
        } else {
            console.log('No attachment for this email.');
        }

        // --- SEND THE EMAIL (Your existing code) ---
        console.log('Backend: Attempting to send email...');
        console.log('Backend: Mail options being used:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
            htmlContentLength: mailOptions.html ? mailOptions.html.length : 'N/A',
            textContentLength: mailOptions.text ? mailOptions.text.length : 'N/A',
            hasAttachment: mailOptions.attachments && mailOptions.attachments.length > 0 ? true : false
        });
        console.log('Backend: Nodemailer transporter user (from env):', process.env.EMAIL_USER);
        // !!! IMPORTANT: DO NOT LOG process.env.EMAIL_PASS DIRECTLY FOR SECURITY REASONS !!!

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
        console.log('Nodemailer response (info object):', info); // This shows detailed response from Gmail/SMTP server

        res.status(200).json({ success: true, message: 'Email sent successfully!' });

    } catch (error) {
        console.error('Error sending email:', error);
        // Log more details about the Nodemailer error
        if (error.code) {
            console.error('Nodemailer error code (e.g., EAUTH):', error.code);
        }
        if (error.response) {
            console.error('Nodemailer error response (SMTP server response):', error.response);
        }
        if (error.responseCode) {
            console.error('Nodemailer error response code (e.g., 535-7-8):', error.responseCode);
        }
        if (error.message) {
            console.error('Nodemailer error message:', error.message);
        }

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
