// ======================= CONFIGURATION =======================
// PASTE YOUR CLOUDINARY AND RENDER DETAILS HERE
const CLOUD_NAME = "YOUR_CLOUD_NAME";
const UPLOAD_PRESET = "YOUR_UNSIGNED_PRESET";
const SYNC_BASE = "https://YOUR-RENDER-APP.onrender.com";

// ======================= HELPERS ============================
function $(id) { return document.getElementById(id); }
function toast(msg, isError = false) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = isError ? '#e53e3e' : 'var(--accent-2)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}
function currency(v) { return (Number(v) || 0).toFixed(2); }

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

// ======================= STATE MANAGEMENT =====================
let state = {
    products: {},
    heroSlides: [],
    inspirationItems: [],
};

function loadState() {
    state.products = JSON.parse(localStorage.getItem('admin_products')) || {};
    state.heroSlides = JSON.parse(localStorage.getItem('admin_heroSlides')) || [];
    state.inspirationItems = JSON.parse(localStorage.getItem('admin_inspirationItems')) || [];
}

function saveState() {
    localStorage.setItem('admin_products', JSON.stringify(state.products));
    localStorage.setItem('admin_heroSlides', JSON.stringify(state.heroSlides));
    localStorage.setItem('admin_inspirationItems', JSON.stringify(state.inspirationItems));
}

// ======================= CLOUDINARY UPLOAD =======================
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

function getLocalPreview(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

// ======================= SYNC TO REPO =======================
async function syncToRepo() {
    const syncBtn = $('syncBtn');
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';
    
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
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

// --- Inspiration Items ---
function renderInspirationSlots() {
    const container = $('inspirationSlots');
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const src = state.inspirationItems[i] || '';
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${src}" style="aspect-ratio:4/3; object-fit:cover; background:#eee;">
            <div class="card-body">
                <label>Slot ${i + 1} (upload) <input type="file" class="insp-file" data-index="${i}"></label>
                <label>Slot ${i + 1} (URL) <input type="url" class="insp-url" data-index="${i}" value="${src.startsWith('https://') ? src : ''}"></label>
            </div>`;
        container.appendChild(card);
    }
    container.querySelectorAll('.insp-file').forEach(input => {
        input.addEventListener('change', async e => {
            const index = e.target.dataset.index;
            const file = e.target.files[0];
            if (!file) return;
            toast(`Uploading inspiration ${parseInt(index)+1}...`);
            const cloudinaryUrl = await uploadToCloudinary(file);
            if (cloudinaryUrl) {
                state.inspirationItems[index] = cloudinaryUrl;
                toast('Upload complete!');
            } else {
                const localUrl = await getLocalPreview(file);
                if (localUrl) state.inspirationItems[index] = localUrl;
                toast('Upload failed. Using local preview.', true);
            }
            saveState();
            renderInspirationSlots();
        });
    });
    container.querySelectorAll('.insp-url').forEach(input => {
        input.addEventListener('input', e => {
            const index = e.target.dataset.index;
            state.inspirationItems[index] = e.target.value.trim();
            saveState();
            // No full re-render needed, just update the image src
            e.target.closest('.card').querySelector('img').src = e.target.value;
        });
    });
}


// --- Products ---
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
$('epDeleteBtn').addEventListener('click', () => {
    if (editingId && confirm('Delete this product?')) {
        delete state.products[editingId];
        saveState();
        renderProducts();
        $('editProductModal').style.display = 'none';
    }
});
$('editClose').addEventListener('click', () => $('editProductModal').style.display = 'none');


// --- Import/Export ---
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
function initializeApp() {
    loadState();
    renderHeroSlides();
    renderInspirationSlots();
    renderProducts();
    $('syncBtn').addEventListener('click', syncToRepo);
}

document.addEventListener('DOMContentLoaded', initializeApp);