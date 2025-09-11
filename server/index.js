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

if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error("Missing required GitHub environment variables!");
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

// --- GITHUB HELPER ---
async function commitMultipleFiles(files, commitMessage) {
    // 1. Get a reference to the branch
    const { data: refData } = await octokit.git.getRef({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        ref: `heads/${GITHUB_BRANCH}`,
    });
    const parentCommitSha = refData.object.sha;

    // 2. Get the tree of the latest commit
    const { data: parentCommitData } = await octokit.git.getCommit({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        commit_sha: parentCommitSha,
    });
    const baseTreeSha = parentCommitData.tree.sha;

    // 3. Create blobs for each file
    const fileBlobs = await Promise.all(
        files.map(async (file) => {
            const { data: blobData } = await octokit.git.createBlob({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                content: Buffer.from(file.content).toString('base64'),
                encoding: 'base64',
            });
            return {
                path: file.path,
                mode: '100644',
                type: 'blob',
                sha: blobData.sha,
            };
        })
    );

    // 4. Create a new tree
    const { data: treeData } = await octokit.git.createTree({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        base_tree: baseTreeSha,
        tree: fileBlobs,
    });

    // 5. Create a new commit
    const { data: commitData } = await octokit.git.createCommit({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        message: commitMessage,
        tree: treeData.sha,
        parents: [parentCommitSha],
    });

    // 6. Update the branch reference
    await octokit.git.updateRef({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        ref: `heads/${GITHUB_BRANCH}`,
        sha: commitData.sha,
    });

    return commitData.sha;
}


// --- API ENDPOINT ---
app.post('/api/save-products', async (req, res) => {
    try {
        const { products, heroSlides, inspirationItems } = req.body;

        // Map legacy keys if they exist, for backward compatibility
        const heroImages = heroSlides || req.body.heroImages || [];
        const inspItems = inspirationItems || req.body.inspiration || [];

        if (!products || !heroImages || !inspItems) {
            return res.status(400).json({ ok: false, message: 'Missing required data fields.' });
        }

        const files = [
            {
                path: 'data/products.json',
                content: JSON.stringify(products, null, 2),
            },
            {
                path: 'data/hero.json',
                content: JSON.stringify({ images: heroImages }, null, 2),
            },
            {
                path: 'data/inspiration.json',
                content: JSON.stringify({ items: inspItems }, null, 2),
            }
        ];

        const commitMessage = '[SYNC] Update data files via admin panel';
        const commitSha = await commitMultipleFiles(files, commitMessage);

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
