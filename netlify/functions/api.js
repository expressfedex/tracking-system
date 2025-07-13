// netlify/functions/api.js
// This file acts as the entry point for your Netlify Function.
// It wraps your Express app.

const serverless = require('serverless-http'); // Using serverless-http to wrap Express
const app = require('../../server'); // Adjust the path to your main Express app file (server.js)

// Create a custom handler function for the Netlify Function
const customHandler = async (event, context) => {
    // Log the raw event body received by the Netlify Function before any parsing
    console.log('[Netlify Function] Raw event.body received:', event.body);
    console.log('[Netlify Function] event.headers[Content-Type]:', event.headers['content-type']);

    // Check if event.body exists and if Content-Type indicates JSON
    if (event.body && event.headers['content-type'] && event.headers['content-type'].includes('application/json')) {
        try {
            // IMPORTANT: Only parse if it's still a string. Netlify sometimes pre-parses,
            // but your logs show it's arriving as a string buffer in req.body for Express.
            if (typeof event.body === 'string') {
                event.body = JSON.parse(event.body);
                console.log('[Netlify Function] Manually parsed JSON body:', event.body);
            }
        } catch (e) {
            console.error('[Netlify Function] Error manually parsing JSON body:', e);
            // If JSON parsing fails, return a 400 Bad Request error immediately
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid JSON format in request body.' }),
            };
        }
    }

    // Now, pass the modified event (with potentially parsed body) to the serverless-http handler,
    // which will then feed it into your Express app (server.js).
    return serverless(app)(event, context);
};

// Export the custom handler function for Netlify
exports.handler = customHandler;