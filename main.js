/* ===== D&D Luxury — Shared JS ===== */

// ---------- Mock Data ----------
// price = rental per day, buyPrice = full purchase
const LISTINGS = [
  { id: 1,  name: 'Birkin 30 Togo',           brand: 'Hermès',          category: 'bags',     buyPrice: 285000, price: 9000,  available: true,  condition: 'Pristine',  rating: 4.9, reviews: 28, year: 2022, img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85', desc: 'An icon of haute couture craftsmanship. Hand-stitched in supple Togo calfskin with palladium hardware. Reserved for the discerning few.' },
  { id: 2,  name: 'Daytona Cosmograph',       brand: 'Rolex',           category: 'watches',  buyPrice: 480000, price: 7500,  available: true,  condition: 'Mint',       rating: 5.0, reviews: 41, year: 2021, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=85', desc: 'The legendary chronograph in stainless steel with black dial. A motorsport heritage piece treasured by collectors worldwide.' },
  { id: 3,  name: 'Diamond Tennis Bracelet',  brand: 'Cartier',         category: 'jewellery',buyPrice: 195000, price: 5800,  available: true,  condition: 'Excellent',  rating: 4.8, reviews: 19, year: 2020, img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=900&q=85', desc: 'Brilliant-cut diamonds set in 18k white gold. Total carat weight 5.0ct. A timeless statement of refinement.' },
  { id: 4,  name: 'Lady Dior Medium',         brand: 'Dior',            category: 'bags',     buyPrice: 78000,  price: 4400,  available: true,  condition: 'Pristine',   rating: 4.9, reviews: 33, year: 2023, img: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=900&q=85', desc: 'The signature cannage quilted lambskin handbag. Sophisticated geometry meets feminine grace.' },
  { id: 5,  name: 'Royal Oak 41mm',           brand: 'Audemars Piguet', category: 'watches',  buyPrice: 720000, price: 10500, available: true,  condition: 'Mint',       rating: 5.0, reviews: 22, year: 2022, img: 'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=900&q=85', desc: 'The octagonal bezel that redefined luxury sport watches. Self-winding manufacture calibre 4302.' },
  { id: 6,  name: 'Saddle Pearl Earrings',    brand: 'Mikimoto',        category: 'jewellery',buyPrice: 42000,  price: 2900,  available: true,  condition: 'Excellent',  rating: 4.7, reviews: 15, year: 2021, img: 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=900&q=85', desc: 'Akoya cultured pearls of exceptional lustre, set in 18k yellow gold. Quietly luminous.' },
  { id: 7,  name: 'Classic Flap Medium',      brand: 'Chanel',          category: 'bags',     buyPrice: 145000, price: 6200,  available: true,  condition: 'Pristine',   rating: 5.0, reviews: 47, year: 2023, img: 'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=900&q=85', desc: 'Caviar leather with gold-tone CC clasp. The handbag every wardrobe aspires toward.' },
  { id: 8,  name: 'Horsebit Loafer',          brand: 'Gucci',           category: 'shoes',    buyPrice: 18500,  price: 1900,  available: true,  condition: 'Excellent',  rating: 4.6, reviews: 12, year: 2024, img: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=900&q=85', desc: 'The horsebit loafer rendered in glove-soft black calfskin. Italian craftsmanship since 1953.' },
  { id: 9,  name: 'Submariner Date',          brand: 'Rolex',           category: 'watches',  buyPrice: 215000, price: 6800,  available: true,  condition: 'Pristine',   rating: 4.9, reviews: 36, year: 2022, img: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=900&q=85', desc: 'Oystersteel diving instrument with black ceramic Cerachrom bezel. Water resistant to 300 metres.' },
  { id: 10, name: 'Capucines BB',             brand: 'Louis Vuitton',   category: 'bags',     buyPrice: 92000,  price: 5200,  available: true,  condition: 'Mint',       rating: 4.8, reviews: 21, year: 2023, img: 'https://images.unsplash.com/photo-1601369850391-3d3c4d827c98?w=900&q=85', desc: 'Hand-finished Taurillon leather with the iconic LV signature flower. Effortless, architectural elegance.' },
  { id: 11, name: 'Panthère Ring',            brand: 'Cartier',         category: 'jewellery',buyPrice: 68000,  price: 3500,  available: false, condition: 'Pristine',   rating: 5.0, reviews: 14, year: 2022, img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&q=85', desc: '18k yellow gold with tsavorite garnet eyes and onyx spots. The maison\'s legendary feline reborn on the finger.' },
  { id: 12, name: 'Crystal Heeled Mule',      brand: 'Manolo Blahnik',  category: 'shoes',    buyPrice: 14500,  price: 2200,  available: true,  condition: 'Excellent',  rating: 4.7, reviews: 18, year: 2024, img: 'https://images.unsplash.com/photo-1596944946297-11d6b2f64ec9?w=900&q=85', desc: 'Crystal-embellished satin upper on a slim 90mm heel. Couture footwork for occasion wear.' }
];

const LISTERS = [
  { name: 'Isabella V.', initials: 'IV', verified: true, rating: 4.96, lists: 42, location: 'Cape Town' },
  { name: 'Marcus W.',   initials: 'MW', verified: true, rating: 4.92, lists: 28, location: 'Johannesburg' },
  { name: 'Sophie L.',   initials: 'SL', verified: true, rating: 4.98, lists: 67, location: 'Sandton' },
  { name: 'Adrian K.',   initials: 'AK', verified: true, rating: 4.89, lists: 19, location: 'Stellenbosch' }
];

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

const formatPrice = (n) => `R${n.toLocaleString()}`;
const getQueryParam = (name) => new URLSearchParams(location.search).get(name);

// global mode: 'buy' (default) | 'rent'
function getMode() {
  return localStorage.getItem('dnd-mode') || 'buy';
}
function setMode(mode) {
  localStorage.setItem('dnd-mode', mode);
}

function renderListingCard(item) {
  const mode = getMode();
  const showRent = item.price && (mode === 'rent' || true);
  return `
    <a href="listing.html?id=${item.id}" class="listing-card" data-id="${item.id}">
      <div class="listing-img">
        <img src="${item.img}" alt="${item.brand} ${item.name}" loading="lazy">
        <span class="badge ${item.available ? '' : 'unavailable'}">
          ${item.available ? (mode === 'rent' ? 'Available' : 'In stock') : 'Reserved'}
        </span>
        <button class="fav-btn" aria-label="Save" onclick="event.preventDefault(); event.stopPropagation(); this.querySelector('i').classList.toggle('fas'); this.querySelector('i').classList.toggle('far');">
          <i class="far fa-heart"></i>
        </button>
      </div>
      <div class="listing-body">
        <div class="listing-brand">${item.brand}</div>
        <div class="listing-name">${item.name}</div>
        <div class="listing-meta-row">
          <span>${item.condition}</span>
          <span>·</span>
          <span>${item.year}</span>
        </div>
        <div class="listing-foot">
          <div class="listing-price-block">
            ${mode === 'rent'
              ? `<div class="listing-price">${formatPrice(item.price)}<small>/day</small></div>
                 <div class="listing-price-alt">or buy ${formatPrice(item.buyPrice)}</div>`
              : `<div class="listing-price">${formatPrice(item.buyPrice)}</div>
                 <div class="listing-price-alt">or rent ${formatPrice(item.price)}/day</div>`
            }
          </div>
          <div class="listing-rating"><i class="fas fa-star"></i>${item.rating.toFixed(1)}</div>
        </div>
      </div>
    </a>
  `;
}

// ---------- Mode toggle (segmented control) ----------
function bindModeToggle(root) {
  const btns = $$('.mode-toggle button', root);
  if (!btns.length) return;
  const current = getMode();
  btns.forEach(b => b.classList.toggle('active', b.dataset.mode === current));
  btns.forEach(b => b.addEventListener('click', () => {
    setMode(b.dataset.mode);
    btns.forEach(x => x.classList.toggle('active', x === b));
    document.dispatchEvent(new CustomEvent('mode-changed', { detail: b.dataset.mode }));
  }));
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

  document.addEventListener('mode-changed', () => {
    grid.innerHTML = featured.map(renderListingCard).join('');
  });
}

// ---------- Browse page ----------
function initBrowse() {
  const grid = $('#browse-grid');
  if (!grid) return;

  const state = {
    categories: new Set(),
    brands: new Set(),
    minPrice: 0,
    maxPrice: 100000000,
    sort: 'featured'
  };

  function applyFilters() {
    const mode = getMode();
    const priceField = mode === 'rent' ? 'price' : 'buyPrice';

    let result = LISTINGS.filter(item => {
      if (state.categories.size && !state.categories.has(item.category)) return false;
      if (state.brands.size && !state.brands.has(item.brand)) return false;
      if (item[priceField] < state.minPrice || item[priceField] > state.maxPrice) return false;
      return true;
    });

    switch (state.sort) {
      case 'price-asc':  result.sort((a, b) => a[priceField] - b[priceField]); break;
      case 'price-desc': result.sort((a, b) => b[priceField] - a[priceField]); break;
      case 'rating':     result.sort((a, b) => b.rating - a.rating); break;
      default: break;
    }

    grid.innerHTML = result.length
      ? result.map(renderListingCard).join('')
      : `<div class="empty-state">No items match your filters. Try widening your selection.</div>`;

    const countEl = $('#results-count');
    if (countEl) countEl.innerHTML = `<strong>${result.length}</strong> of ${LISTINGS.length} pieces`;

    const priceLabel = $('#price-filter-label');
    if (priceLabel) priceLabel.textContent = mode === 'rent' ? 'Price per day (R)' : 'Purchase price (R)';
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
    state.maxPrice = parseFloat(maxIn.value) || 100000000;
    applyFilters();
  }));

  const sortSel = $('#sort-select');
  if (sortSel) sortSel.addEventListener('change', () => {
    state.sort = sortSel.value;
    applyFilters();
  });

  const cat = getQueryParam('category');
  if (cat) {
    const cb = $(`input[name="category"][value="${cat}"]`);
    if (cb) { cb.checked = true; state.categories.add(cat); }
  }

  document.addEventListener('mode-changed', applyFilters);
  applyFilters();
}

// ---------- Listing detail page ----------
function initListing() {
  const wrap = $('#listing-detail');
  if (!wrap) return;

  const id = parseInt(getQueryParam('id') || '1', 10);
  const item = LISTINGS.find(x => x.id === id) || LISTINGS[0];
  const lister = LISTERS[item.id % LISTERS.length];

  document.title = `${item.brand} ${item.name} — D&D Luxury`;

  const otherImgs = LISTINGS.filter(x => x.id !== item.id).slice(0, 3).map(x => x.img);
  const allImgs = [item.img, ...otherImgs];
  const INSURANCE = 500;

  function buyPanel() {
    return `
      <div class="action-panel" id="buy-panel">
        <div class="price-line">
          <span class="price">${formatPrice(item.buyPrice)}</span>
          <span class="unit">incl. authentication</span>
        </div>

        <ul class="inline-features">
          <li><i class="fas fa-check"></i>Free white-glove delivery within South Africa</li>
          <li><i class="fas fa-check"></i>14-day return on authentication discrepancy</li>
          <li><i class="fas fa-check"></i>Original packaging and provenance documents included</li>
        </ul>

        <button class="btn btn-primary btn-block" ${item.available ? '' : 'disabled'}>
          ${item.available ? 'Add to bag' : 'Reserved'}
        </button>
        <button class="btn btn-outline btn-block" style="margin-top:10px">
          Make an offer
        </button>

        <div class="finance-note">
          <i class="fas fa-credit-card"></i>
          From ${formatPrice(Math.round(item.buyPrice / 24))}/month over 24 months. <a href="#">Apply for finance</a>
        </div>
      </div>
    `;
  }

  function rentPanel() {
    return `
      <div class="action-panel" id="rent-panel">
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
          <div class="cost-row"><span>Insurance</span><span>${formatPrice(INSURANCE)}</span></div>
          <div class="cost-row total"><span>Total</span><span id="total">${formatPrice(item.price*3 + Math.round(item.price*3*0.08) + INSURANCE)}</span></div>
        </div>

        <button class="btn btn-primary btn-block" ${item.available ? '' : 'disabled'}>
          ${item.available ? 'Reserve dates' : 'Currently booked'}
        </button>
      </div>
    `;
  }

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
        <span class="muted">${item.brand}</span>
      </div>
      <div class="brand-line">${item.brand}</div>
      <h1>${item.name}</h1>

      <div class="meta-row">
        <div class="meta-item"><i class="fas fa-star"></i><strong>${item.rating}</strong>(${item.reviews})</div>
        <div class="meta-item"><i class="fas fa-shield-halved"></i>Authenticated</div>
        <div class="meta-item"><strong>Condition:</strong>${item.condition}</div>
        <div class="meta-item"><strong>Year:</strong>${item.year}</div>
      </div>

      <p class="description">${item.desc}</p>

      <div class="action-card">
        <div class="mode-toggle local-toggle" role="tablist" aria-label="Buy or rent">
          <button data-mode="buy" type="button">Buy</button>
          <button data-mode="rent" type="button">Rent</button>
        </div>
        <div id="action-host"></div>
      </div>

      <div class="lister-card">
        <div class="lister-avatar">${lister.initials}</div>
        <div class="lister-info">
          <div class="lister-name">${lister.name}${lister.verified ? '<i class="fas fa-circle-check" title="Verified"></i>' : ''}</div>
          <div class="lister-meta">
            <i class="fas fa-star"></i>${lister.rating} · ${lister.lists} listings · ${lister.location}
          </div>
        </div>
        <a href="concierge.html" class="btn btn-outline btn-sm">Contact</a>
      </div>
    </div>
  `;

  $$('.thumb').forEach(t => t.addEventListener('click', () => {
    $$('.thumb').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('#main-img').src = t.dataset.src;
  }));

  function renderActionPanel() {
    const host = $('#action-host');
    const mode = getMode();
    host.innerHTML = mode === 'rent' ? rentPanel() : buyPanel();
    $$('.local-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

    if (mode === 'rent') {
      const daysSel = $('#days-sel');
      daysSel.addEventListener('change', () => {
        const d = parseInt(daysSel.value, 10);
        const sub = item.price * d;
        const fee = Math.round(sub * 0.08);
        const total = sub + fee + INSURANCE;
        $('#days-display').textContent = d;
        $('#subtotal').textContent = formatPrice(sub);
        $('#service-fee').textContent = formatPrice(fee);
        $('#total').textContent = formatPrice(total);
      });
    }
  }

  $$('.local-toggle button').forEach(b => b.addEventListener('click', () => {
    setMode(b.dataset.mode);
    renderActionPanel();
    document.dispatchEvent(new CustomEvent('mode-changed', { detail: b.dataset.mode }));
  }));

  renderActionPanel();

  const similarGrid = $('#similar-grid');
  if (similarGrid) {
    const similar = LISTINGS.filter(x => x.category === item.category && x.id !== item.id).slice(0, 4);
    similarGrid.innerHTML = similar.map(renderListingCard).join('');
    document.addEventListener('mode-changed', () => {
      similarGrid.innerHTML = similar.map(renderListingCard).join('');
    });
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

// ---------- List-a-Piece form ----------
function initListForm() {
  const form = $('#list-form');
  if (!form) return;

  const priceIn = $('#est-price');
  const earnHint = $('#earn-hint');
  if (priceIn && earnHint) {
    priceIn.addEventListener('input', () => {
      const v = parseFloat(priceIn.value) || 0;
      const annual = Math.round(v * 0.75 * 30);
      earnHint.textContent = v > 0
        ? `Estimated earnings: ${formatPrice(annual)} per year (30 rental days × 75% share).`
        : 'Enter a daily rate to see estimated earnings.';
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const success = $('#list-success');
    form.style.display = 'none';
    success.style.display = 'block';
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  const fileIn = $('#photos');
  const fileLabel = $('#file-label');
  if (fileIn && fileLabel) {
    fileIn.addEventListener('change', () => {
      const n = fileIn.files.length;
      fileLabel.textContent = n ? `${n} image${n > 1 ? 's' : ''} selected` : 'Drop or browse images (max 8)';
    });
  }
}

function initConcierge() {
  const form = $('#concierge-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const success = $('#concierge-success');
    form.style.display = 'none';
    success.style.display = 'block';
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function initReveal() {
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  $$('.reveal').forEach(el => obs.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  bindModeToggle(document);
  initHome();
  initBrowse();
  initListing();
  initHowItWorks();
  initListForm();
  initConcierge();
  setTimeout(initReveal, 50);
});
