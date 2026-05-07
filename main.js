/* ===== DnD Lux — Shared JS ===== */

// ---------- Mock Data ----------
const LISTINGS = [
  { id: 1, name: 'Birkin 30 Togo', brand: 'Hermès', category: 'bags', price: 450, available: true, condition: 'Pristine', rating: 4.9, reviews: 28, img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80', desc: 'An icon of haute couture craftsmanship. Hand-stitched in supple Togo calfskin with palladium hardware. Reserved for the discerning few.' },
  { id: 2, name: 'Daytona Cosmograph', brand: 'Rolex', category: 'watches', price: 380, available: true, condition: 'Mint', rating: 5.0, reviews: 41, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', desc: 'The legendary chronograph in stainless steel with black dial. A motorsport heritage piece treasured by collectors worldwide.' },
  { id: 3, name: 'Diamond Tennis Bracelet', brand: 'Cartier', category: 'jewellery', price: 290, available: true, condition: 'Excellent', rating: 4.8, reviews: 19, img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&q=80', desc: 'Brilliant-cut diamonds set in 18k white gold. Total carat weight 5.0ct. A timeless statement of refinement.' },
  { id: 4, name: 'Lady Dior Medium', brand: 'Dior', category: 'bags', price: 220, available: true, condition: 'Pristine', rating: 4.9, reviews: 33, img: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80', desc: 'The signature cannage quilted lambskin handbag. Sophisticated geometry meets feminine grace.' },
  { id: 5, name: 'Royal Oak 41mm', brand: 'Audemars Piguet', category: 'watches', price: 520, available: false, condition: 'Mint', rating: 5.0, reviews: 22, img: 'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=800&q=80', desc: 'The octagonal bezel that redefined luxury sport watches. Self-winding manufacture calibre 4302.' },
  { id: 6, name: 'Saddle Pearl Earrings', brand: 'Mikimoto', category: 'jewellery', price: 145, available: true, condition: 'Excellent', rating: 4.7, reviews: 15, img: 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=800&q=80', desc: 'Akoya cultured pearls of exceptional lustre, set in 18k yellow gold. Quietly luminous.' },
  { id: 7, name: 'Classic Flap Medium', brand: 'Chanel', category: 'bags', price: 310, available: true, condition: 'Pristine', rating: 5.0, reviews: 47, img: 'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=800&q=80', desc: 'Caviar leather with gold-tone CC clasp. The handbag every wardrobe aspires toward.' },
  { id: 8, name: 'Loafer in Calfskin', brand: 'Gucci', category: 'shoes', price: 95, available: true, condition: 'Excellent', rating: 4.6, reviews: 12, img: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80', desc: 'The horsebit loafer rendered in glove-soft black calfskin. Italian craftsmanship since 1953.' },
  { id: 9, name: 'Submariner Date', brand: 'Rolex', category: 'watches', price: 340, available: true, condition: 'Pristine', rating: 4.9, reviews: 36, img: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&q=80', desc: 'Oystersteel diving instrument with black ceramic Cerachrom bezel. Water resistant to 300 metres.' },
  { id: 10, name: 'Capucines BB', brand: 'Louis Vuitton', category: 'bags', price: 260, available: true, condition: 'Mint', rating: 4.8, reviews: 21, img: 'https://images.unsplash.com/photo-1601369850391-3d3c4d827c98?w=800&q=80', desc: 'Hand-finished Taurillon leather with the iconic LV signature flower. Effortless, architectural elegance.' },
  { id: 11, name: 'Panthère Ring', brand: 'Cartier', category: 'jewellery', price: 175, available: false, condition: 'Pristine', rating: 5.0, reviews: 14, img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80', desc: '18k yellow gold with tsavorite garnet eyes and onyx spots. The maison\'s legendary feline reborn on the finger.' },
  { id: 12, name: 'Heeled Mule Crystal', brand: 'Manolo Blahnik', category: 'shoes', price: 110, available: true, condition: 'Excellent', rating: 4.7, reviews: 18, img: 'https://images.unsplash.com/photo-1596944946297-11d6b2f64ec9?w=800&q=80', desc: 'Crystal-embellished satin upper on a slim 90mm heel. Couture footwork for occasion wear.' }
];

const LISTERS = [
  { name: 'Isabella V.', initials: 'IV', verified: true, rating: 4.96, lists: 42 },
  { name: 'Marcus W.', initials: 'MW', verified: true, rating: 4.92, lists: 28 },
  { name: 'Sophie L.', initials: 'SL', verified: true, rating: 4.98, lists: 67 },
  { name: 'Adrian K.', initials: 'AK', verified: true, rating: 4.89, lists: 19 }
];

// ---------- Helpers ----------
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

const formatPrice = (n) => `£${n.toLocaleString()}`;

const getQueryParam = (name) => new URLSearchParams(location.search).get(name);

function renderListingCard(item) {
  const lister = LISTERS[item.id % LISTERS.length];
  return `
    <a href="listing.html?id=${item.id}" class="listing-card" data-id="${item.id}">
      <div class="listing-img">
        <img src="${item.img}" alt="${item.brand} ${item.name}" loading="lazy">
        <span class="badge ${item.available ? '' : 'unavailable'}">
          ${item.available ? 'Available' : 'Booked'}
        </span>
        <button class="fav-btn" aria-label="Save" onclick="event.preventDefault(); event.stopPropagation(); this.querySelector('i').classList.toggle('fas'); this.querySelector('i').classList.toggle('far');">
          <i class="far fa-heart"></i>
        </button>
      </div>
      <div class="listing-body">
        <div class="listing-brand">${item.brand}</div>
        <div class="listing-name">${item.name}</div>
        <div class="listing-foot">
          <div class="listing-price">${formatPrice(item.price)}<small>/day</small></div>
          <div class="listing-rating"><i class="fas fa-star"></i>${item.rating.toFixed(1)}</div>
        </div>
      </div>
    </a>
  `;
}

// ---------- Nav: mobile toggle + active state ----------
function initNav() {
  const toggle = $('.nav-toggle');
  const links = $('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  const path = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ---------- Home page ----------
function initHome() {
  const grid = $('#featured-grid');
  if (!grid) return;
  const featured = LISTINGS.slice(0, 6);
  grid.innerHTML = featured.map(renderListingCard).join('');
}

// ---------- Browse page ----------
function initBrowse() {
  const grid = $('#browse-grid');
  if (!grid) return;

  const state = {
    categories: new Set(),
    brands: new Set(),
    minPrice: 0,
    maxPrice: 1000,
    sort: 'featured'
  };

  function applyFilters() {
    let result = LISTINGS.filter(item => {
      if (state.categories.size && !state.categories.has(item.category)) return false;
      if (state.brands.size && !state.brands.has(item.brand)) return false;
      if (item.price < state.minPrice || item.price > state.maxPrice) return false;
      return true;
    });

    switch (state.sort) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      default: break;
    }

    grid.innerHTML = result.length
      ? result.map(renderListingCard).join('')
      : `<div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--text-muted);">No items match your filters. Try widening your selection.</div>`;

    const countEl = $('#results-count');
    if (countEl) countEl.innerHTML = `Showing <strong>${result.length}</strong> of ${LISTINGS.length} pieces`;
  }

  $$('input[name="category"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.checked ? state.categories.add(cb.value) : state.categories.delete(cb.value);
      applyFilters();
    });
  });

  $$('input[name="brand"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.checked ? state.brands.add(cb.value) : state.brands.delete(cb.value);
      applyFilters();
    });
  });

  const minIn = $('#price-min');
  const maxIn = $('#price-max');
  [minIn, maxIn].forEach(el => el && el.addEventListener('input', () => {
    state.minPrice = parseFloat(minIn.value) || 0;
    state.maxPrice = parseFloat(maxIn.value) || 10000;
    applyFilters();
  }));

  const sortSel = $('#sort-select');
  if (sortSel) sortSel.addEventListener('change', () => {
    state.sort = sortSel.value;
    applyFilters();
  });

  // Pre-apply category from URL
  const cat = getQueryParam('category');
  if (cat) {
    const cb = $(`input[name="category"][value="${cat}"]`);
    if (cb) { cb.checked = true; state.categories.add(cat); }
  }

  applyFilters();
}

// ---------- Listing detail page ----------
function initListing() {
  const wrap = $('#listing-detail');
  if (!wrap) return;

  const id = parseInt(getQueryParam('id') || '1', 10);
  const item = LISTINGS.find(x => x.id === id) || LISTINGS[0];
  const lister = LISTERS[item.id % LISTERS.length];

  document.title = `${item.brand} ${item.name} — DnD Lux`;

  // Build extra gallery thumbs (reuse other listing images for variety)
  const otherImgs = LISTINGS.filter(x => x.id !== item.id).slice(0, 3).map(x => x.img);
  const allImgs = [item.img, ...otherImgs];

  wrap.innerHTML = `
    <div class="gallery">
      <div class="main-img"><img id="main-img" src="${item.img}" alt="${item.name}"></div>
      <div class="thumbs">
        ${allImgs.map((src, i) => `
          <div class="thumb ${i === 0 ? 'active' : ''}" data-src="${src}">
            <img src="${src}" alt="View ${i + 1}">
          </div>
        `).join('')}
      </div>
    </div>

    <div class="detail-side">
      <div class="breadcrumb">
        <a href="index.html">Home</a><i class="fas fa-chevron-right"></i>
        <a href="browse.html">Browse</a><i class="fas fa-chevron-right"></i>
        <span style="color:var(--text-muted)">${item.brand}</span>
      </div>
      <div class="brand-line">${item.brand}</div>
      <h1>${item.name}</h1>

      <div class="meta-row">
        <div class="meta-item"><i class="fas fa-star"></i><strong>${item.rating}</strong>(${item.reviews} reviews)</div>
        <div class="meta-item"><i class="fas fa-shield-check"></i>Authenticated</div>
        <div class="meta-item"><strong>Condition:</strong>${item.condition}</div>
      </div>

      <p class="description">${item.desc}</p>

      <ul class="feature-list">
        <li><i class="fas fa-check"></i>Authenticated by independent specialists</li>
        <li><i class="fas fa-check"></i>Insured during the rental period up to £25,000</li>
        <li><i class="fas fa-check"></i>White-glove delivery and return service</li>
        <li><i class="fas fa-check"></i>Professional cleaning included</li>
      </ul>

      <div class="booking-card">
        <div class="price-line">
          <span class="price">${formatPrice(item.price)}</span>
          <span class="unit">per day</span>
        </div>

        <div class="date-row">
          <div class="field">
            <label>Pick-up</label>
            <input type="date" id="date-from" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="field">
            <label>Return</label>
            <input type="date" id="date-to" value="${new Date(Date.now()+3*864e5).toISOString().split('T')[0]}">
          </div>
        </div>

        <div class="field">
          <label>Days</label>
          <select id="days-sel">
            ${[1,2,3,4,5,7,10,14].map(d => `<option value="${d}" ${d===3?'selected':''}>${d} day${d>1?'s':''}</option>`).join('')}
          </select>
        </div>

        <div class="cost-summary">
          <div class="cost-row"><span>${formatPrice(item.price)} × <span id="days-display">3</span> days</span><span id="subtotal">${formatPrice(item.price*3)}</span></div>
          <div class="cost-row"><span>Service fee</span><span id="service-fee">${formatPrice(Math.round(item.price*3*0.08))}</span></div>
          <div class="cost-row"><span>Insurance</span><span>£25</span></div>
          <div class="cost-row total"><span>Total</span><span id="total">${formatPrice(item.price*3 + Math.round(item.price*3*0.08) + 25)}</span></div>
        </div>

        <button class="btn btn-primary btn-block" ${item.available ? '' : 'disabled style="opacity:0.5;cursor:not-allowed"'}>
          ${item.available ? 'Reserve this piece' : 'Currently booked'}
        </button>
      </div>

      <div class="lister-card">
        <div class="lister-avatar">${lister.initials}</div>
        <div class="lister-info">
          <div class="lister-name">${lister.name}${lister.verified ? '<i class="fas fa-check-circle" title="Verified"></i>' : ''}</div>
          <div class="lister-meta">
            <i class="fas fa-star"></i>${lister.rating} rating · ${lister.lists} active listings
          </div>
        </div>
        <a href="#" class="btn btn-outline" style="padding:10px 16px">Profile</a>
      </div>
    </div>
  `;

  // Thumb switching
  $$('.thumb').forEach(t => t.addEventListener('click', () => {
    $$('.thumb').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('#main-img').src = t.dataset.src;
  }));

  // Cost calculator
  const daysSel = $('#days-sel');
  daysSel.addEventListener('change', () => {
    const d = parseInt(daysSel.value, 10);
    const sub = item.price * d;
    const fee = Math.round(sub * 0.08);
    const total = sub + fee + 25;
    $('#days-display').textContent = d;
    $('#subtotal').textContent = formatPrice(sub);
    $('#service-fee').textContent = formatPrice(fee);
    $('#total').textContent = formatPrice(total);
  });

  // Similar items
  const similarGrid = $('#similar-grid');
  if (similarGrid) {
    const similar = LISTINGS.filter(x => x.category === item.category && x.id !== item.id).slice(0, 4);
    similarGrid.innerHTML = similar.map(renderListingCard).join('');
  }
}

// ---------- How it works page ----------
function initHowItWorks() {
  const tabs = $$('.flow-tab');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.flow-panel').forEach(p => p.classList.remove('active'));
      $(`#panel-${tab.dataset.target}`).classList.add('active');
    });
  });

  $$('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      const wasOpen = item.classList.contains('open');
      $$('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

// ---------- Subtle reveal on scroll ----------
function initReveal() {
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  $$('section, .listing-card, .flow-step').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    obs.observe(el);
  });
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHome();
  initBrowse();
  initListing();
  initHowItWorks();
  setTimeout(initReveal, 50);
});
