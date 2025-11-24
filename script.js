/* ===============================
   Script for index.html
   =============================== */

// ===== Sticky Header =====
const header = document.getElementById('site-header');
if (header) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  });
}

// ===== Mobile Menu Toggle =====
const navToggle = document.getElementById('nav-toggle');
const primaryMenu = document.getElementById('primary-menu');
if (navToggle && primaryMenu) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    primaryMenu.classList.toggle('show');
  });
}

// ===== Smooth Scroll for Internal Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = this.getAttribute('href');
    if (!target || target === '#') return;
    const el = document.querySelector(target);
    if (!el) return;

    e.preventDefault();
    const offset = 70;
    const rect = el.getBoundingClientRect();
    const scrollTop = window.pageYOffset + rect.top - offset;
    window.scrollTo({ top: scrollTop, behavior: 'smooth' });

    if (primaryMenu && primaryMenu.classList.contains('show')) {
      primaryMenu.classList.remove('show');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

// ===== Search Form Handling =====
const searchForm = document.getElementById('search-form');
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const location = document.getElementById('location')?.value.trim() || '';
    const type = document.getElementById('type')?.value || '';
    const budgetValue = document.getElementById('budget-range')?.value || '';

    if (!location && !type && !budgetValue) {
      alert('Please enter at least one search criterion.');
      return;
    }

    const budgetMap = {
      'lt5000': { min: 0, max: 5000 },
      '5to20': { min: 5000, max: 20000 },
      '20to50': { min: 20000, max: 50000 },
      'gt50000': { min: 50000, max: Infinity }
    };

    const budgetRange = budgetMap[budgetValue] || null;
    console.log('Search criteria:', { location, type, budgetRange });
    alert(`Searching properties in ${location || 'your selected area'}...`);
  });
}

// ===== Booking Modal Logic =====
const modal = document.getElementById('booking-modal');
const closeBtn = document.querySelector('.close-btn');
const bookButtons = document.querySelectorAll('.book-now');

if (modal && closeBtn && bookButtons.length > 0) {
  bookButtons.forEach(btn => {
    btn.addEventListener('click', () => (modal.style.display = 'flex'));
  });

  closeBtn.addEventListener('click', () => (modal.style.display = 'none'));

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  document.getElementById('booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Your booking has been submitted!');
    modal.style.display = 'none';
  });
}


/* ===============================
   Script for owner-dashboard.html
   =============================== */

if (document.getElementById('add-property-form')) {
  const typeSelect = document.getElementById('type');
  const extraFields = document.getElementById('extra-fields');
  const propertyList = document.getElementById('property-list');
  const form = document.getElementById('add-property-form');

  // Dynamic fields based on property type
  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    extraFields.innerHTML = '';

    if (type === 'family' || type === 'bachelor' || type === 'sublet') {
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
  });

  // Add new property dynamically
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const location = document.getElementById('location').value;
    const rent = document.getElementById('rent').value;
    const type = document.getElementById('type').value;
    const imageFile = document.getElementById('image').files[0];
    const imageURL = URL.createObjectURL(imageFile);

    let details = '';
    if (type === 'office') {
      const room = document.getElementById('room')?.value || '';
      const purpose = document.getElementById('purpose')?.value || '';
      details = `${room} Room ${purpose ? '• ' + purpose : ''}`;
    } else if (type === 'hostel') {
      const gender = document.getElementById('gender').value;
      const bed = document.getElementById('bed').value;
      const bath = document.getElementById('bath').value;
      details = `${bed} Bed (${gender}) • ${bath} Bath`;
    } else {
      const bed = document.getElementById('bed').value;
      const bath = document.getElementById('bath').value;
      const corridor = document.getElementById('corridor').value;
      details = `${bed} Bed • ${bath} Bathroom • ${corridor} Corridor`;
    }

    const card = document.createElement('div');
    card.classList.add('property-card');
    card.innerHTML = `
      <img src="${imageURL}" alt="${name}">
      <h4>${name}</h4>
      <p><strong>Location:</strong> ${location}</p>
      <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
      <p><strong>Details:</strong> ${details}</p>
      <p><strong>Rent:</strong> ${rent} BDT</p>
    `;

    propertyList.appendChild(card);
    form.reset();
    extraFields.innerHTML = '';
    alert("✅ New property added successfully!");
  });
}
