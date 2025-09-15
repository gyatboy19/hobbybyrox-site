/**
 * Main entry point for the public-facing site.
 * Waits for the DOM to be fully loaded, then fetches all necessary
 * data and renders the initial view of the page.
 */
document.addEventListener('DOMContentLoaded', () => {
  const productGrid = document.getElementById('productGrid');
  const heroCard = document.querySelector('.hero-card');
  const filters = document.querySelectorAll('.filters .chip');
  const inspSlides = document.getElementById('inspSlides');
  const inspDots = document.getElementById('inspDots');
  const inspPrev = document.getElementById('inspPrev');
  const inspNext = document.getElementById('inspNext');
  const productModal = document.getElementById('productModal');
  const productModalClose = document.getElementById('productModalClose');
  const productThumbnails = document.getElementById('productThumbnails');
  const productSlider = document.getElementById('productSlider');
  const productDetails = document.getElementById('productDetails');
  const cartIndicator = document.getElementById('cartIndicator'); // New: Cart count in header
  const cartModal = document.getElementById('cartModal'); // New: Cart modal
  const cartModalClose = document.getElementById('cartModalClose'); // New
  const cartItemsContainer = document.getElementById('cartItems'); // New: Where cart renders
  let allProducts = [];

  // New: Cart state management
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartIndicator) {
      cartIndicator.innerHTML = totalItems > 0 ? `<span class="cart-count">${totalItems}</span> <button onclick="openCartModal()">Bekijk winkelwagen</button>` : 'Winkelwagen (leeg)';
    }
  }

  // New: Functions for cart
  function addToCart(productId) {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      const product = allProducts.find(p => p.id === productId);
      if (product) {
        cart.push({ ...product, quantity: 1 });
      }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    alert(`${product.name} toegevoegd aan winkelwagen! (${cart.reduce((sum, item) => sum + item.quantity, 0)} items totaal)`);
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartUI();
  }

  function renderCart() {
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p>Je winkelwagen is leeg.</p>';
      return;
    }
    cart.forEach(item => {
      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      cartItem.innerHTML = `
        <h4>${item.name}</h4>
        <p>€ ${item.price.toFixed(2)} x ${item.quantity} = € ${(item.price * item.quantity).toFixed(2)}</p>
        <button onclick="removeFromCart('${item.id}')">Verwijder</button>
      `;
      cartItemsContainer.appendChild(cartItem);
    });
    // Add total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartItemsContainer.innerHTML += `<p><strong>Totaal: € ${total.toFixed(2)}</strong></p><button onclick="checkout()">Afrekenen</button>`;
  }

  function openCartModal() {
    renderCart();
    if (cartModal) cartModal.style.display = 'block';
  }

  function closeCartModal() {
    if (cartModal) cartModal.style.display = 'none';
  }

  // New: Placeholder checkout (extend as needed, e.g., to form/email)
  function checkout() {
    alert('Afrekenen: Stuur een bericht via WhatsApp voor betaling en levering!');
    closeCartModal();
  }

  // Fetch all necessary data
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
      updateCartUI(); // New: Init cart UI
    })
    .catch(error => {
      console.error('Error loading site data:', error);
      if (productGrid) productGrid.innerHTML = '<p>Error loading products. Please try again later.</p>';
    });

  /**
   * Renders a list of products into the product grid.
   * Clears the existing grid and populates it with new product cards.
   *
   * @param {object[]} productsToRender - An array of product objects to display.
   * @param {string} productsToRender[].id - The unique ID of the product.
   * @param {string} productsToRender[].name - The name of the product.
   * @param {number} productsToRender[].price - The price of the product.
   * @param {string[]} productsToRender[].images - An array of image URLs for the product.
   * @param {string} [productsToRender[].thumbnail] - The URL for the product's thumbnail image.
   */
  function renderProducts(productsToRender) {
    if (!productGrid) return;
    productGrid.innerHTML = '';
    if (productsToRender.length === 0) {
      productGrid.innerHTML = '<p>No products available at the moment.</p>';
      return;
    }
    productsToRender.forEach(product => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${product.thumbnail || product.images[0]}" alt="${product.name}" loading="lazy">
        <h3>${product.name}</h3>
        <p>€ ${product.price.toFixed(2)}</p>
        <button class="btn btn-secondary" data-id="${product.id}">Bekijk</button>
      `;
      productGrid.appendChild(card);
    });
  }

  function renderProductModal(product) {
    productSlider.innerHTML = '';
    productThumbnails.innerHTML = '';
    productDetails.innerHTML = '';
    product.images.forEach((imgUrl, index) => {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = product.name;
      if (index === 0) {
        img.className = 'active';
      }
      productSlider.appendChild(img);

      const thumb = document.createElement('img');
      thumb.src = imgUrl;
      thumb.alt = `Thumbnail ${index + 1}`;
      thumb.className = 'thumbnail' + (index === 0 ? ' active' : '');
      thumb.dataset.slide = index;
      productThumbnails.appendChild(thumb);
    });
    productDetails.innerHTML = `
      <h2>${product.name}</h2>
      <p>${product.description}</p>
      <p class="price">€ ${product.price.toFixed(2)}</p>
      <button class="btn btn-primary add-to-cart-btn" data-id="${product.id}">Toevoegen aan winkelwagen</button>
    `;

    // Thumbnail click handlers for slider
    const thumbnails = productThumbnails.querySelectorAll('.thumbnail');
    const slides = productSlider.querySelectorAll('img');
    thumbnails.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbnails.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const slideIndex = thumb.dataset.slide;
        slides.forEach((s, i) => {
          s.classList.toggle('active', i == slideIndex);
        });
      });
    });

    // New: Add to cart button listener (delegated)
    const addToCartBtn = productDetails.querySelector('.add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => addToCart(product.id));
    }
  }

  // Existing: Product grid click for modal
  productGrid.addEventListener('click', (e) => {
    if (e.target.matches('button[data-id]')) {
      const button = e.target;
      if (button.closest('.modal-content')) return; // Avoid nested modals
      const productId = button.dataset.id;
      const product = allProducts.find(p => p.id === productId);
      if (product) {
        renderProductModal(product);
        if (productModal) productModal.style.display = 'block';
      }
    }
  });

  // Existing modal closes (add if missing)
  if (productModalClose) {
    productModalClose.addEventListener('click', () => { productModal.style.display = 'none'; });
  }
  window.addEventListener('click', (e) => {
    if (e.target === productModal) { productModal.style.display = 'none'; }
  });

  // New: Cart modal handlers
  if (cartModalClose) {
    cartModalClose.addEventListener('click', closeCartModal);
  }
  window.addEventListener('click', (e) => {
    if (e.target === cartModal) { closeCartModal(); }
  });

  // Existing: Hero render (stub if not defined)
  function renderHero(heroData) {
    if (!heroCard || !heroData?.image) return;
    heroCard.style.backgroundImage = `url(${heroData.image})`;
    // Add more if needed
  }

  // Existing: Inspiration slider (stub if not fully defined)
  function renderInspiration(inspirationData) {
    if (!inspSlides || !inspirationData?.images) return;
    inspSlides.innerHTML = inspirationData.images.map(img => `<img src="${img}" alt="Inspiration">`).join('');
    // Add slider logic if needed (dots, prev/next)
    if (inspPrev && inspNext) {
      // Basic slider implementation here if missing
    }
  }

  // Init cart UI
  updateCartUI();
});
