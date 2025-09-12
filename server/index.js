const express = require('express');
const cors = require('cors');
const { Octokit } = require('@octokit/rest');
const { Buffer } = require('buffer');

const app = express();
const PORT = process.env.PORT || 10000;

// --- CONFIGURATION ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error("Missing required GitHub or Admin environment variables! Ensure ADMIN_USERNAME and ADMIN_PASSWORD are set.");
    process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// --- MIDDLEWARE ---
app.use(cors({
    origin: [
        `https://${GITHUB_OWNER}.github.io`,
        'http://localhost:8000', // For local testing
        'http://127.0.0.1:5500', // For Live Server
        'https://hobbybyrox.nl',
        'https://www.hobbybyrox.nl'
    ]
}));
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for potential base64 images

// --- AUTHENTICATION ---
/**
 * Middleware to check for a valid admin password in the Authorization header.
 * The password should be sent as `Authorization: Bearer <password>`.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ ok: false, message: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split(' ')[1];
    if (token !== ADMIN_PASSWORD) {
        return res.status(401).json({ ok: false, message: 'Unauthorized: Invalid token' });
    }
    next();
};

// --- GITHUB HELPER ---
/**
 * Creates a new file or updates an existing file in the GitHub repository.
 * It first tries to get the SHA of an existing file. If the file doesn't exist,
 * it creates it. If it does exist, it updates it using the retrieved SHA.
 *
 * @param {string} path - The full path to the file in the repository (e.g., 'data/products.json').
 * @param {string} content - The string content to be stored in the file.
 * @returns {Promise<string>} A promise that resolves with the SHA of the commit.
 */
async function upsertFile(path, content) {
    let sha;
    try {
        const { data } = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path,
            ref: GITHUB_BRANCH,
        });
        sha = data.sha;
    } catch (error) {
        if (error.status !== 404) throw error;
        // File doesn't exist, sha remains undefined
    }

    const { data: { commit } } = await octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path,
        message: `[SYNC] Update ${path} via admin panel`,
        content: Buffer.from(content).toString('base64'),
        branch: GITHUB_BRANCH,
        sha, // If sha is undefined, it's a new file
    });

    return commit.sha;
}


// --- API ENDPOINT ---

/**
 * Handles login requests.
 * Checks credentials against environment variables.
 * On success, returns a token (the admin password).
 */
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.json({ ok: true, token: ADMIN_PASSWORD });
    } else {
        res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
});

/**
 * Handles the API request to save all site data.
 * It receives product, hero, and inspiration data in the request body,
 * stringifies them, and uses the `upsertFile` helper to save each
 * data type to its corresponding JSON file in the `data/` directory
 * of the GitHub repository.
 *
 * @param {object} req - The Express request object.
 * @param {object} req.body - The parsed JSON body of the request.
 * @param {object} req.body.products - A map of product objects.
 * @param {string[]} req.body.heroSlides - An array of hero image URLs.
 * @param {string[]} req.body.inspirationItems - An array of inspiration image URLs.
 * @param {object} res - The Express response object.
 */
app.post('/api/save-products', authenticate, async (req, res) => {
    try {
        const { products, heroSlides, inspirationItems } = req.body;

        // Map legacy keys if they exist, for backward compatibility
        const heroImages = heroSlides || req.body.heroImages || [];
        const inspItems = inspirationItems || req.body.inspiration || [];

        if (!products || !heroImages || !inspItems) {
            return res.status(400).json({ ok: false, message: 'Missing required data fields.' });
        }

        const productsContent = JSON.stringify(products, null, 2);
        const heroContent = JSON.stringify({ images: heroImages }, null, 2);
        const inspirationContent = JSON.stringify({ items: inspItems }, null, 2);

        // Perform updates
        const commitSha = await upsertFile('data/products.json', productsContent);
        await upsertFile('data/hero.json', heroContent);
        await upsertFile('data/inspiration.json', inspirationContent);

        res.status(200).json({ ok: true, commit: commitSha });

    } catch (error) {
        console.error('Error during GitHub sync:', error);
        res.status(500).json({ ok: false, message: 'Failed to sync with GitHub repository.', error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('HobbyByRox Sync Server is running.');
});


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
