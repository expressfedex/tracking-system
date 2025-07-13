// netlify/functions/api.js - Wrapper for your Express app for Netlify Functions

const serverless = require('serverless-http');
const mongoose = require('mongoose');
const app = require('../../server.js'); // Path to your modified server.js

// IMPORTANT: Ensure MONGODB_URI is set in Netlify Environment Variables
const MONGODB_URI = process.env.MONGODB_URI;

let cachedDb = null; // Cache the database connection

exports.handler = async (event, context) => {
    // Allows Netlify to cache the DB connection across invocations (cold starts)
    context.callbackWaitsForEmptyEventLoop = false;

    // Connect to MongoDB if not already connected
    if (cachedDb && mongoose.connections[0].readyState) {
        console.log('MongoDB already connected. Reusing connection.');
    } else {
        console.log('Connecting to MongoDB...');
        try {
            cachedDb = await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                bufferCommands: false, // Disable Mongoose's internal buffering
                serverSelectionTimeoutMS: 5000, // Give up after 5 seconds if connection fails
                dbName: 'fedex_db'
            });
            console.log('MongoDB connected successfully!');
            // Optional: Run initial data population if needed, but carefully
            // This is generally better as a separate one-time script.
            // await require('../../server.js').populateInitialData();
        } catch (err) {
            console.error('MongoDB connection error in Netlify function:', err);
            // Return an error response if DB connection fails
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Failed to connect to database.', error: err.message }),
            };
        }
    }

    // Pass the event to the serverless-wrapped Express app
    const handler = serverless(app);
    return await handler(event, context);
};