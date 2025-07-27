// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path'); // Import path module
const cors = require('cors'); // Import cors

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // Admin password from .env for initial setup
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // For parsing application/json
app.use(express.static('public')); // Serve static files from 'public' directory

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads', 'packages');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// MongoDB Connection
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB connected successfully');
        // Create default admin user if not exists
        createDefaultAdmin();
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: EMAIL_SERVICE, // e.g., 'gmail'
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

// Multer Storage for Package Files
const packageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Store in uploads/packages
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const uploadPackageFile = multer({ storage: packageStorage });

// --- Mongoose Schemas and Models ---

// Tracking History Schema (Subdocument)
const TrackingHistorySchema = new mongoose.Schema({
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String },
    description: { type: String, required: true },
    timestamp: { type: Date, default: Date.now } // For sorting
});

// Tracking Schema
const TrackingSchema = new mongoose.Schema({
    trackingId: { type: String, unique: true, required: true },
    status: { type: String, required: true },
    isBlinking: { type: Boolean, default: false },
    statusLineColor: { type: String, default: '#2196F3' }, // Default Materialize Blue
    blinkingDotColor: { type: String, default: '#FFFFFF' }, // Default White
    senderName: { type: String, required: true },
    recipientName: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    packageContents: { type: String, required: true },
    serviceType: { type: String, required: true },
    recipientAddress: { type: String, required: true },
    specialHandling: { type: String },
    expectedDeliveryDate: { type: String }, // Stored as string from datepicker
    expectedDeliveryTime: { type: String }, // Stored as string from timepicker
    origin: { type: String },
    destination: { type: String },
    weight: { type: Number }, // Weight in kg
    packageFiles: [{
        filename: String,
        path: String,
        uploadDate: { type: Date, default: Date.now }
    }],
    trackingHistory: [TrackingHistorySchema], // Array of history subdocuments
    lastUpdated: { type: Date, default: Date.now }
});

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const Tracking = mongoose.model('Tracking', TrackingSchema);
const User = mongoose.model('User', UserSchema);

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401); // No token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT verification error:", err);
            return res.sendStatus(403); // Invalid token
        }
        req.user = user;
        next();
    });
};

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: You do not have the required role.' });
        }
        next();
    };
};

// --- Initial Admin User Creation ---
async function createDefaultAdmin() {
    try {
        const adminExists = await User.findOne({ username: ADMIN_USERNAME });
        if (!adminExists) {
            const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
            const adminUser = new User({
                username: ADMIN_USERNAME,
                email: 'admin@fedex.com', // You can change this or make it configurable
                password: adminPassword,
                role: 'admin'
            });
            await adminUser.save();
            console.log('Default admin user created.');
        } else {
            console.log('Default admin user already exists.');
        }
    } catch (err) {
        console.error('Error creating default admin user:', err);
    }
}

// --- API Routes ---

// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, username: user.username, role: user.role });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get User Info (for header/sidebar display)
app.get('/api/userinfo', authenticateToken, (req, res) => {
    res.json({ username: req.user.username, role: req.user.role });
});

// --- Tracking Routes (Protected) ---

// Create New Tracking
app.post('/api/admin/trackings', authenticateToken, authorizeRole(['admin', 'editor']), async (req, res) => {
    try {
        const newTracking = new Tracking(req.body);
        await newTracking.save();
        res.status(201).json(newTracking);
    } catch (err) {
        console.error('Error adding new tracking:', err);
        res.status(400).json({ message: err.message });
    }
});

