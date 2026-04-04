// NASA_API_KEY is defined in js/config.js (loaded before this script).

const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const fetchButton = document.getElementById('fetchButton');
const apodModal = document.getElementById('apodModal');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

const APOD_BASE = 'https://api.nasa.gov/planetary/apod';

const CHUNK_DAYS = 9;
const SCROLL_ROOT_MARGIN = '240px';

setupDateInputs(startInput, endInput);

const earliestApod = startInput.min || '1995-06-16';

let scrollRange = {
  shownOldest: null,
  shownNewest: null,
  nextOlderEnd: null,
  nextNewerStart: null,
  loadingOlder: false,
  loadingNewer: false,
};
let topObserver = null;
let bottomObserver = null;

function todayYmd() {
  return new Date().toISOString().split('T')[0];
}

function addDaysYmd(ymd, delta) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function disconnectScrollObservers() {
  topObserver?.disconnect();
  bottomObserver?.disconnect();
  topObserver = null;
  bottomObserver = null;
}

function itemDateBounds(items) {
  const dates = items.map((i) => i.date).filter(Boolean).sort();
  if (!dates.length) return null;
  return { min: dates[0], max: dates[dates.length - 1] };
}

function ensureScrollSentinels() {
  let top = document.getElementById('gallery-sentinel-top');
  let bottom = document.getElementById('gallery-sentinel-bottom');
  if (!top) {
    top = document.createElement('div');
    top.id = 'gallery-sentinel-top';
    top.className = 'gallery-sentinel';
    top.setAttribute('aria-hidden', 'true');
    gallery.prepend(top);
  }
  if (!bottom) {
    bottom = document.createElement('div');
    bottom.id = 'gallery-sentinel-bottom';
    bottom.className = 'gallery-sentinel';
    bottom.setAttribute('aria-hidden', 'true');
    gallery.appendChild(bottom);
  }
  return { top, bottom };
}

function setupInfiniteScrollObservers() {
  disconnectScrollObservers();
  const { top, bottom } = ensureScrollSentinels();

  const opts = { root: null, rootMargin: SCROLL_ROOT_MARGIN, threshold: 0 };

  let topArmed = true;
  topObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.target !== top) continue;
      if (e.isIntersecting) {
        if (topArmed) {
          topArmed = false;
          loadNewerApodChunk();
        }
      } else {
        topArmed = true;
      }
    }
  }, opts);

  let bottomArmed = true;
  bottomObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.target !== bottom) continue;
      if (e.isIntersecting) {
        if (bottomArmed) {
          bottomArmed = false;
          loadOlderApodChunk();
        }
      } else {
        bottomArmed = true;
      }
    }
  }, opts);

  topObserver.observe(top);
  bottomObserver.observe(bottom);
}

async function loadOlderApodChunk() {
  if (
    scrollRange.loadingOlder ||
    scrollRange.loadingNewer ||
    !scrollRange.shownOldest
  ) {
    return;
  }

  const end =
    scrollRange.nextOlderEnd ?? addDaysYmd(scrollRange.shownOldest, -1);
  if (end < earliestApod) {
    return;
  }

  scrollRange.loadingOlder = true;
  scrollRange.nextOlderEnd = null;

  let start = addDaysYmd(end, -(CHUNK_DAYS - 1));
  if (start < earliestApod) start = earliestApod;

  try {
    const items = await fetchApodForRange(start, end);
    if (!items.length) {
      if (start > earliestApod) {
        scrollRange.nextOlderEnd = addDaysYmd(start, -1);
      }
      return;
    }

    const bottom = document.getElementById('gallery-sentinel-bottom');
    for (const item of items) {
      gallery.insertBefore(createApodCard(item), bottom);
    }

    const b = itemDateBounds(items);
    if (b) scrollRange.shownOldest = b.min;
  } catch {
    /* keep UI; user can scroll again to retry */
  } finally {
    scrollRange.loadingOlder = false;
  }
}

async function loadNewerApodChunk() {
  const today = todayYmd();
  if (
    scrollRange.loadingNewer ||
    scrollRange.loadingOlder ||
    !scrollRange.shownNewest ||
    scrollRange.shownNewest >= today
  ) {
    return;
  }

  const start =
    scrollRange.nextNewerStart ?? addDaysYmd(scrollRange.shownNewest, 1);
  if (start > today) {
    return;
  }

  scrollRange.loadingNewer = true;
  scrollRange.nextNewerStart = null;

  let end = addDaysYmd(start, CHUNK_DAYS - 1);
  if (end > today) end = today;

  try {
    const items = await fetchApodForRange(start, end);
    if (!items.length) {
      if (end < today) {
        scrollRange.nextNewerStart = addDaysYmd(end, 1);
      }
      return;
    }

    const prevScrollHeight = document.documentElement.scrollHeight;
    const prevScrollY = window.scrollY;

    const top = document.getElementById('gallery-sentinel-top');
    for (const item of items) {
      gallery.insertBefore(createApodCard(item), top.nextSibling);
    }

    const b = itemDateBounds(items);
    if (b) scrollRange.shownNewest = b.max;

    const delta = document.documentElement.scrollHeight - prevScrollHeight;
    window.scrollTo(0, prevScrollY + delta);
  } catch {
    /* keep UI */
  } finally {
    scrollRange.loadingNewer = false;
  }
}

