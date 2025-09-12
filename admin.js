// ======================= CONFIGURATION =======================
// PASTE YOUR CLOUDINARY AND RENDER DETAILS HERE
const CLOUD_NAME = "dqj5kjabl";
const UPLOAD_PRESET = "hobbyrox_unsigned";
const SYNC_BASE = "https://hobbybyrox-site.onrender.com";

// ======================= HELPERS ============================
/**
 * A simple shorthand for `document.getElementById`.
 * @param {string} id The ID of the element to get.
 * @returns {HTMLElement} The element with the specified ID.
 */
function $(id) { return document.getElementById(id); }

/**
 * Displays a toast message at the bottom of the screen.
 * @param {string} msg The message to display.
 * @param {boolean} [isError=false] If true, the toast will have a red error style.
 */
function toast(msg, isError = false) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = isError ? '#e53e3e' : 'var(--accent-2)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

/**
 * Formats a number as a currency string with two decimal places.
 * @param {number|string} v The value to format.
 * @returns {string} The formatted currency string.
 */
function currency(v) { return (Number(v) || 0).toFixed(2); }

/**
 * Attaches a status badge element after an input field.
 * This is used to show upload progress or status.
 * @param {HTMLInputElement} inputEl The input element to attach the badge to.
 * @returns {HTMLDivElement} The created or existing badge element.
 */
function attachStatusBadge(inputEl) {
    let badge = inputEl.parentElement.querySelector('.status-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'status-badge';
        badge.style.cssText = 'font-size:12px; margin-top:4px;';
        inputEl.insertAdjacentElement('afterend', badge);
    }
    return badge;
}

// ======================= AUTHENTICATION =======================
function checkAuth() {
    const token = sessionStorage.getItem('admin_token');
    // If no token exists, redirect to the login page.
    if (!token) {
        window.location.href = 'login.html';
    }
}

// ======================= STATE MANAGEMENT =====================
/**
 * The main state object for the admin panel.
 * It holds all the data that can be edited and synced.
 * @type {{products: object, heroSlides: string[], inspirationItems: string[]}}
 */
let state = {
    products: {},
    heroSlides: [],
    inspirationItems: [],
};

/**
 * Loads the application state from localStorage.
 * If no state is found in localStorage, it initializes with empty values.
 */
function loadState() {
    state.products = JSON.parse(localStorage.getItem('admin_products')) || {};
    state.heroSlides = JSON.parse(localStorage.getItem('admin_heroSlides')) || [];
    state.inspirationItems = JSON.parse(localStorage.getItem('admin_inspirationItems')) || [];
}

/**
 * Saves the current application state to localStorage.
 */
function saveState() {
    localStorage.setItem('admin_products', JSON.stringify(state.products));
    localStorage.setItem('admin_heroSlides', JSON.stringify(state.heroSlides));
    localStorage.setItem('admin_inspirationItems', JSON.stringify(state.inspirationItems));
}

// ======================= CLOUDINARY UPLOAD =======================
/**
 * Uploads a file to Cloudinary using a specified unsigned preset.
 * @param {File} file The file to upload.
 * @returns {Promise<string|null>} A promise that resolves with the secure URL of the uploaded image, or null if the upload fails.
 */
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        return null;
    }
}

/**
 * Creates a local base64 preview for a file.
 * This is used to display an image preview immediately after selection, before it has been uploaded.
 * @param {File} file The file to preview.
 * @returns {Promise<string|null>} A promise that resolves with the base64 data URL of the file, or null on error.
 */
