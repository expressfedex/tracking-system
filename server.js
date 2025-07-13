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
    // --- ADDED DETAILED LOGS FOR DEBUGGING ---
    console.log('--- START LOGIN REQUEST DEBUGGING ---');
    console.log('Received login request. Full request object (DEBUG):', req);
    console.log('Received login request. Headers:', req.headers);
    console.log('Received login request. Raw Body from Netlify (if available):', req.rawBody); // Netlify specific, sometimes useful for raw data
    console.log('Received login request. Parsed Body:', req.body);
    console.log('--- END LOGIN REQUEST DEBUGGING ---');
    // --- END ADDED DETAILED LOGS ---

    const { username, password } = req.body;

    // --- Original debug logs for username ---
    console.log('Login attempt for username:', username);
    // console.log('Password received (DO NOT LOG IN PRODUCTION):', password); // ONLY FOR DEBUGGING, REMOVE LATER!
    // --- END Original debug logs ---

    try {
        const user = await User.findOne({ username });

        // --- ADDED CONSOLE.LOG FOR DEBUGGING ---
        if (!user) {
            console.log('User not found for username:', username);
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        console.log('User found:', user.username); // User was found
        // --- END ADDED LOGS ---

        const isMatch = await bcrypt.compare(password, user.password);

        // --- ADDED CONSOLE.LOGS FOR DEBUGGING ---
        console.log('Password comparison result (isMatch):', isMatch);
        if (!isMatch) {
            console.log('Password mismatch for user:', username);
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        // --- END ADDED LOGS ---

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Token expires in 24 hour
        );
        res.json({ message: 'Logged in successfully!', token, role: user.role });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- Multer for File Uploads ---
// IMPORTANT: THIS SECTION NEEDS MAJOR REFACTORING FOR NETLIFY
// Netlify Functions are stateless and read-only. Local file system operations will NOT work.
// You need to integrate with a cloud storage service (e.g., AWS S3, Cloudinary, Google Cloud Storage).
// You'll need to update frontend to send files directly to S3 or to a function that proxies to S3.
/*
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // This path is local, won't work on Netlify Functions
        const uploadPath = path.join(__dirname, 'uploads');
        // Ensure the directory exists (also problematic on read-only file system)
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage }); // Multer setup is specific to local disk storage

// Your file upload route - Needs complete rewrite for cloud storage
app.post('/api/admin/upload-package-file', authenticateAdmin, upload.single('packageFile'), async (req, res) => {
    // ... (logic that uses req.file.path and fs.unlink/existsSync)
    // This entire block needs to be replaced with cloud storage logic.
    // E.g., using AWS S3 SDK to upload, and store the S3 URL in MongoDB.
});
*/


// --- Nodemailer for Email Sending ---
// IMPORTANT: Attachments logic will need update if files are from cloud storage.
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services or SMTP
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Original email route - will need adjustments for file attachments
app.post('/api/admin/send-email', authenticateAdmin, /* If you had multer here, remove it */ async (req, res) => {
    const { to, subject, body, trackingId } = req.body;

    if (!to || !subject || !body) {
        // If req.file was from multer, you'd have unlink logic here for local cleanup
        return res.status(400).json({ message: 'Recipient, Subject, and Message are required.' });
    }

    let attachments = [];
    // If you enable file uploads via S3, the req.file logic would change.
    // You'd get a URL from the frontend or fetch the file stream from S3 using its SDK.
    /*
    // Example for fetching from S3 (pseudocode - requires S3 SDK setup)
    if (trackingId) {
        try {
            const tracking = await Tracking.findOne({ trackingId });
            if (tracking && tracking.attachedFileName) {
                // Assuming attachedFileName is now an S3 object key or public URL
                // If it's an S3 key, you'd fetch the object stream from S3
                // If it's a direct public URL, Nodemailer can often use that directly
                const s3Key = tracking.attachedFileName; // e.g., 'uploads/12345-myfile.pdf'
                // Replace with actual S3 fetch and pipe
                // const fileStream = await s3.getObject({ Bucket: process.env.S3_BUCKET_NAME, Key: s3Key }).createReadStream();
                // attachments.push({ filename: s3Key.split('/').pop(), content: fileStream });
            }
        } catch (error) {
            console.error('Error fetching attached file for email from storage:', error);
        }
    }
    */

    // --- HTML Email Template with White and Purple Glowing Colors ---
    const htmlEmailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #0d1117; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #ffffff; text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #bb00ff, 0 0 20px #bb00ff; animation: glow-white-purple 1.5s infinite alternate;">
                    Tracking Update Notification
                </h1>
                <style>
                    @keyframes glow-white-purple {
                        from { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #bb00ff, 0 0 20px #bb00ff; }
                        to { text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #bb00ff, 0 0 40px #bb00ff; }
                    }
                </style>
            </div>
            <div style="background-color: #161b22; padding: 15px; border-radius: 5px; border: 1px solid #30363d;">
                <p style="color: #e6e6e6;">Dear recipient,</p>
                <p style="color: #e6e6e6;">You have received an important update regarding your package.</p>
                <p style="color: #e6e6e6;"><strong>Subject:</strong> ${subject}</p>
                <p style="color: #e6e6e6;"><strong>Message:</strong></p>
                <div style="padding: 10px; background-color: #21262d; border-radius: 4px; border: 1px solid #444c56; color: #c9d1d9;">
                    <p style="margin: 0;">${body.replace(/\n/g, '<br>')}</p>
                </div>
                ${trackingId ? `<p style="color: #e6e6e6; margin-top: 15px;">You can view detailed tracking information here: <a href="${process.env.FRONTEND_URL}/track_details.html?trackingId=${trackingId}" style="color: #bb00ff; text-decoration: none;">Track Your Package</a></p>` : ''}
                <p style="color: #e6e6e6; margin-top: 20px;">Thank you for your patience.</p>
                <p style="color: #e6e6e6; font-size: 0.9em;">Best regards,<br>Your Shipping Team</p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: htmlEmailBody, // Use the HTML email body
        attachments: attachments // This will be empty for now without cloud file storage solution
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Server error while sending email.', error: error.message });
    }
});


// Public Route to get a single tracking by ID (No Authentication)
app.get('/api/track/:trackingId', async (req, res) => {
    const { trackingId } = req.params;
    console.log(`Received public request for tracking ID: ${trackingId}`);
    try {
        const tracking = await Tracking.findOne({ trackingId });
        if (tracking) {
            res.json({
                ...tracking.toObject(),
                statusLineColor: tracking.statusLineColor || '#2196F3',
                blinkingDotColor: tracking.blinkingDotColor || '#FFFFFF',
                isBlinking: tracking.isBlinking,
                // IMPORTANT: Replace this with your actual cloud storage URL base!
                // Example if using S3: `https://your-s3-bucket-name.s3.amazonaws.com/${tracking.attachedFileName}`
                attachedFileUrl: tracking.attachedFileName ? `${process.env.CLOUD_STORAGE_BASE_URL}/${tracking.attachedFileName}` : null
            });
        } else {
            res.status(404).json({ message: 'Tracking ID not found.' });
        }
    } catch (error) {
        console.error('Error fetching tracking data:', error);
        res.status(500).json({ message: 'Server error while fetching tracking data.' });
    }
});


// Add new history events to a tracking record
app.post('/api/admin/trackings/:id/history', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { date, time, location, description } = req.body;

    if (!description || description.trim() === '') {
        return res.status(400).json({ message: 'History event description is required.' });
    }
    if (!date || date.trim() === '') {
        return res.status(400).json({ message: 'History event date is required.' });
    }
    if (!time || time.trim() === '') {
        return res.status(400).json({ message: 'History event time is required.' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return res.status(400).json({ message: 'Invalid date format for new history event. Expected YYYY-MM-DD.' });
    }
    const timeRegex = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
        return res.status(400).json({ message: 'Invalid time format for new history event. Expected HH:MM.' });
    }

    const combinedTimestamp = `${date}T${time}:00`;

    try {
        const tracking = await Tracking.findById(id);

        if (!tracking) {
            return res.status(404).json({ message: 'Tracking record not found.' });
        }

        if (!tracking.history) {
            tracking.history = [];
        }

        const newHistoryItem = {
            timestamp: new Date(combinedTimestamp),
            location: location || '',
            description: description
        };

        tracking.history.push(newHistoryItem);
        tracking.history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        tracking.lastUpdated = new Date();
        await tracking.save();

        res.status(201).json({ message: 'History event added successfully!', historyEvent: tracking.history[tracking.history.length -1] });
    } catch (error) {
        console.error('Error adding history event:', error);
        res.status(500).json({ message: 'Server error while adding history event.', error: error.message });
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