document.addEventListener('DOMContentLoaded', () => {
  const productGrid = document.getElementById('productGrid');
  const heroCard = document.querySelector('.hero-card');
  const filters = document.querySelectorAll('.filters .chip');
  const inspSlides = document.getElementById('inspSlides');
  const inspDots = document.getElementById('inspDots');
  const inspPrev = document.getElementById('inspPrev');
  const inspNext = document.getElementById('inspNext');

  let allProducts = [];

  // Fetch all necessary data
  const ts = new Date().getTime();
  Promise.all([
    fetch(`data/products.json?v=${ts}`).then(res => res.json()),
    fetch(`data/hero.json?v=${ts}`).then(res => res.json()),
    fetch(`data/inspiration.json?v=${ts}`).then(res => res.json())
  ])
  .then(([productsData, heroData, inspirationData]) => {
    allProducts = Object.values(productsData || {});

    renderProducts(allProducts);
    renderHero(heroData);
    renderInspiration(inspirationData);
  })
  .catch(error => {
    console.error('Error loading site data:', error);
    if (productGrid) productGrid.innerHTML = '<p>Error loading products. Please try again later.</p>';
  });

  // Render products in the grid
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

  // Handle category filtering
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

  // Render hero image
  function renderHero(heroData) {
    if (!heroCard || !heroData.images || heroData.images.length === 0) return;
    const heroImg = document.createElement('img');
    heroImg.src = heroData.images[0];
    heroImg.alt = "Hero image";
    heroCard.appendChild(heroImg);
  }

  // Render inspiration slideshow
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
});