function getLocalPreview(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

// ======================= SYNC TO REPO =======================
/**
 * Syncs the current local state to the GitHub repository.
 * It filters out any local base64 image previews and sends the clean data
 * to the backend server, which then updates the JSON files in the repo.
 */
async function syncToRepo() {
    const syncBtn = $('syncBtn');
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';

    const token = sessionStorage.getItem('admin_token');
    if (!token) {
        toast('Authentication error. Please log in again.', true);
        checkAuth(); // Show login screen
        syncBtn.disabled = false;
        syncBtn.textContent = '💾 Sync to Repo';
        return;
    }

    // Filter out any local base64 previews before syncing
    Object.values(state.products).forEach(p => {
        p.images = (p.images || []).filter(url => url.startsWith('https://'));
        if (p.thumbnail && p.thumbnail.startsWith('data:')) {
            p.thumbnail = p.images[0] || '';
        }
    });

    const payload = {
        products: state.products,
        heroSlides: state.heroSlides.filter(url => url.startsWith('https://')),
        inspirationItems: state.inspirationItems.filter(url => url.startsWith('https://')),
    };

    try {
        const response = await fetch(`${SYNC_BASE}/api/save-products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        });

        if (response.status === 401) {
            sessionStorage.removeItem('admin_token');
            toast('Session expired. Please log in again.', true);
            checkAuth();
            return;
        }

        if (!response.ok) throw new Error('Server returned an error');
        const result = await response.json();
        toast(`Sync successful! Commit: ${result.commit.slice(0, 7)}`);
    } catch (error) {
        toast('Sync failed. Check console.', true);
        console.error('Sync error:', error);
    } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = '💾 Sync to Repo';
    }
}

// ======================= UI RENDERING & LOGIC =======================

// --- Hero Slides ---
/**
 * Renders the list of hero slides in the admin panel.
 * Each slide has a preview image and a button to remove it.
 */
function renderHeroSlides() {
    const list = $('heroSlidesList');
    list.innerHTML = '';
    state.heroSlides.forEach((src, i) => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:8px;';
        item.innerHTML = `
            <img src="${src}" style="width:120px; height:auto; border-radius:8px;">
            <button class="btn danger" data-remove="${i}">X</button>`;
        list.appendChild(item);
    });
    list.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.heroSlides.splice(btn.dataset.remove, 1);
            saveState();
            renderHeroSlides();
        });
    });
}

/**
 * Handles adding a new hero image.
 * It can be added from a URL or a file upload.
 * File uploads are sent to Cloudinary.
 */
$('heroAddBtn').addEventListener('click', async () => {
    const urlInput = $('heroNewUrl');
    const fileInput = $('heroNewImage');
    const url = urlInput.value.trim();
    const file = fileInput.files[0];

    if (url) {
        state.heroSlides.push(url);
    } else if (file) {
        toast('Uploading hero image...');
        const cloudinaryUrl = await uploadToCloudinary(file);
        if (cloudinaryUrl) {
            state.heroSlides.push(cloudinaryUrl);
            toast('Upload complete!');
        } else {
            const localUrl = await getLocalPreview(file);
            if (localUrl) state.heroSlides.push(localUrl);
            toast('Upload failed. Using local preview. Sync will skip this image.', true);
        }
    } else {
        return;
    }
    saveState();
    renderHeroSlides();
    urlInput.value = '';
    fileInput.value = '';
});

// --- Inspiration Items (New) ---
/**
 * Render all inspiration images in a grid. Each card includes buttons to
 * move the item up/down or delete it. A note displays the total count.
 */
function renderInspirationSimple() {
    const listEl = document.getElementById('inspListSimple');
    const noteEl = document.getElementById('inspNote');
    if (!listEl || !noteEl) return;
    const items = state.inspirationItems || [];
    if (items.length === 0) {
        noteEl.textContent = 'Nog geen inspiratie-afbeeldingen toegevoegd.';
    } else {
        noteEl.textContent = `Totaal: ${items.length} afbeelding${items.length === 1 ? '' : 'en'}.`;
    }
    listEl.innerHTML = '';
    items.forEach((src, i) => {
        const url = typeof src === 'string' ? src : (src.image || src.url || '');
        const card = document.createElement('div');
        card.className = 'card';
        card.style.padding = '8px';
        card.innerHTML = `
            <img src="${url}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;background:#eee">
            <div style="display:flex;gap:6px;justify-content:space-between;margin-top:6px">
              <div>
                <button class="btn" data-act="up" data-i="${i}" style="padding:4px 6px;font-size:14px">↑</button>
                <button class="btn" data-act="down" data-i="${i}" style="padding:4px 6px;font-size:14px">↓</button>
              </div>
              <button class="btn danger" data-act="del" data-i="${i}">Verwijderen</button>
            </div>`;
        listEl.appendChild(card);
    });
    listEl.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.i);
            const act = btn.dataset.act;
            if (act === 'del') {
                state.inspirationItems.splice(idx, 1);
            } else if (act === 'up' && idx > 0) {
                [state.inspirationItems[idx], state.inspirationItems[idx - 1]] = [state.inspirationItems[idx - 1], state.inspirationItems[idx]];
            } else if (act === 'down' && idx < state.inspirationItems.length - 1) {
                [state.inspirationItems[idx], state.inspirationItems[idx + 1]] = [state.inspirationItems[idx + 1], state.inspirationItems[idx]];
            }
            saveState();
            renderInspirationSimple();
        });
    });
}

/**
 * Add new inspiration images from file input and URL input. Supports
 * multiple file selection and uses Cloudinary for uploading.
 */
async function addInspiration() {
    const fileInput = document.getElementById('inspAddFile');
    const urlInput = document.getElementById('inspAddUrl');
    if (!fileInput || !urlInput) return;
    const files = Array.from(fileInput.files || []);
    const url = urlInput.value.trim();
    let modified = false;
    for (const file of files) {
        const preview = await getLocalPreview(file);
        state.inspirationItems.push(preview);
        modified = true;
        try {
            const uploaded = await uploadToCloudinary(file);
            if (uploaded) {
                state.inspirationItems[state.inspirationItems.length - 1] = uploaded;
            }
        } catch (err) {
            console.warn('Cloudinary upload failed:', err);
        }
    }
    if (url) {
        state.inspirationItems.push(url);
        modified = true;
    }
    if (modified) {
        saveState();
        renderInspirationSimple();
    }
    // Reset inputs
    fileInput.value = '';
    urlInput.value = '';
}


// --- Products ---
/**
 * Renders the list of products in the admin panel.
 * Each product has its name, price, an edit button, and a delete button.
 */
function renderProducts() {
    const list = $('productList');
    list.innerHTML = '';
    Object.keys(state.products).forEach(id => {
        const p = state.products[id];
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:8px; border-bottom:1px solid var(--border);';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${p.thumbnail || ''}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
                <div><strong>${p.name}</strong><br>€ ${currency(p.price)}</div>
            </div>
            <div>
                <button class="btn" data-edit="${id}">Edit</button>
                <button class="btn danger" data-del="${id}">X</button>
            </div>`;
        list.appendChild(div);
    });
    list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.edit)));
    list.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => {
        if (confirm('Delete this product?')) {
            delete state.products[btn.dataset.del];
            saveState();
            renderProducts();
        }
    }));
}

