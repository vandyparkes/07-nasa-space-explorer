// NASA_API_KEY is defined in js/config.js (loaded before this script).

const SPACE_FACTS = [
  'A day on Venus is longer than a Venus year — the planet spins so slowly that it finishes an orbit around the Sun before one sunrise catches up with the last.',
  'Neutron stars are city-sized leftovers of exploded stars; some spin hundreds of times per second and pack more mass than our Sun.',
  'Saturn would float in a giant bathtub — if you could find one big enough — because the planet is less dense than water (on average).',
  'Jupiter’s Great Red Spot is a storm so huge you could fit Earth inside it — and it has been raging for centuries.',
  'Olympus Mons on Mars is a shield volcano about three times taller than Mount Everest — and so wide the slope is gentle from the ground.',
  'Space has no air, so sound has nothing to travel through. Explosions in space are silent from far away (though vibrations can travel through ships and suits).',
  'The Moon is slowly drifting away from Earth — roughly a few centimeters per year — which very gradually changes how tides behave.',
  'Ganymede, one of Jupiter’s moons, is larger than the planet Mercury — moons can be surprisingly huge.',
  'You could line up more than one million Earths across the Sun’s diameter — our star is almost incomprehensibly big.',
  'Astronauts often grow a little taller in space because their spines stretch without gravity pressing them down — they shrink back after returning home.',
  'Uranus is tipped on its side — its spin axis is tilted so sharply that it basically rolls around the Sun like a ball, making its seasons extreme.',
  'Light from the Sun takes about 8 minutes to reach Earth — so when you see the Sun, you are looking a few minutes into the past.',
];

function pickRandomSpaceFact() {
  const i = Math.floor(Math.random() * SPACE_FACTS.length);
  return SPACE_FACTS[i];
}

const didYouKnowFactEl = document.getElementById('didYouKnowFact');
if (didYouKnowFactEl) {
  didYouKnowFactEl.textContent = pickRandomSpaceFact();
}

const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const fetchButton = document.getElementById('fetchButton');
const apodModal = document.getElementById('apodModal');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const backToTop = document.getElementById('backToTop');

const APOD_BASE = 'https://api.nasa.gov/planetary/apod';

const BACK_TO_TOP_SHOW_AFTER = 320;
let backToTopScrollScheduled = false;

function syncBackToTopVisibility() {
  if (!backToTop) return;
  if (window.scrollY > BACK_TO_TOP_SHOW_AFTER) {
    backToTop.removeAttribute('hidden');
  } else {
    backToTop.setAttribute('hidden', '');
  }
}

window.addEventListener(
  'scroll',
  () => {
    if (!backToTop || backToTopScrollScheduled) return;
    backToTopScrollScheduled = true;
    requestAnimationFrame(() => {
      syncBackToTopVisibility();
      backToTopScrollScheduled = false;
    });
  },
  { passive: true }
);

syncBackToTopVisibility();

backToTop?.addEventListener('click', () => {
  const instant =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
});

/** @param {string | undefined} url */
function youtubeEmbedSrcFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(
      url.startsWith('//') ? `https:${url}` : url
    );
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}${u.search}` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname.startsWith('/embed/')) {
        const rest = u.pathname.slice('/embed/'.length);
        const id = rest.split('/')[0];
        return id
          ? `https://www.youtube.com/embed/${encodeURIComponent(id)}${u.search}`
          : null;
      }
      if (u.pathname === '/watch' || u.pathname === '/watch/') {
        const id = u.searchParams.get('v');
        return id
          ? `https://www.youtube.com/embed/${encodeURIComponent(id)}`
          : null;
      }
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.slice('/shorts/'.length).split('/')[0];
        return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** @param {string | undefined} url */
function youtubeVideoIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(
      url.startsWith('//') ? `https:${url}` : url
    );
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname.startsWith('/embed/')) {
        const rest = u.pathname.slice('/embed/'.length);
        return rest.split('/')[0] || null;
      }
      if (u.pathname === '/watch' || u.pathname === '/watch/') {
        return u.searchParams.get('v');
      }
      if (u.pathname.startsWith('/shorts/')) {
        return u.pathname.slice('/shorts/'.length).split('/')[0] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Best thumbnail URL for a video APOD (API field or derived YouTube still). */
function videoThumbnailSrc(item) {
  if (item.thumbnail_url) return item.thumbnail_url;
  const id = youtubeVideoIdFromUrl(item.url);
  if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return null;
}

/** External link styled as a small spiral galaxy (e.g. watch video on YouTube). */
function createGalaxyExternalLink(href, labelText) {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'modal-galaxy-link';
  const galaxy = document.createElement('span');
  galaxy.className = 'modal-galaxy-link__galaxy';
  galaxy.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'modal-galaxy-link__label';
  label.textContent = labelText;
  link.appendChild(galaxy);
  link.appendChild(label);
  return link;
}

function videoModalLinkLabel(url) {
  return youtubeVideoIdFromUrl(url) ? 'Watch on YouTube' : 'Open video';
}

const CHUNK_DAYS = 9;
/** How many APOD cards to show per step (initial load + each "Load more"). */
const GALLERY_PAGE_SIZE = CHUNK_DAYS;
const SCROLL_ROOT_MARGIN = '240px';

/** Full sorted APOD list for the last successful date-range fetch (newest first). */
let rangeBufferItems = null;
/** How many entries from `rangeBufferItems` are already in the DOM. */
let rangeBufferRendered = 0;

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

function hasMoreBufferedApod() {
  return Boolean(
    rangeBufferItems && rangeBufferRendered < rangeBufferItems.length
  );
}

function ensureLoadMoreUi() {
  let wrap = document.getElementById('gallery-load-more');
  const bottom = document.getElementById('gallery-sentinel-bottom');
  if (!wrap && bottom) {
    wrap = document.createElement('div');
    wrap.id = 'gallery-load-more';
    wrap.className = 'gallery-load-more';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'galleryLoadMoreButton';
    btn.className = 'planet-field planet-field--action gallery-load-more__btn';
    btn.textContent = 'Load more';
    wrap.appendChild(btn);
    gallery.insertBefore(wrap, bottom);
    btn.addEventListener('click', () => {
      appendNextGalleryPage();
    });
  }
  return wrap;
}

function updateLoadMoreUi() {
  const wrap = document.getElementById('gallery-load-more');
  const btn = document.getElementById('galleryLoadMoreButton');
  if (!wrap || !btn) return;

  if (!hasMoreBufferedApod()) {
    wrap.setAttribute('hidden', '');
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    return;
  }

  wrap.removeAttribute('hidden');
  const remaining = rangeBufferItems.length - rangeBufferRendered;
  const nextBatch = Math.min(GALLERY_PAGE_SIZE, remaining);
  btn.disabled = false;
  btn.textContent =
    remaining === nextBatch
      ? 'Load more'
      : `Load more (${remaining} more in range)`;
  btn.setAttribute(
    'aria-label',
    `Show ${nextBatch} more picture${nextBatch === 1 ? '' : 's'}. ${remaining} not yet shown in this date range.`
  );
}

function syncScrollRangeFromBuffer() {
  if (!rangeBufferItems || rangeBufferRendered === 0) return;
  scrollRange.shownNewest = rangeBufferItems[0].date;
  scrollRange.shownOldest = rangeBufferItems[rangeBufferRendered - 1].date;
}

function appendNextGalleryPage() {
  if (!rangeBufferItems) return;
  const remaining = rangeBufferItems.length - rangeBufferRendered;
  if (remaining <= 0) return;

  ensureLoadMoreUi();
  const wrap = document.getElementById('gallery-load-more');
  const take = Math.min(GALLERY_PAGE_SIZE, remaining);
  const slice = rangeBufferItems.slice(
    rangeBufferRendered,
    rangeBufferRendered + take
  );

  const fragment = document.createDocumentFragment();
  for (const item of slice) {
    fragment.appendChild(createApodCard(item));
  }
  const ref = wrap && gallery.contains(wrap) ? wrap : null;
  if (ref) {
    gallery.insertBefore(fragment, ref);
  } else {
    const bottom = document.getElementById('gallery-sentinel-bottom');
    gallery.insertBefore(fragment, bottom);
  }
  rangeBufferRendered += take;
  updateLoadMoreUi();
  syncScrollRangeFromBuffer();
}

async function loadOlderApodChunk() {
  if (hasMoreBufferedApod()) {
    appendNextGalleryPage();
    return;
  }

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
    const fragment = document.createDocumentFragment();
    for (let i = items.length - 1; i >= 0; i -= 1) {
      fragment.appendChild(createApodCard(items[i]));
    }
    gallery.insertBefore(fragment, bottom);

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
    const fragment = document.createDocumentFragment();
    for (let i = items.length - 1; i >= 0; i -= 1) {
      fragment.appendChild(createApodCard(items[i]));
    }
    gallery.insertBefore(fragment, top.nextSibling);

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
  disconnectScrollObservers();
  rangeBufferItems = null;
  rangeBufferRendered = 0;
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

  const mediaType = String(item.media_type || '').toLowerCase();

  if (mediaType === 'image' && (item.hdurl || item.url)) {
    const img = document.createElement('img');
    img.src = item.hdurl || item.url;
    img.alt = item.title || 'NASA Astronomy Picture of the Day';
    img.className = 'modal-image';
    modalMedia.appendChild(img);
  } else if (mediaType === 'video') {
    const embedSrc = youtubeEmbedSrcFromUrl(item.url);
    if (embedSrc) {
      const wrap = document.createElement('div');
      wrap.className = 'modal-video-embed';
      const iframe = document.createElement('iframe');
      iframe.src = embedSrc;
      iframe.title = item.title
        ? `Video: ${item.title}`
        : 'NASA Astronomy Picture of the Day video';
      iframe.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      );
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      wrap.appendChild(iframe);
      modalMedia.appendChild(wrap);
    } else {
      const thumb = videoThumbnailSrc(item);
      if (thumb) {
        const img = document.createElement('img');
        img.src = thumb;
        img.alt = item.title ? `${item.title} (video)` : 'Video thumbnail';
        img.className = 'modal-image';
        modalMedia.appendChild(img);
      }
    }
    if (item.url) {
      modalMedia.appendChild(
        createGalaxyExternalLink(item.url, videoModalLinkLabel(item.url))
      );
    }
  } else if (item.url) {
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'modal-aux-link';
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

  const cardMediaType = String(item.media_type || '').toLowerCase();

  if (cardMediaType === 'image' && item.url) {
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.title || 'NASA Astronomy Picture of the Day';
    img.loading = 'lazy';
    media.appendChild(img);
  } else if (cardMediaType === 'video') {
    const thumbSrc = videoThumbnailSrc(item);
    if (thumbSrc) {
      const wrap = document.createElement('div');
      wrap.className = 'gallery-item__video-thumb-wrap';
      const thumb = document.createElement('img');
      thumb.src = thumbSrc;
      thumb.alt = item.title ? `${item.title} (video)` : 'Video thumbnail';
      thumb.loading = 'lazy';
      wrap.appendChild(thumb);
      media.appendChild(wrap);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'gallery-item__video-fallback';
      fallback.setAttribute('aria-hidden', 'true');
      fallback.textContent = 'Video';
      media.appendChild(fallback);
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

  const open = () => {
    openApodModal(item);
  };
  media.addEventListener('click', open);
  media.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });

  return card;
}

apodModal.addEventListener('click', (e) => {
  if (e.target.closest('[data-modal-close]')) {
    closeApodModal();
  }
});

/** @param {Response} res @param {unknown} data @param {string} text */
function apodErrorMessage(res, data, text) {
  if (data && typeof data === 'object') {
    const err = /** @type {{ error?: { message?: string }; msg?: string }} */ (data);
    if (typeof err.error?.message === 'string' && err.error.message.trim()) {
      return err.error.message.trim();
    }
    if (typeof err.msg === 'string' && err.msg.trim()) {
      return err.msg.trim();
    }
  }
  const parts = [`HTTP ${res.status}`];
  if (res.statusText && res.statusText.trim()) {
    parts.push(res.statusText.trim());
  }
  const t = text?.trim();
  if (t && !t.startsWith('<') && t.length < 400) {
    parts.push(t);
  } else if (t && t.startsWith('<')) {
    parts.push('NASA returned an HTML error page (try again in a moment).');
  }
  return parts.join(' — ');
}

async function fetchApodForRange(startDate, endDate, attempt = 0) {
  const maxAttempts = 3;
  const params = new URLSearchParams({
    api_key: NASA_API_KEY,
    start_date: startDate,
    end_date: endDate,
  });
  const res = await fetch(`${APOD_BASE}?${params}`);
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON error bodies are common on 502/503 */
    }
  }
  if (!res.ok) {
    const retryable =
      (res.status === 502 || res.status === 503 || res.status === 429) &&
      attempt < maxAttempts - 1;
    if (retryable) {
      const delayMs = 400 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchApodForRange(startDate, endDate, attempt + 1);
    }
    throw new Error(apodErrorMessage(res, data, text));
  }
  if (data === null || data === undefined) {
    throw new Error('Empty or invalid JSON from NASA APOD.');
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
    '<p class="placeholder-loading">Loading from NASA<span class="loading-ellipsis" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p>'
  );
  fetchButton.disabled = true;

  try {
    const items = await fetchApodForRange(start, end);
    disconnectScrollObservers();
    gallery.innerHTML = '';
    rangeBufferItems = null;
    rangeBufferRendered = 0;
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
    rangeBufferItems = items;
    rangeBufferRendered = 0;
    ensureScrollSentinels();
    appendNextGalleryPage();
    setupInfiniteScrollObservers();
  } catch (err) {
    disconnectScrollObservers();
    rangeBufferItems = null;
    rangeBufferRendered = 0;
    showPlaceholder(
      `<p>Could not load APOD. ${err.message || 'Unknown error'}</p>`
    );
  } finally {
    fetchButton.disabled = false;
  }
});
