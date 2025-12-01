const API_BASE = window.location.origin;

// sticky header
const header = document.getElementById('site-header');
if (header) window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 10));

// mobile menu
const navToggle = document.getElementById('nav-toggle');
const primaryMenu = document.getElementById('primary-menu');
if (navToggle && primaryMenu) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    primaryMenu.classList.toggle('show');
  });
}

// smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 70;
    const scrollTop = window.pageYOffset + target.getBoundingClientRect().top - offset;
    window.scrollTo({ top: scrollTop, behavior: 'smooth' });
    if (primaryMenu && primaryMenu.classList.contains('show')) {
      primaryMenu.classList.remove('show');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

// search form
const searchForm = document.getElementById('search-form');
const searchResultsSection = document.getElementById('search-results');
const searchResultsList = document.getElementById('search-results-list');
const searchStatus = document.getElementById('search-status');

const createPropertyCard = property => {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <img loading="lazy" src="${property.image}" alt="${property.name}">
    <div class="card-details">
      <p class="location">${property.location}</p>
      <h4>${property.name}</h4>
      <div class="info">
        <span>${property.details || ''}</span>
        <span>${property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : ''}</span>
      </div>
      <div class="booking">
        <button class="book-now" data-property="${property.name}">Book Now</button>
        <span class="price">${property.rent} BDT</span>
      </div>
    </div>`;
  return card;
};

const renderSearchResults = properties => {
  if (!searchResultsSection || !searchResultsList || !searchStatus) return;
  searchResultsList.innerHTML = '';
  if (!properties.length) {
    searchStatus.textContent = 'No properties matched your search. Try adjusting the filters.';
    searchResultsSection.classList.remove('hidden');
    return;
  }
  properties.forEach(property => searchResultsList.appendChild(createPropertyCard(property)));
  searchStatus.textContent = `${properties.length} propert${properties.length > 1 ? 'ies' : 'y'} found.`;
  searchResultsSection.classList.remove('hidden');
};

if (searchForm) {
  searchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const location = document.getElementById('location')?.value.trim() || '';
    const type = document.getElementById('type')?.value.toLowerCase() || '';
    const budgetValue = document.getElementById('budget-range')?.value || '';
    if (!location && !type && !budgetValue) return alert('Enter at least one search criterion.');

    const budgetMap = {
      lt5000: { min: 0, max: 5000 },
      "5to20": { min: 5000, max: 20000 },
      "20to50": { min: 20000, max: 50000 },
      gt50000: { min: 50000, max: Infinity }
    };
    const budgetRange = budgetMap[budgetValue];
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (type) params.append('type', type.toLowerCase());
    if (budgetRange) {
      params.append('minRent', budgetRange.min);
      params.append('maxRent', budgetRange.max);
    }

    if (searchStatus) searchStatus.textContent = 'Searching properties...';
    try {
      const res = await fetch(`${API_BASE}/api/properties?${params.toString()}`);
      const data = await res.json();
      renderSearchResults(data.properties || []);
    } catch (err) {
      console.error('Search failed', err);
      alert('Unable to fetch properties right now. Please try again later.');
    }
  });
}

// booking modal
const modal = document.getElementById('booking-modal');
const closeBtn = document.querySelector('.close-btn');
const bookingForm = document.getElementById('booking-form');
let selectedProperty = '';
if (modal && closeBtn) {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.book-now');
    if (!btn) return;
    selectedProperty = btn.dataset.property || 'Selected property';
    modal.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => (modal.style.display = 'none'));
  window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  if (bookingForm) {
    bookingForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const phone = document.getElementById('phone').value;
      const message = document.getElementById('message').value;

      try {
        const res = await fetch(`${API_BASE}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, message, property: selectedProperty })
        });
        if (!res.ok) throw new Error('Booking failed');
        alert('Your booking has been submitted!');
        bookingForm.reset();
        modal.style.display = 'none';
      } catch (err) {
        console.error(err);
        alert('Unable to submit booking. Please try again later.');
      }
    });
  }
}

