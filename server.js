// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors middleware
const path = require('path'); // Import path module
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define Article Schema and Model
const articleSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Unique ID for each article
    category: { type: String, required: true },
    headline: { type: String, required: true },
    imageUrl: { type: String, required: true },
    dateline: { type: String, required: true },
    summary: { type: String, required: true },
    fullContent: { type: String, required: true },
    timestamp: { type: Date, default: Date.now } // Automatically set creation date
});

const Article = mongoose.model('Article', articleSchema);

// API Routes

// GET all articles
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await Article.find().sort({ timestamp: -1 }); // Sort by newest first
        res.json(articles);
    } catch (err) {
        console.error('Error fetching articles:', err);
        res.status(500).json({ message: 'Error fetching articles', error: err.message });
    }
});

// POST a new article
app.post('/api/articles', async (req, res) => {
    const { category, headline, imageUrl, dateline, summary, fullContent } = req.body;

    // Basic validation
    if (!category || !headline || !imageUrl || !dateline || !summary || !fullContent) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        // Generate a unique ID for the new article (can be more robust if needed)
        const newId = `${category}-${Date.now()}`;
        const newArticle = new Article({
            id: newId,
            category,
            headline,
            imageUrl,
            dateline,
            summary,
            fullContent
        });

        await newArticle.save();
        res.status(201).json(newArticle); // Respond with the created article
    } catch (err) {
        console.error('Error adding article:', err);
        res.status(500).json({ message: 'Error adding article', error: err.message });
    }
});

// Serve static files from the current directory (where index.html is)
// This allows your frontend HTML and JS files to be served by this same server
app.use(express.static(path.join(__dirname)));

// Catch-all for any other routes to serve index.html (for single-page applications)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