/**
 * Handles adding a new product.
 * It gathers all the data from the new product form, uploads images to Cloudinary,
 * and adds the new product to the state.
 */
$('addProductBtn').addEventListener('click', async () => {
    const p = {
        name: $('npName').value.trim(),
        description: $('npDesc').value.trim(),
        price: parseFloat($('npPrice').value) || 0,
        category: $('npCat').value,
        extra: $('npExtra').value.trim(),
        images: [],
    };
    if (!p.name || !p.price) {
        toast('Name and Price are required.', true);
        return;
    }

    // Process images
    const urls = [$('npUrl1').value.trim(), $('npUrl2').value.trim()];
    const files = [$('npImg1').files[0], $('npImg2').files[0]];
    for (let i = 0; i < 2; i++) {
        if (urls[i]) {
            p.images.push(urls[i]);
        } else if (files[i]) {
            const cloudinaryUrl = await uploadToCloudinary(files[i]);
            if(cloudinaryUrl) p.images.push(cloudinaryUrl);
        }
    }
    p.thumbnail = p.images[0] || '';

    const id = Date.now().toString();
    state.products[id] = p;
    saveState();
    renderProducts();
    ['npName', 'npDesc', 'npPrice', 'npExtra', 'npUrl1', 'npUrl2'].forEach(id => $(id).value = '');
    ['npImg1', 'npImg2'].forEach(id => $(id).value = null);
});