// Get All Trackings (for table and dropdowns)
app.get('/api/admin/trackings', authenticateToken, authorizeRole(['admin', 'editor', 'viewer']), async (req, res) => {
    try {
        const trackings = await Tracking.find({});
        res.json(trackings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Single Tracking by Tracking ID (used for /track page by client)
app.get('/api/track/:trackingId', async (req, res) => {
    try {
        const tracking = await Tracking.findOne({ trackingId: req.params.trackingId });
        if (!tracking) return res.status(404).json({ message: 'Tracking not found' });
        res.json(tracking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Single Tracking by MongoDB _id (for admin dashboard edit)
app.get('/api/admin/trackings/:id', authenticateToken, authorizeRole(['admin', 'editor']), async (req, res) => {
    try {
        const tracking = await Tracking.findById(req.params.id);
        if (!tracking) return res.status(404).json({ message: 'Tracking not found' });
        res.json(tracking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Update Tracking
app.put('/api/admin/trackings/:id', authenticateToken, authorizeRole(['admin', 'editor']), async (req, res) => {
    try {
        const updatedTracking = await Tracking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedTracking) return res.status(404).json({ message: 'Tracking not found' });
        res.json(updatedTracking);
    } catch (err) {
        console.error('Error updating tracking:', err);
        res.status(400).json({ message: err.message });
    }
});

// Delete Tracking
app.delete('/api/admin/trackings/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const deletedTracking = await Tracking.findByIdAndDelete(req.params.id);
        if (!deletedTracking) return res.status(404).json({ message: 'Tracking not found' });
        res.json({ message: 'Tracking deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Tracking History Routes (Nested) ---

// Add History Event
app.post('/api/admin/trackings/:id/history', authenticateToken, authorizeRole(['admin', 'editor']), async (req, res) => {
    const { date, time, location, description } = req.body;
    try {
        const tracking = await Tracking.findById(req.params.id);
        if (!tracking) return res.status(404).json({ message: 'Tracking not found' });

        tracking.trackingHistory.push({ date, time, location, description });
        tracking.trackingHistory.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)); // Sort by date/time
        await tracking.save();
        res.status(201).json(tracking.trackingHistory);
    } catch (err) {
        console.error('Error adding history event:', err);
        res.status(400).json({ message: err.message });
    }
});

// Update History Event
app.put('/api/admin/trackings/:trackingId/history/:historyId', authenticateToken, authorizeRole(['admin', 'editor']), async (req, res) => {
    const { date, time, location, description } = req.body;
    try {
        const tracking = await Tracking.findById(req.params.trackingId);
        if (!tracking) return res.status(404).json({ message: 'Tracking not found' });

        const historyItem = tracking.trackingHistory.id(req.params.historyId);
        if (!historyItem) return res.status(404).json({ message: 'History event not found' });

        historyItem.set({ date, time, location, description });
        tracking.trackingHistory.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)); // Re-sort
        await tracking.save();
        res.json(historyItem);
    } catch (err) {
        console.error('Error updating history event:', err);
        res.status(400).json({ message: err.message });
    }
});

// Delete History Event
app.delete('/api/admin/trackings/:trackingId/history/:historyId', authenticateToken, authorizeRole(['admin', 'editor']), async (req, res) => {
    try {
        const tracking = await Tracking.findById(req.params.trackingId);
        if (!tracking) return res.status(404).json({ message: 'Tracking not found' });

        tracking.trackingHistory.pull({ _id: req.params.historyId });
        await tracking.save();
        res.json({ message: 'History event deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- User Management Routes (Protected) ---

// Get All Users
app.get('/api/admin/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const users = await User.find({}).select('-password'); // Exclude passwords
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create User
app.post('/api/admin/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const newUser = new User({ username, email, password, role });
        await newUser.save();
        // Respond with user data, but don't send the hashed password back
        const userResponse = newUser.toObject();
        delete userResponse.password;
        res.status(201).json(userResponse);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update User
app.put('/api/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.username = username || user.username;
        user.email = email || user.email;
        user.role = role || user.role;
        if (password) {
            user.password = password; // Pre-save hook will hash this
        }
        await user.save();
        const userResponse = user.toObject();
        delete userResponse.password;
        res.json(userResponse);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete User
app.delete('/api/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- File Upload Routes ---

// Upload Package File
app.post('/api/admin/trackings/:id/files', authenticateToken, authorizeRole(['admin', 'editor']), uploadPackageFile.single('packageFile'), async (req, res) => {
    try {
        const tracking = await Tracking.findById(req.params.id);
        if (!tracking) return res.status(404).json({ message: 'Tracking not found' });

        if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

        const fileData = {
            filename: req.file.originalname,
            path: `/uploads/packages/${req.file.filename}` // Path relative to public folder
        };

        tracking.packageFiles.push(fileData);
        await tracking.save();
        res.status(201).json({ message: 'File uploaded and linked successfully', file: fileData });
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).json({ message: 'Failed to upload file', error: err.message });
    }
});

// Delete Package File
app.delete('/api/admin/trackings/:trackingId/files/:fileId', authenticateToken, authorizeRole(['admin', 'editor']), async (req, res) => {
    try {
        const tracking = await Tracking.findById(req.params.trackingId);
        if (!tracking) return res.status(404).json({ message: 'Tracking not found' });

        const fileItem = tracking.packageFiles.id(req.params.fileId);
        if (!fileItem) return res.status(404).json({ message: 'File not found' });

        // Remove the file from the filesystem
        const filePath = path.join(__dirname, 'public', fileItem.path); // Assuming public is root for uploads
        fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting file from filesystem:", err);
            // Even if fs.unlink fails, remove from DB to maintain consistency
            tracking.packageFiles.pull({ _id: req.params.fileId });
            tracking.save()
                .then(() => res.json({ message: 'File deleted successfully' }))
                .catch(dbErr => res.status(500).json({ message: 'Failed to delete file from DB', error: dbErr.message }));
        });
    } catch (err) {
        console.error('Error deleting file:', err);
        res.status(500).json({ message: 'Failed to delete file', error: err.message });
    }
});

// --- Email Sending Route ---

app.post('/api/admin/send-email', authenticateToken, authorizeRole(['admin', 'editor']), uploadPackageFile.single('emailAttachmentFile'), async (req, res) => {
    const { notificationEmail, emailSubject, notificationMessage, emailTrackingId } = req.body;
    let attachmentPath = null;

    if (req.file) {
        attachmentPath = req.file.path; // Multer saves full path in req.file.path
    }

    try {
        const mailOptions = {
            from: EMAIL_USER,
            to: notificationEmail,
            subject: emailSubject,
            html: `
                <p>Hello,</p>
                <p>${notificationMessage.replace(/\n/g, '<br>')}</p>
                ${emailTrackingId ? `<p>You can track your package here: <a href="http://localhost:${PORT}/track.html?trackingId=${emailTrackingId}">http://localhost:${PORT}/track.html?trackingId=${emailTrackingId}</a></p>` : ''}
                <p>Thank you,</p>
                <p>FedEx Team</p>
            `,
            attachments: attachmentPath ? [{ path: attachmentPath }] : []
        };

        await transporter.sendMail(mailOptions);

        // If file was attached, clean up temporary file after sending email
        if (attachmentPath) {
            fs.unlink(attachmentPath, (err) => {
                if (err) console.error('Error deleting temporary email attachment:', err);
            });
        }

        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (err) {
        console.error('Error sending email:', err);
        // If an error occurred, and a file was uploaded, try to delete it
        if (attachmentPath) {
            fs.unlink(attachmentPath, (err) => {
                if (err) console.error('Error deleting temporary email attachment after send failure:', err);
            });
        }
        res.status(500).json({ message: 'Failed to send email', error: err.message });
    }
});

// Fallback for unhandled routes (e.g., if you only have /admin, not /)
app.get('/', (req, res) => {
    res.send('Welcome to the FedEx API. Please use /admin or /track for specific functionalities.');
});

// Handle the admin dashboard route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
});

// Handle the track page route
app.get('/track', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track.html'));
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
