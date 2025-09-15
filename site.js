// Global variables (ensure these are at the top level)
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
  // ... (keep existing DOM references and initial fetches)

  // Fetch data and render
  const ts = new Date().getTime();
  Promise.all([
    fetch(`data/products.json?v=${ts}`).then(res => res.json()),
    fetch(`data/hero.json?v=${ts}`).then(res => res.json()),
    fetch(`data/inspiration.json?v=${ts}`).then(res => res.json())
  ])
  .then(([productsData, heroData, inspirationData]) => {
    allProducts = Object.keys(productsData || {}).map(key => ({ id: key, ...productsData[key] }));
    renderProducts(allProducts);
    renderHero(heroData);
    renderInspiration(inspirationData);
    updateCartUI();
  })
  .catch(error => console.error('Error loading data:', error));

  // Modal event delegation (refined)
  const productModal = document.getElementById('productModal');
  if (productModal) {
    productModal.addEventListener('click', (e) => {
      if (e.target.matches('.add-to-cart')) {
        e.preventDefault(); // Prevent any default modal behavior
        e.stopPropagation(); // Stop event bubbling to modal close
        const productId = e.target.dataset.id;
        console.log('Add to cart clicked for productId:', productId); // Debug
        addToCart(productId);
      }
      if (e.target === productModal || e.target === document.getElementById('productModalClose')) {
        productModal.style.display = 'none';
      }
    });
  }

  // ... (keep other existing event listeners like productGrid click)
});

// Render product modal (unchanged, but included for context)
function renderProductModal(product) {
  const productSlider = document.getElementById('productSlider');
  const productThumbnails = document.getElementById('productThumbnails');
  const productDetails = document.getElementById('productDetails');

  productSlider.innerHTML = '';
  productThumbnails.innerHTML = '';
  productDetails.innerHTML = '';

  product.images.forEach((imgUrl, index) => {
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = product.name;
    if (index === 0) img.className = 'active';
    productSlider.appendChild(img);

    const thumb = document.createElement('img');
    thumb.src = imgUrl;
    thumb.alt = `Thumbnail ${index + 1}`;
    thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
    thumb.dataset.slide = index;
    productThumbnails.appendChild(thumb);
  });

  productDetails.innerHTML = `
    <h2>${product.name}</h2>
    <p>${product.description || ''}</p>
    <p>€ ${product.price.toFixed(2)}</p>
    <button class="add-to-cart" data-id="${product.id}">Toevoegen aan winkelwagen</button>
  `;

  const thumbnails = productThumbnails.querySelectorAll('.thumbnail');
  const slides = productSlider.querySelectorAll('img');
  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbnails.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const slideIndex = parseInt(thumb.dataset.slide);
      slides.forEach((s, i) => s.classList.toggle('active', i === slideIndex));
    });
  });
}

// Cart functions (ensure these are defined)
function addToCart(productId) {
  console.log('Attempting to add product:', productId); // Debug
  const product = allProducts.find(p => p.id === productId);
  if (!product) {
    console.error('Product not found for ID:', productId);
    return;
  }

  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
  showToast(`${product.name} toegevoegd aan winkelwagen! (${cart.reduce((sum, item) => sum + item.quantity, 0)} items totaal)`);
}

function updateCartUI() {
  const cartIndicator = document.getElementById('cartIndicator');
  if (cartIndicator) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartIndicator.innerHTML = totalItems > 0 ? `<span class="cart-count">${totalItems}</span> <button onclick="openCartModal()">Bekijk winkelwagen</button>` : 'Winkelwagen (leeg)';
  }
}

function showToast(message) {
  const toastEl = document.getElementById('toast');
  if (toastEl) {
    toastEl.textContent = message;
    toastEl.style.display = 'block';
    setTimeout(() => { toastEl.style.display = 'none'; }, 3000);
  } else {
    alert(message); // Fallback
  }
}

function openCartModal() {
  const cartModal = document.getElementById('cartModal');
  const cartItemsContainer = document.getElementById('cartItems');
  if (cartModal && cartItemsContainer) {
    cartItemsContainer.innerHTML = '';
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p>Je winkelwagen is leeg.</p>';
    } else {
      cart.forEach(item => {
        cartItemsContainer.innerHTML += `
          <div>
            <h4>${item.name}</h4>
            <p>€ ${item.price.toFixed(2)} x ${item.quantity} = € ${(item.price * item.quantity).toFixed(2)}</p>
            <button onclick="removeFromCart('${item.id}')">Verwijder</button>
          </div>
        `;
      });
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      cartItemsContainer.innerHTML += `<p><strong>Totaal: € ${total.toFixed(2)}</strong></p><button onclick="checkout()">Afrekenen</button>`;
    }
    cartModal.style.display = 'block';
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  localStorage.setItem('cart', JSON.stringify(cart));
  openCartModal(); // Refresh modal
  updateCartUI();
}

function checkout() {
  alert('Afrekenen: Stuur een bericht via WhatsApp voor betaling en levering!');
  closeCartModal();
}

function closeCartModal() {
  const cartModal = document.getElementById('cartModal');
  if (cartModal) cartModal.style.display = 'none';
}
