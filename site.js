/**
 * Main entry point for the public-facing site.
 * Waits for the DOM to be fully loaded, then fetches all necessary
 * data and renders the initial view of the page.
 */
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM & Data Initialization ---
  const productGrid = document.getElementById('productGrid');
  const heroCard = document.querySelector('.hero-card');
  const filters = document.querySelectorAll('.filters .chip');
  const inspSlides = document.getElementById('inspSlides');
  const inspDots = document.getElementById('inspDots');
  const inspPrev = document.getElementById('inspPrev');
  const inspNext = document.getElementById('inspNext');
  const notification = document.getElementById('notification');

  // Product Modal
  const productModal = document.getElementById('productModal');
  const productModalClose = document.getElementById('productModalClose');
  const productThumbnails = document.getElementById('productThumbnails');
  const productSlider = document.getElementById('productSlider');
  const productDetails = document.getElementById('productDetails');

  // Cart
  const cartBtn = document.getElementById('cartBtn');
  const cartCount = document.getElementById('cartCount');
  const cartModal = document.getElementById('cartModal');
  const cartModalClose = document.getElementById('cartModalClose');
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');

  // Checkout Options Modal
  const checkoutOptionsModal = document.getElementById('checkoutOptionsModal');
  const checkoutOptionsClose = document.getElementById('checkoutOptionsClose');
  const whatsappBtn = document.getElementById('whatsappBtn');
  const emailBtn = document.getElementById('emailBtn');


  let allProducts = [];
  let cart = [];

  /**
   * Loads the cart from localStorage and updates the cart count.
   */
  function loadCart() {
    const storedCart = localStorage.getItem('hobbybyrox_cart');
    if (storedCart) {
      cart = JSON.parse(storedCart);
      updateCartCount();
    }
  }

  /**
   * Saves the current cart state to localStorage.
   */
  function saveCart() {
    localStorage.setItem('hobbybyrox_cart', JSON.stringify(cart));
  }

  /**
   * Updates the cart count displayed in the header.
   */
  function updateCartCount() {
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Adds a product to the cart, or increments its quantity if it already exists.
   * @param {string} productId - The ID of the product to add.
   */
  function addToCart(productId) {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      const product = allProducts.find(p => p.id === productId);
      if (product) {
        cart.push({ ...product, quantity: 1 });
      }
    }
    saveCart();
    updateCartCount();
    showNotification();
  }

  /**
   * Renders the items in the shopping cart modal.
   */
  function renderCart() {
    cartItems.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
      cartItems.innerHTML = '<p>Je winkelwagen is leeg.</p>';
      cartTotal.textContent = 'Totaal: € 0,00';
      return;
    }

    cart.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'cart-item';
      itemElement.innerHTML = `
        <img src="${item.thumbnail || item.images[0]}" alt="${item.name}" />
        <div class="item-details">
          <p class="item-name">${item.name} (x${item.quantity})</p>
          <p class="item-price">€ ${(item.price * item.quantity).toFixed(2)}</p>
        </div>
        <button class="remove-item" data-id="${item.id}">&times;</button>
      `;
      cartItems.appendChild(itemElement);
      total += item.price * item.quantity;
    });

    cartTotal.textContent = `Totaal: € ${total.toFixed(2)}`;
  }

  /**
   * Shows a brief notification message.
   * @param {string} message - The message to display.
   */
  function showNotification() {
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
    }, 2000);
  }

  // Initial load
  loadCart();

  // Fetch all necessary data
  const ts = new Date().getTime();
  Promise.all([
    fetch(`data/products.json?v=${ts}`).then(res => res.json()),
    fetch(`data/hero.json?v=${ts}`).then(res => res.json()),
    fetch(`data/inspiration.json?v=${ts}`).then(res => res.json())
  ])
  .then(([productsData, heroData, inspirationData]) => {
    allProducts = Object.keys(productsData || {}).map(key => ({
      id: key,
      ...productsData[key]
    }));

    renderProducts(allProducts);
    renderHero(heroData);
    renderInspiration(inspirationData);
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
        <div class="card-body">
          <h3 class="product-name">${product.name}</h3>
          <p class="price">€ ${product.price.toFixed(2)}</p>
        </div>
        <div class="add">
            <button class="btn ghost" data-id="${product.id}">Bekijk</button>
        </div>
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
        <button class="btn primary add-to-cart" data-id="${product.id}">Toevoegen aan winkelwagen</button>
    `;

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
  }

  productGrid.addEventListener('click', (e) => {
    if (e.target.matches('button[data-id]')) {
      const button = e.target;
      // Ensure it's the "Bekijk" button and not an "add to cart" button inside the modal
      if (button.closest('.modal-content')) return;

      const productId = button.dataset.id;
      const product = allProducts.find(p => p.id === productId);
      if (product) {
        renderProductModal(product);
        productModal.style.display = 'block';
      }
    }
  });

  productModalClose.addEventListener('click', () => {
    productModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === productModal) {
        productModal.style.display = 'none';
    }
  });

  /**
   * Handles category filtering.
   * Adds click event listeners to the category filter chips.
   */
  filters.forEach(filter => {
    filter.addEventListener('click', () => {
      filters.forEach(f => f.classList.remove('active'));
      filter.classList.add('active');
      const category = filter.dataset.filter;
      if (category === 'all') {
        renderProducts(allProducts);
      } else {
        const filteredProducts = allProducts.filter(p => p.category === category);
        renderProducts(filteredProducts);
      }
    });
  });

  /**
   * Renders the hero image.
   * Takes the first image from the hero data and displays it in the hero card.
   *
   * @param {object} heroData - The hero data object.
   * @param {string[]} heroData.images - An array of image URLs for the hero section.
   */
  function renderHero(heroData) {
    if (!heroCard || !heroData.images || heroData.images.length === 0) return;
    const heroImg = document.createElement('img');
    heroImg.src = heroData.images[0];
    heroImg.alt = "Hero image";
    heroCard.appendChild(heroImg);
  }

  /**
   * Renders the inspiration slideshow.
   * Creates slides and navigation dots for each inspiration item.
   * Also sets up event listeners for the previous/next buttons and dots.
   *
   * @param {object} inspirationData - The inspiration data object.
   * @param {string[]} inspirationData.items - An array of image URLs for the inspiration slideshow.
   */
  function renderInspiration(inspirationData) {
    if (!inspSlides || !inspirationData.items || inspirationData.items.length === 0) return;

    const items = inspirationData.items;
    let currentSlide = 0;

    items.forEach((item, index) => {
      const slide = document.createElement('div');
      slide.className = 'slide' + (index === 0 ? ' active' : '');
      slide.innerHTML = `<img src="${item}" alt="Inspiration image ${index + 1}">`;
      inspSlides.appendChild(slide);

      const dot = document.createElement('span');
      dot.className = 'dot' + (index === 0 ? ' active' : '');
      dot.dataset.slide = index;
      inspDots.appendChild(dot);
    });

    const slides = inspSlides.querySelectorAll('.slide');
    const dots = inspDots.querySelectorAll('.dot');

    /**
     * Shows a specific slide in the slideshow.
     * @param {number} index - The index of the slide to show.
     */
    function showSlide(index) {
      slides.forEach(s => s.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      slides[index].classList.add('active');
      dots[index].classList.add('active');
      currentSlide = index;
    }

    inspPrev.addEventListener('click', () => {
      let newIndex = currentSlide - 1;
      if (newIndex < 0) newIndex = items.length - 1;
      showSlide(newIndex);
    });

    inspNext.addEventListener('click', () => {
      let newIndex = currentSlide + 1;
      if (newIndex >= items.length) newIndex = 0;
      showSlide(newIndex);
    });

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        showSlide(parseInt(dot.dataset.slide));
      });
    });
  }

  // --- Event Listeners ---

  // Product Modal: Add to Cart
  productDetails.addEventListener('click', (e) => {
    if (e.target.matches('.add-to-cart')) {
      const productId = e.target.dataset.id;
      addToCart(productId);
      productModal.style.display = 'none'; // Close modal after adding
    }
  });

  // Cart Modal: Open and Close
  cartBtn.addEventListener('click', () => {
    renderCart();
    cartModal.style.display = 'block';
  });

  cartModalClose.addEventListener('click', () => {
    cartModal.style.display = 'none';
  });

  // Cart Modal: Remove Item
  cartItems.addEventListener('click', (e) => {
    if (e.target.matches('.remove-item')) {
      const productId = e.target.dataset.id;
      const itemIndex = cart.findIndex(item => item.id === productId);
      if (itemIndex > -1) {
        cart[itemIndex].quantity--;
        if (cart[itemIndex].quantity === 0) {
          cart.splice(itemIndex, 1);
        }
        saveCart();
        updateCartCount();
        renderCart(); // Re-render the cart modal to show changes
      }
    }
  });

  // Global: Close modals on outside click
  window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
      cartModal.style.display = 'none';
    }
    if (e.target === checkoutOptionsModal) {
      checkoutOptionsModal.style.display = 'none';
    }
  });

  // --- Checkout Logic ---

  checkoutBtn.addEventListener('click', () => {
    if (cart.length > 0) {
      cartModal.style.display = 'none';
      checkoutOptionsModal.style.display = 'block';
    } else {
      alert("Je winkelwagen is leeg!");
    }
  });

  checkoutOptionsClose.addEventListener('click', () => {
    checkoutOptionsModal.style.display = 'none';
  });

  function generateOrderText() {
    let message = "Hallo! Ik wil graag een bestelling plaatsen voor de volgende items:\n\n";
    let total = 0;
    cart.forEach(item => {
      message += `- ${item.name} (x${item.quantity}) - €${(item.price * item.quantity).toFixed(2)}\n`;
      total += item.price * item.quantity;
    });
    message += `\nTotaal: €${total.toFixed(2)}`;
    return message;
  }

  whatsappBtn.addEventListener('click', () => {
    const message = generateOrderText();
    const whatsappUrl = `https://wa.me/31644999980?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  });

  emailBtn.addEventListener('click', () => {
    const message = generateOrderText();
    const emailUrl = `mailto:hobbybyrox@gmail.com?subject=Bestelling via website&body=${encodeURIComponent(message)}`;
    window.location.href = emailUrl;
  });
});
