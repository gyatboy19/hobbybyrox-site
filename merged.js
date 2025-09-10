// ---------- CONFIGURATION ----------
const DATA_BASE_URL = 'https://raw.githubusercontent.com/gyatboy19/hobbybyrox-site/main/data';
const WHATSAPP_NUMBER = '31644999980'; // No + or 00
const EMAIL_ADDRESS = 'hobbybyrox@gmail.com';

// ---------- HELPERS ----------
function $(id) { return document.getElementById(id); }
function on(id, evt, fn) { const el = $(id); if (el) el.addEventListener(evt, fn); }
function getCart() { return JSON.parse(localStorage.getItem('cart')) || []; }
function getCartQtyByName(name) {
    const cart = getCart();
    const item = cart.find(i => i.name === name);
    return item ? item.quantity : 0;
}
function detectDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    document.body.className = isMobile ? 'mobile' : 'desktop';
}
if ($('year')) $('year').textContent = new Date().getFullYear();
function openAdminModal() { const m = $('adminLoginModal'); if (m) m.style.display = 'block'; }

// ---------- DATA VARIABLES ----------
let products = {};
let heroSlides = [];
let inspirationItems = [];

// ---------- CART LOGIC ----------
let cart = getCart();
function persistCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

function badgeUpdate() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = $('cartCount');
    if (cartCountEl) cartCountEl.textContent = count;
}

function updateCart() {
    const wrap = $('cartItems');
    const totalEl = $('cartTotal');
    if (!wrap || !totalEl) return;

    wrap.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.quantity;
        const product = Object.values(products).find(p => p.name === item.name);
        const thumb = (product && (product.thumbnail || (product.images && product.images[0]))) || '';
        
        const el = document.createElement('div');
        el.className = 'cart-item-container';
        el.innerHTML = `
            <img class="cart-item-image" src="${thumb}" alt="${item.name}" loading="lazy">
            <div class="cart-item-details">
                <p>${item.name}</p>
                <p class="price">€ ${(item.price * item.quantity).toFixed(2)} (${item.quantity} × € ${item.price.toFixed(2)})</p>
            </div>
            <div class="cart-item-actions">
                <button class="btn ghost remove-item" data-name="${item.name}">Verwijder</button>
            </div>`;
        wrap.appendChild(el);
    });
    totalEl.textContent = 'Totaal: € ' + total.toFixed(2);
    wrap.querySelectorAll('.remove-item').forEach(b => b.addEventListener('click', () => {
        cart = cart.filter(i => i.name !== b.dataset.name);
        persistCart();
        updateCart();
        badgeUpdate();
        refreshProductBadges();
    }));
    badgeUpdate();
}

function addToCart(name, price) {
    const found = cart.find(i => i.name === name);
    if (found) {
        found.quantity += 1;
    } else {
        cart.push({ name, price, quantity: 1 });
    }
    persistCart();
    updateCart();
    badgeUpdate();
    refreshProductBadges();
    const n = $('notification');
    if (n) {
        n.classList.add('show');
        setTimeout(() => n.classList.remove('show'), 2000);
    }
}

function generateOrderMessage() {
    if (cart.length === 0) return '';
    let message = "Hoi! Ik wil graag het volgende bestellen:\n\n";
    let total = 0;
    cart.forEach(item => {
        message += `- ${item.name} (x${item.quantity}) - €${(item.price * item.quantity).toFixed(2)}\n`;
        total += item.price * item.quantity;
    });
    message += `\nTotaal: €${total.toFixed(2)}\n\n`;
    message += "Graag hoor ik wat de volgende stappen zijn.\n\nMet vriendelijke groet,";
    return message;
}

// ---------- UI RENDERING ----------
let currentFilter = 'all';
function setActiveChip(filter) {
    document.querySelectorAll('.filters .chip').forEach(c => {
        const isActive = c.dataset.filter === filter;
        c.classList.toggle('active', isActive);
        c.setAttribute('aria-selected', String(isActive));
    });
}
function applyFilter(filter) {
    currentFilter = filter || 'all';
    document.querySelectorAll('#productGrid .card').forEach(card => {
        const matches = (currentFilter === 'all') || (card.dataset.category === currentFilter);
        card.style.display = matches ? '' : 'none';
    });
    setActiveChip(currentFilter);
}

function updateProductGrid() {
    const grid = $('productGrid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(products).forEach(id => {
        const p = products[id];
        const qty = getCartQtyByName(p.name);
        const card = document.createElement('article');
        card.className = 'card';
        card.dataset.category = p.category;
        card.dataset.productId = id;
        card.tabIndex = 0;
        card.setAttribute('aria-label', `Bekijk ${p.name}`);
        card.innerHTML = `
            <img loading="lazy" src="${(p.thumbnail || (p.images && p.images[0])) || ''}" alt="${p.name}">
            <div class="card-body">
                <h3>${p.name}</h3>
                <p class="lead">${p.description}</p>
                <p class="price">€ ${p.price.toFixed(2)}</p>
            </div>
            <div class="add">
                <span>${p.extra || ''}</span>
                <button class="btn primary add-to-cart icon-btn" data-name="${p.name}" data-price="${p.price}" aria-label="Voeg toe aan winkelwagen">
                    🛒
                    <span class="qty-badge" style="${qty ? 'display:grid' : 'display:none'}">${qty}</span>
                </button>
            </div>`;
        if (currentFilter !== 'all' && p.category !== currentFilter) card.style.display = 'none';
        grid.appendChild(card);
    });

    grid.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', e => {
            if (e.target.closest('.add-to-cart')) return;
            showProductModal(card.dataset.productId);
        });
    });

    grid.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            addToCart(btn.dataset.name, parseFloat(btn.dataset.price));
        });
    });
}