// owner dashboard
if (document.getElementById('add-property-form')) {
  const typeSelect = document.getElementById('type');
  const extraFields = document.getElementById('extra-fields');
  const propertyItems = document.getElementById('property-items');
  const propertyEmpty = document.getElementById('property-empty');
  const form = document.getElementById('add-property-form');

  const setExtraFields = () => {
    const type = typeSelect.value;
    extraFields.innerHTML = '';
    if (['family', 'bachelor', 'sublet'].includes(type)) {
      extraFields.innerHTML = `
        <div style="display:flex;gap:10px;">
          <input type="number" id="bed" placeholder="Bed" required>
          <input type="number" id="bath" placeholder="Bathroom" required>
          <input type="number" id="corridor" placeholder="Corridor" required>
        </div>`;
    } else if (type === 'hostel') {
      extraFields.innerHTML = `
        <input type="text" id="gender" placeholder="For (Male/Female)" required>
        <input type="number" id="bed" placeholder="Bed Count" required>
        <input type="number" id="bath" placeholder="Bathroom" required>`;
    } else if (type === 'office') {
      extraFields.innerHTML = `
        <input type="number" id="room" placeholder="Room Count" required>
        <input type="text" id="purpose" placeholder="Office Purpose (optional)">`;
    }
  };

  const fileToDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const renderProperties = properties => {
    if (!propertyItems) return;
    propertyItems.innerHTML = '';
    if (!properties.length) {
      if (propertyEmpty) propertyEmpty.style.display = 'block';
      return;
    }
    if (propertyEmpty) propertyEmpty.style.display = 'none';
    properties.forEach(property => {
      const card = document.createElement('div');
      card.classList.add('property-card');
      card.innerHTML = `
        <img src="${property.image}" alt="${property.name}">
        <h4>${property.name}</h4>
        <p><strong>Location:</strong> ${property.location}</p>
        <p><strong>Type:</strong> ${property.type.charAt(0).toUpperCase() + property.type.slice(1)}</p>
        <p><strong>Details:</strong> ${property.details}</p>
        <p><strong>Rent:</strong> ${property.rent} BDT</p>
        <p><strong>Status:</strong> ${property.status}</p>`;
      propertyItems.appendChild(card);
    });
  };

  const loadProperties = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/properties`);
      const data = await res.json();
      renderProperties(data.properties || []);
    } catch (err) {
      console.error('Failed to load properties', err);
    }
  };

  typeSelect.addEventListener('change', setExtraFields);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const location = document.getElementById('location').value;
    const rent = Number(document.getElementById('rent').value);
    const type = document.getElementById('type').value;
    const imageFile = document.getElementById('image').files[0];
    const image = imageFile ? await fileToDataUrl(imageFile) : '';
    const description = document.getElementById('details').value;

    let details = description;
    if (type === 'office') {
      const room = document.getElementById('room')?.value || '';
      const purpose = document.getElementById('purpose')?.value || '';
      details = description || `${room} Room${purpose ? ' • ' + purpose : ''}`;
    } else if (type === 'hostel') {
      const gender = document.getElementById('gender').value;
      const bed = document.getElementById('bed').value;
      const bath = document.getElementById('bath').value;
      details = description || `${bed} Bed (${gender}) • ${bath} Bath`;
    } else if (['family', 'bachelor', 'sublet'].includes(type)) {
      const bed = document.getElementById('bed').value;
      const bath = document.getElementById('bath').value;
      const corridor = document.getElementById('corridor').value;
      details = description || `${bed} Bed • ${bath} Bathroom • ${corridor} Corridor`;
    }

    try {
      const res = await fetch(`${API_BASE}/api/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, rent, type, details, image })
      });
      if (!res.ok) throw new Error('Failed to save property');
      const { property, properties } = await res.json();
      renderProperties(properties || [property]);
      form.reset();
      extraFields.innerHTML = '';
      alert('✅ New property added successfully!');
    } catch (err) {
      alert('Unable to save property. Please try again.');
      console.error(err);
    }
  });

  loadProperties();
}