// Edit Modal
let editingId = null;
/**
 * Opens the edit modal for a specific product.
 * It populates the modal's input fields with the data from the selected product.
 * @param {string} id The ID of the product to edit.
 */
function openEditModal(id) {
    editingId = id;
    const p = state.products[id];
    if (!p) return;
    $('epName').value = p.name;
    $('epDesc').value = p.description;
    $('epPrice').value = p.price;
    $('epCat').value = p.category;
    $('epExtra').value = p.extra;
    $('epUrl1').value = (p.images && p.images[0]) || '';
    $('epUrl2').value = (p.images && p.images[1]) || '';
    $('editProductModal').style.display = 'block';
}

/**
 * Handles saving the changes to an edited product.
 * It gathers the updated data from the edit modal, uploads any new images,
 * and updates the product in the state.
 */
$('epSaveBtn').addEventListener('click', async () => {
    if (!editingId) return;
    const p = state.products[editingId];
    p.name = $('epName').value.trim();
    p.description = $('epDesc').value.trim();
    p.price = parseFloat($('epPrice').value) || 0;
    p.category = $('epCat').value;
    p.extra = $('epExtra').value.trim();

    const urls = [$('epUrl1').value.trim(), $('epUrl2').value.trim()];
    const files = [$('epImg1').files[0], $('epImg2').files[0]];
    const newImages = [];
    for (let i = 0; i < 2; i++) {
        if (urls[i]) {
            newImages.push(urls[i]);
        } else if (files[i]) {
            const cloudinaryUrl = await uploadToCloudinary(files[i]);
            if(cloudinaryUrl) newImages.push(cloudinaryUrl);
        } else if (p.images && p.images[i]) {
            // Keep old image if no new one provided
            newImages.push(p.images[i]);
        }
    }
    p.images = newImages;
    p.thumbnail = p.images[0] || '';

    saveState();
    renderProducts();
    $('editProductModal').style.display = 'none';
});

/**
 * Handles deleting a product from the edit modal.
 */
$('epDeleteBtn').addEventListener('click', () => {
    if (editingId && confirm('Delete this product?')) {
        delete state.products[editingId];
        saveState();
        renderProducts();
        $('editProductModal').style.display = 'none';
    }
});

/**
 * Handles closing the edit modal.
 */
$('editClose').addEventListener('click', () => $('editProductModal').style.display = 'none');


// --- Import/Export ---
/**
 * Handles exporting the current state to a JSON file.
 */
$('exportBtn').addEventListener('click', () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hobbybyrox-backup.json';
    a.click();
    URL.revokeObjectURL(url);
});

/**
 * Handles importing state from a JSON file.
 */
$('importBtn').addEventListener('click', () => {
    const file = $('importFile').files[0];
    if (!file) { toast('Please select a file.', true); return; }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const importedState = JSON.parse(e.target.result);
            if (importedState.products && importedState.heroSlides && importedState.inspirationItems) {
                if (confirm('This will replace all current data. Are you sure?')) {
                    state = importedState;
                    saveState();
                    initializeApp();
                    toast('Import successful!');
                }
            } else {
                toast('Invalid backup file format.', true);
            }
        } catch (err) {
            toast('Failed to read JSON file.', true);
        }
    };
    reader.readAsText(file);
});


// ======================= INITIALIZATION =======================
/**
 * Initializes the admin panel application.
 * This function loads the state from localStorage and renders all the UI components.
 */
function initializeApp() {
    loadState();
    renderHeroSlides();
    // Render inspiration items using the new manager
    renderInspirationSimple();
    // Render products
    renderProducts();
    // Attach sync handler
    $('syncBtn').addEventListener('click', syncToRepo);
    // Attach inspiration add handler if present
    const addBtn = document.getElementById('inspAddBtn');
    if (addBtn) addBtn.addEventListener('click', addInspiration);
}

/**
 * Main entry point for the admin panel.
 * Waits for the DOM to be fully loaded before initializing the application.
 */
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeApp();
});
