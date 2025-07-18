// server.js
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Keep path for other potential uses
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: Replace with your actual Google Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = '875578945883-b9ig8c0iojdr1opfnintrj9abtu42ef1.apps.googleusercontent.com'; // <--- REPLACE THIS
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// IMPORTANT: This key MUST be set in your .env file (e.g., JWT_SECRET=your_long_random_string)
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable parsing of JSON request bodies

// MongoDB Connection
// This URI MUST be set in your .env file (e.g., MONGO_URI=mongodb://localhost:27017/likanews)
const mongoURI = process.env.MONGO_URI;

// Check if MONGO_URI and JWT_SECRET are defined
if (!mongoURI) {
    console.error('Error: MONGO_URI environment variable is not set. Please create a .env file or set the variable.');
    process.exit(1); // Exit the process if critical variable is missing
}
if (!JWT_SECRET) {
    console.error('Error: JWT_SECRET environment variable is not set. Please create a .env file or set the variable.');
    process.exit(1); // Exit the process if critical variable is missing
}


mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define User Schema and Model
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String },
    picture: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Define Article Schema and Model
const articleSchema = new mongoose.Schema({
    // MongoDB automatically creates _id, so we don't need a custom 'id' field unless for specific use cases
    category: { type: String, required: true },
    headline: { type: String, required: true },
    imageUrl: { type: String, required: true },
    dateline: { type: String, required: true },
    summary: { type: String, required: true },
    fullContent: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }, // Automatically set creation date
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Link to the user who created it
});

const Article = mongoose.model('Article', articleSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // If no token, unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // If token is not valid or expired
        req.user = user; // Attach user payload to request
        next();
    });
};

// API Routes

// Google OAuth Login Endpoint
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body; // This is the ID token from Google

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        let user = await User.findOne({ googleId });

        if (!user) {
            // If user doesn't exist, create a new one
            user = new User({ googleId, email, name, picture });
            await user.save();
        }

        // Generate a JWT token for the user
        const accessToken = jwt.sign(
            { userId: user._id, email: user.email, name: user.name, picture: user.picture },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.json({ message: 'Login successful', token: accessToken, user: { email: user.email, name: user.name, picture: user.picture } });

    } catch (error) {
        console.error('Google ID token verification failed:', error);
        res.status(401).json({ message: 'Authentication failed', error: error.message });
    }
});

// GET all articles (publicly accessible for now)
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await Article.find().sort({ timestamp: -1 }); // Sort by newest first
        res.json(articles);
    } catch (err) {
        console.error('Error fetching articles:', err);
        res.status(500).json({ message: 'Error fetching articles', error: err.message });
    }
});

// POST a new article (requires authentication)
app.post('/api/articles', authenticateToken, async (req, res) => {
    const { category, headline, imageUrl, dateline, summary, fullContent } = req.body;
    const authorId = req.user.userId; // Get author ID from the authenticated token

    // Basic validation
    if (!category || !headline || !imageUrl || !dateline || !summary || !fullContent) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const newArticle = new Article({
            category,
            headline,
            imageUrl,
            dateline,
            summary,
            fullContent,
            author: authorId // Assign the authenticated user as the author
        });

        await newArticle.save();
        res.status(201).json(newArticle); // Respond with the created article
    } catch (err) {
        console.error('Error adding article:', err);
        res.status(500).json({ message: 'Error adding article', error: err.message });
    }
});

// Serve static files from the current directory (where server.js is)
app.use(express.static('./'));

// Catch-all for any other routes to serve index.html
app.get('*', (req, res) => {
    res.sendFile('index.html', { root: './' });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
