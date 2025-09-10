# HobbyByRox Website Setup Guide

This guide walks you through setting up the HobbyByRox website, admin panel, and data synchronization server.

## 🚀 Step 1: GitHub Repository Setup

1.  **Create a new public GitHub repository** named `hobbybyrox-site`.
2.  **Add all the generated files** to your local repository folder:
    -   `index.html`
    -   `admin.html`
    -   `merged.css`
    -   `merged.js`
    -   `admin.js`
    -   `README.md` (this file)
    -   Create a `data/` folder and add `products.json`, `hero.json`, and `inspiration.json`.
    -   Create a `server/` folder and add `index.js` and `package.json`.
3.  **Commit and push** the files to the `main` branch.

    ```bash
    git init
    git add .
    git commit -m "Initial project setup"
    git branch -M main
    git remote add origin [https://github.com/gyatboy19/hobbybyrox-site.git](https://github.com/gyatboy19/hobbybyrox-site.git)
    git push -u origin main
    ```

## 🌐 Step 2: Configure GitHub Pages & Domain

1.  **Enable GitHub Pages**:
    -   In your `hobbybyrox-site` repository, go to **Settings > Pages**.
    -   Under "Build and deployment", set the **Source** to **Deploy from a branch**.
    -   Set the **Branch** to **main** and the folder to **`/ (root)**. Click **Save**.

2.  **Add CNAME File**:
    -   In your repository's root, create a new file named `CNAME` (all caps, no extension).
    -   Add a single line to this file with your domain name:
        ```
        hobbybyrox.nl
        ```
    -   Commit and push this file to your repository.

3.  **Configure DNS on GoDaddy**:
    -   Log in to your GoDaddy account and navigate to the DNS settings for `hobbybyrox.nl`.
    -   **For the apex domain (`@`)**: Add the following four `A` records. These are the current official IPs for GitHub Pages.
        ```
        Type: A,  Name: @,  Value: 185.199.108.153
        Type: A,  Name: @,  Value: 185.199.109.153
        Type: A,  Name: @,  Value: 185.199.110.153
        Type: A,  Name: @,  Value: 185.199.111.153
        ```
    -   **For the `www` subdomain**: Add a `CNAME` record to point to your GitHub Pages URL.
        ```
        Type: CNAME,  Name: www,  Value: gyatboy19.github.io.
        ```
    -   **(Note)** It's best practice to choose one version (`www` or non-`www`) as your main domain. GitHub Pages handles the redirect automatically once the CNAME is set up.

4.  **Enforce HTTPS**:
    -   Back in your GitHub repository **Settings > Pages**, your custom domain `hobbybyrox.nl` should appear.
    -   It may take some time for the DNS changes to propagate and for GitHub to issue an SSL certificate.
    -   Once it's ready, a green checkmark will appear. Check the box for **Enforce HTTPS**.

## ☁️ Step 3: Cloudinary Setup for Image Uploads

1.  **Create a Cloudinary Account**: Sign up for a free account at [cloudinary.com](https://cloudinary.com).
2.  **Find your Cloud Name**: On your Cloudinary dashboard, your **Cloud Name** is displayed prominently. Copy this value.
3.  **Create an Unsigned Upload Preset**:
    -   Go to **Settings (gear icon) > Upload**.
    -   Scroll down to **Upload presets** and click **Add upload preset**.
    -   Set **Signing Mode** to **Unsigned**.
    -   In the "Upload Manipulations" section, set the **Folder** to `hobby`. This keeps your uploads organized.
    -   Under "Allowed Formats", add: `jpg, jpeg, png, webp, gif, heic`.
    -   Click **Save** at the bottom.
    -   Copy the **Preset name** (e.g., `ml_default` or whatever you named it). This is your `UPLOAD_PRESET`.

## ⚙️ Step 4: Deploy the Sync Server on Render

1.  **Create a GitHub Personal Access Token (Classic)**:
    -   Go to your GitHub **Settings > Developer settings > Personal access tokens > Tokens (classic)**.
    -   Click **Generate new token (classic)**.
    -   Give it a note (e.g., "HobbyByRox Render Sync").
    -   Set an expiration date.
    -   Select the **`repo`** scope (this will grant full control of public and private repositories).
    -   Click **Generate token** and **copy the token immediately**. You won't see it again.

2.  **Deploy on Render**:
    -   Create a new **Web Service** on Render and connect your `hobbybyrox-site` GitHub repository.
    -   Set the **Root Directory** to `server`. This tells Render to only use the code in the `/server` folder.
    -   Set the **Build Command** to `npm install`.
    -   Set the **Start Command** to `npm start`.
    -   Go to the **Environment** tab and add the following secrets and variables:
        -   `GITHUB_TOKEN`: *Paste your classic PAT here.*
        -   `GITHUB_OWNER`: `gyatboy19`
        -   `GITHUB_REPO`: `hobbybyrox-site`
        -   `GITHUB_BRANCH`: `main`
        -   `PORT`: `10000`
    -   Click **Create Web Service**. After the deployment finishes, copy your service's public URL (e.g., `https://hobbybyrox-sync.onrender.com`).

## ✅ Step 5: Final Configuration

1.  **Update `admin.js`**:
    -   Open the `admin.js` file.
    -   Replace the placeholder values at the top with your actual credentials:
        ```javascript
        const CLOUD_NAME = "YOUR_CLOUD_NAME"; // From Cloudinary Dashboard
        const UPLOAD_PRESET = "YOUR_UNSIGNED_PRESET"; // The name of your unsigned preset
        const SYNC_BASE = "[https://YOUR-RENDER-APP.onrender.com](https://YOUR-RENDER-APP.onrender.com)"; // Your Render service URL
        ```
2.  **Commit and push** your updated `admin.js` file.
3.  Your site is now live! Open `https://hobbybyrox.nl/admin.html` to start managing content.

## 🧪 Test Plan

1.  **Update an Inspiration Image**:
    -   Go to `admin.html`.
    -   Upload a new image to one of the inspiration slots.
    -   Click **Sync to Repo**.
    -   Check your GitHub repo; the `data/inspiration.json` file should be updated with a new commit.
    -   Open `hobbybyrox.nl` in an incognito window to see the change.
2.  **Add a Product from a Phone**:
    -   Open `admin.html` on your phone.
    -   Fill out the "New Product" form and use the "Upload" button to select two photos from your camera roll.
    -   Click **Add**, then **Sync to Repo**.
    -   Verify the product appears on the public site with Cloudinary URLs for the images.
3.  **Offline Test**:
    -   Turn off Wi-Fi/data on your device.
    -   In `admin.html`, try to upload an image. A local preview (base64) should appear, and a warning toast should inform you the upload failed.
    -   Click **Sync to Repo**. The sync payload should not contain the `data:image/...` string. The server will only commit valid Cloudinary URLs.
