// netlify/functions/api.js
const serverless = require('serverless-http');
const app = require('../../server'); // Path to your Express app (server.js)
const mongoose = require('mongoose');

// Cache the database connection across warm invocations
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) { // Check if already connected and ready
        console.log('MongoDB already connected. Reusing connection.');
        return cachedDb;
    }

    console.log('Connecting to MongoDB...');
    try {
        cachedDb = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // IMPORTANT FOR SERVERLESS:
            bufferCommands: false, // Disable Mongoose's internal buffering
            serverSelectionTimeoutMS: 5000, // Timeout after 5s for initial server selection
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });
        console.log('MongoDB connected successfully!');
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        cachedDb = null; // Clear cache on failure to force re-connection next time
        throw error; // Re-throw to propagate the error up
    }
}

// Wrap your Express app with serverless-http
const handler = serverless(app);

// Netlify Function handler
exports.handler = async (event, context) => {
    // Ensure the database connection is established BEFORE processing the request
    try {
        await connectToDatabase();
    } catch (dbError) {
        console.error('Handler caught DB connection error:', dbError);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Database connection failed.', error: dbError.message }),
        };
    }

    // Now, let serverless-http handle the request and pass it to Express.
    // express.json() in your server.js will handle the event.body parsing.
    console.log('[Netlify Function] Passing raw event to serverless-http for Express processing...');
    return handler(event, context);
};