function normalizeApodList(data) {
  return Array.isArray(data) ? data : [data];
}

function showPlaceholder(innerHtml) {
  gallery.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'placeholder';
  wrap.innerHTML = innerHtml;
  gallery.appendChild(wrap);
}

function closeApodModal() {
  if (!apodModal.hasAttribute('hidden')) {
    apodModal.setAttribute('hidden', '');
    modalMedia.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onModalKeydown);
  }
}

function onModalKeydown(e) {
  if (e.key === 'Escape') {
    closeApodModal();
  }
}

function openApodModal(item) {
  modalTitle.textContent = item.title || 'Untitled';
  modalDate.textContent = item.date ? `Date: ${item.date}` : '';
  modalExplanation.textContent = item.explanation || '';

  modalMedia.innerHTML = '';

  if (item.media_type === 'image' && (item.hdurl || item.url)) {
    const img = document.createElement('img');
    img.src = item.hdurl || item.url;
    img.alt = item.title || 'NASA Astronomy Picture of the Day';
    img.className = 'modal-image';
    modalMedia.appendChild(img);
  } else if (item.media_type === 'video') {
    if (item.thumbnail_url) {
      const img = document.createElement('img');
      img.src = item.thumbnail_url;
      img.alt = 'Video thumbnail';
      img.className = 'modal-image';
      modalMedia.appendChild(img);
    }
    if (item.url) {
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'modal-video-link';
      link.textContent = 'Open video on NASA / provider site';
      modalMedia.appendChild(link);
    }
  } else if (item.url) {
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'modal-video-link';
    link.textContent = 'Open media';
    modalMedia.appendChild(link);
  }

  apodModal.removeAttribute('hidden');
  document.body.classList.add('modal-open');
  document.addEventListener('keydown', onModalKeydown);
}

function createApodCard(item) {
  const card = document.createElement('article');
  card.className = 'gallery-item';

  const media = document.createElement('div');
  media.className = 'gallery-item__media';
  media.tabIndex = 0;
  media.setAttribute('role', 'button');
  media.setAttribute(
    'aria-label',
    `View details: ${item.title || 'Untitled'}${item.date ? `, ${item.date}` : ''}`
  );

  if (item.media_type === 'image' && item.url) {
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.title || 'NASA Astronomy Picture of the Day';
    img.loading = 'lazy';
    media.appendChild(img);
  } else if (item.media_type === 'video') {
    if (item.thumbnail_url) {
      const thumb = document.createElement('img');
      thumb.src = item.thumbnail_url;
      thumb.alt = 'Video thumbnail';
      thumb.loading = 'lazy';
      media.appendChild(thumb);
    }
    if (item.url) {
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open video';
      link.className = 'gallery-item__video-link';
      media.appendChild(link);
    }
  } else if (item.url) {
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open media';
    media.appendChild(link);
  }

  const caption = document.createElement('div');
  caption.className = 'gallery-item__caption';

  const heading = document.createElement('h2');
  heading.className = 'gallery-item__title';
  heading.textContent = item.title || 'Untitled';
  caption.appendChild(heading);

  const dateLine = document.createElement('p');
  dateLine.className = 'gallery-item__date';
  dateLine.textContent = item.date || '';
  caption.appendChild(dateLine);

  card.appendChild(media);
  card.appendChild(caption);

  const open = (e) => {
    if (e.target.closest('a')) return;
    openApodModal(item);
  };
  media.addEventListener('click', open);
  media.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(e);
    }
  });

  return card;
}

apodModal.addEventListener('click', (e) => {
  if (e.target.closest('[data-modal-close]')) {
    closeApodModal();
  }
});

async function fetchApodForRange(startDate, endDate) {
  const params = new URLSearchParams({
    api_key: NASA_API_KEY,
    start_date: startDate,
    end_date: endDate,
  });
  const res = await fetch(`${APOD_BASE}?${params}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data?.error?.message || data?.msg || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return normalizeApodList(data);
}

fetchButton.addEventListener('click', async () => {
  let start = startInput.value;
  let end = endInput.value;

  if (!start || !end) {
    showPlaceholder('<p>Choose a start and end date.</p>');
    return;
  }
  if (start > end) {
    [start, end] = [end, start];
  }

  showPlaceholder(
    '<div class="placeholder-icon">⏳</div><p>Loading from NASA…</p>'
  );
  fetchButton.disabled = true;

  try {
    const items = await fetchApodForRange(start, end);
    disconnectScrollObservers();
    gallery.innerHTML = '';
    scrollRange = {
      shownOldest: null,
      shownNewest: null,
      nextOlderEnd: null,
      nextNewerStart: null,
      loadingOlder: false,
      loadingNewer: false,
    };
    if (!items.length) {
      showPlaceholder('<p>No results for that range.</p>');
      return;
    }
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    for (const item of items) {
      gallery.appendChild(createApodCard(item));
    }
    const bounds = itemDateBounds(items);
    if (bounds) {
      scrollRange.shownOldest = bounds.min;
      scrollRange.shownNewest = bounds.max;
    }
    setupInfiniteScrollObservers();
  } catch (err) {
    disconnectScrollObservers();
    showPlaceholder(
      `<p>Could not load APOD. ${err.message || 'Unknown error'}</p>`
    );
  } finally {
    fetchButton.disabled = false;
  }
});