function refreshProductBadges() {
    document.querySelectorAll('#productGrid .add-to-cart').forEach(btn => {
        const qty = getCartQtyByName(btn.dataset.name);
        let badge = btn.querySelector('.qty-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'qty-badge';
            btn.appendChild(badge);
        }
        badge.textContent = qty;
        badge.style.display = qty ? 'grid' : 'none';
    });
}

function updateInspirationImages() {
    const items = inspirationItems || [];
    if ($('inspirationImage1')) $('inspirationImage1').src = items[0] || '';
    if ($('inspirationImage2')) $('inspirationImage2').src = items[1] || '';
    if ($('inspirationImage3')) $('inspirationImage3').src = items[2] || '';
}

function updateHeroImages() {
    const host = document.querySelector('.hero-card');
    if (!host) return;
    if (!heroSlides || heroSlides.length === 0) {
        host.innerHTML = `<img src="" alt="HobbyByRox">`; // Placeholder
        return;
    }
    
    host.innerHTML = ''; // Clear previous
    heroSlides.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Hero afbeelding ${i + 1}`;
        img.style.display = i === 0 ? 'block' : 'none';
        host.appendChild(img);
    });

    if (heroSlides.length > 1) {
        let currentIndex = 0;
        const images = host.querySelectorAll('img');
        setInterval(() => {
            images[currentIndex].style.display = 'none';
            currentIndex = (currentIndex + 1) % images.length;
            images[currentIndex].style.display = 'block';
        }, 5000);
    }
}

function showProductModal(id) {
    const p = products[id];
    if (!p) return;
    const modal = $('productModal'), slider = $('productSlider'), details = $('productDetails');
    if (!modal || !slider || !details) return;

    const srcs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    slider.innerHTML = srcs.map((src, i) => `<img src="${src}" alt="${p.name}" style="display:${i === 0 ? 'block' : 'none'}">`).join('');

    details.innerHTML = `
        <h3>${p.name}</h3>
        <p class="lead">${p.description}</p>
        <p class="price">€ ${p.price.toFixed(2)}</p>
        <div class="add">
            <span>${p.extra || ''}</span>
            <button class="btn primary add-to-cart" data-name="${p.name}" data-price="${p.price}">Toevoegen</button>
        </div>`;
    
    details.querySelector('.add-to-cart').addEventListener('click', () => addToCart(p.name, p.price));
    modal.style.display = 'block';
}

// ---------- DATA FETCHING & INITIALIZATION ----------
async function fetchAndStoreData() {
    const cacheBuster = `?t=${Date.now()}`;
    try {
        const [productsRes, heroRes, inspirationRes] = await Promise.all([
            fetch(`${DATA_BASE_URL}/products.json${cacheBuster}`),
            fetch(`${DATA_BASE_URL}/hero.json${cacheBuster}`),
            fetch(`${DATA_BASE_URL}/inspiration.json${cacheBuster}`)
        ]);

        if (productsRes.ok) {
            const productsData = await productsRes.json();
            localStorage.setItem('products', JSON.stringify(productsData));
        }
        if (heroRes.ok) {
            const heroData = await heroRes.json();
            localStorage.setItem('heroSlides', JSON.stringify(heroData.images || []));
        }
        if (inspirationRes.ok) {
            const inspirationData = await inspirationRes.json();
            localStorage.setItem('inspirationItems', JSON.stringify(inspirationData.items || []));
        }
    } catch (error) {
        console.error("Failed to fetch latest data, using local cache.", error);
    }
}

function loadDataFromCache() {
    products = JSON.parse(localStorage.getItem('products')) || {};
    heroSlides = JSON.parse(localStorage.getItem('heroSlides')) || [];
    inspirationItems = JSON.parse(localStorage.getItem('inspirationItems')) || [];
}

async function initializePage() {
    detectDevice();
    await fetchAndStoreData();
    loadDataFromCache();
    
    // Render UI
    updateProductGrid();
    updateInspirationImages();
    updateHeroImages();
    updateCart();
    badgeUpdate();
    refreshProductBadges();

    // Event listeners
    window.addEventListener('resize', detectDevice);
    document.querySelectorAll('.filters .chip').forEach(chip => {
        chip.addEventListener('click', () => applyFilter(chip.dataset.filter));
    });
    on('cartBtn', 'click', () => { const m = $('cartModal'); if (m) m.style.display = 'block'; });

    on('whatsappBtn', 'click', () => {
        if (cart.length === 0) { alert('Winkelwagen is leeg!'); return; }
        const message = generateOrderMessage();
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });

    on('emailBtn', 'click', () => {
        if (cart.length === 0) { alert('Winkelwagen is leeg!'); return; }
        const subject = "Nieuwe bestelling via de website";
        const body = generateOrderMessage();
        const mailtoUrl = `mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
    });
    
    // Modal closing logic
    ['cartModal', 'productModal', 'modal', 'adminLoginModal'].forEach(id => {
        const modal = $(id);
        if (!modal) return;
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
        const closeBtn = $(`${id}Close`);
        if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        }
    });

    // Admin Login (simple, no real auth)
    on('adminLoginBtn', 'click', () => window.location.href = 'admin.html');
}

document.addEventListener('DOMContentLoaded', initializePage);
