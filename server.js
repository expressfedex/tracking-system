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
    // recipientEmail: { type: String, default: '' }, // REMOVED: Recipient Email field
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
            // recipientEmail: 'mistycpayne@gmail.com', // REMOVED: Recipient email from initial data
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


// --- API Routes ---

// Public endpoint to get tracking details
// Changed from '/api/track/:trackingId' to '/track/:trackingId'
app.get('/track/:trackingId', async (req, res) => {
    try {
        const trackingId = req.params.trackingId;
        const trackingDetails = await Tracking.findOne({ trackingId: trackingId });

        if (!trackingDetails) {
            return res.status(404).json({ message: 'Tracking ID not found.' });
        }

        // Return only necessary public details, NO sensitive info like recipientEmail
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
            ])),
            attachedFileName: trackingDetails.attachedFileName, // Still include filename, but actual file serving is handled externally
            lastUpdated: trackingDetails.lastUpdated
        };

        res.json(publicDetails);

    } catch (error) {
        console.error('Error fetching public tracking details:', error);
        res.status(500).json({ message: 'Server error while fetching tracking details.' });
    }
});


// Admin Route: Get all tracking records
// Changed from '/api/admin/trackings' to '/admin/trackings'
app.get('/admin/trackings', authenticateAdmin, async (req, res) => {
    try {
        console.log('Received GET /admin/trackings request.'); // For debugging
        // Use .select('-recipientEmail') to explicitly exclude the field from the results
        const trackings = await Tracking.find({}).select('-recipientEmail');
        res.json(trackings);
    } catch (error) {
        console.error('Error fetching all trackings for admin:', error);
        res.status(500).json({ message: 'Server error while fetching all trackings.', error: error.message });
    }
});

// Admin Route: Get a single tracking record by ID
// Changed from '/api/admin/trackings/:id' to '/admin/trackings/:id'
app.get('/admin/trackings/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Received GET /admin/trackings/${id} request.`); // For debugging

        // Use .select('-recipientEmail') to explicitly exclude the field from the result
        const tracking = await Tracking.findById(id).select('-recipientEmail');

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
// Changed from '/api/admin/dashboard-stats' to '/admin/dashboard-stats'
app.get('/admin/dashboard-stats', authenticateAdmin, async (req, res) => {
    try {
        console.log('Received GET /admin/dashboard-stats request.');
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

// POST /api/admin/trackings - Create a new tracking record (Admin only)
// Changed from '/api/admin/trackings' to '/admin/trackings'
app.post('/admin/trackings', authenticateAdmin, async (req, res) => {
    try {
        console.log('Received POST /admin/trackings request.');
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
            // recipientEmail, // REMOVED from payload destructuring to prevent even accidental capture
            packageContents,
            serviceType,
            recipientAddress,
            specialHandling,
            weight,
            history // Initial history, if provided by the frontend
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
            statusLineColor: statusLineColor || '#2196F3', // Use provided color or default
            blinkingDotColor: blinkingDotColor || '#FFFFFF', // Use provided color or default
            isBlinking: typeof isBlinking === 'boolean' ? isBlinking : false, // Ensure boolean, default to false
            origin,
            destination,
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined, // Convert to Date object
            senderName,
            recipientName,
            // recipientEmail: recipientEmail, // REMOVED from new Tracking object creation
            packageContents,
            serviceType,
            recipientAddress,
            specialHandling,
            weight: parseFloat(weight) || 0,
            history: history && Array.isArray(history) ? history : [{ description: 'Shipment created', location: origin || 'Unknown' }], // Ensure history is an array
            lastUpdated: new Date()
        });

        await newTracking.save();
        res.status(201).json({ message: 'Tracking record created successfully!', tracking: newTracking });

    } catch (error) {
        console.error('Error adding new tracking record:', error);
        // More specific error handling for Mongoose validation errors if needed
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message, errors: error.errors });
        }
        res.status(500).json({ message: 'Server error while creating tracking record.', error: error.message });
    }
});


// Edit a specific history event
// Changed from '/api/admin/trackings/:id/history/:historyId' to '/admin/trackings/:id/history/:historyId'
app.put('/admin/trackings/:id/history/:historyId', authenticateAdmin, async (req, res) => {
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
// Changed from '/api/admin/trackings/:id' to '/admin/trackings/:id'
app.put('/admin/trackings/:id', authenticateAdmin, async (req, res) => {
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
            if (key === 'recipientEmail') { // REMOVED: Block recipientEmail update
                console.warn('Attempt to update recipientEmail via PUT /api/admin/trackings/:id ignored.');
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
// Changed from '/api/admin/trackings/:id/history/:historyId' to '/admin/trackings/:id/history/:historyId'
app.delete('/admin/trackings/:id/history/:historyId', authenticateAdmin, async (req, res) => {
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
// Changed from '/api/admin/trackings/:id' to '/admin/trackings/:id'
app.delete('/admin/trackings/:id', authenticateAdmin, async (req, res) => {
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
// Changed from '/api/admin/create-user' to '/admin/create-user'
app.post('/admin/create-user', async (req, res) => {
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
// Changed from '/api/login' to '/login'
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.json({ message: 'Login successful!', token, role: user.role });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error during login.' });
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