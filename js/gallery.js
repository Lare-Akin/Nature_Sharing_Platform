/**
 * gallery.js
 * Fetches approved photos from Supabase and renders the gallery grid.
 */

(async function Gallery() {
  const grid    = document.getElementById('gallery-grid');
  const loading = document.getElementById('gallery-loading');
  const empty   = document.getElementById('gallery-empty');

  if (!grid) return;

  // ── Fetch approved photos ──────────────────────────────────────────
  let photos = [];
  try {
    const db = getSupabase();
    if (db) {
      const { data, error } = await db
        .from(TABLES.photos)
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      photos = data || [];
    }
  } catch (err) {
    console.warn('Could not load from Supabase, using demo data:', err.message);
    photos = getDemoPhotos();
  }

  // ── Render ────────────────────────────────────────────────────────
  loading.remove();

  if (photos.length === 0) {
    empty.hidden = false;
    return;
  }

  // Expose globally for lightbox navigation
  window.serenPhotos  = photos;
  window.serenCurrent = 0;

  photos.forEach((photo, index) => {
    const card = createCard(photo, index);
    grid.appendChild(card);
  });

  // ── Card builder ──────────────────────────────────────────────────
  function createCard(photo, index) {
    const article = document.createElement('article');
    article.className = 'gallery-card';
    article.setAttribute('role', 'listitem');

    const imageUrl = getImageUrl(photo);
    const preview  = (photo.wisdom || '').slice(0, 100) + ((photo.wisdom || '').length > 100 ? '…' : '');

    article.innerHTML = `
      ${imageUrl
        ? `<img
              class="gallery-card-image"
              src="${escHtml(imageUrl)}"
              alt="${escHtml(photo.alt_text || photo.title || 'Nature photograph')}"
              loading="lazy"
              decoding="async"
              width="400" height="300"
           />`
        : `<div class="gallery-card-image-placeholder" aria-hidden="true">🌿</div>`
      }
      <div class="gallery-card-body">
        <h3 class="gallery-card-title">${escHtml(photo.title || 'Untitled moment')}</h3>
        ${preview ? `<p class="gallery-card-preview">${escHtml(preview)}</p>` : ''}
      </div>
      <button
        class="gallery-card-open"
        aria-label="View ${escHtml(photo.title || 'this photograph')} and read words of wisdom"
        data-index="${index}"
      ></button>
    `;

    article.querySelector('.gallery-card-open').addEventListener('click', () => {
      openLightbox(index);
    });

    return article;
  }

  function getImageUrl(photo) {
    if (photo.image_url) return photo.image_url;
    const db = getSupabase();
    if (db && photo.storage_path) {
      const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(photo.storage_path);
      return data?.publicUrl || null;
    }
    return null;
  }

  // ── Demo data (shown when Supabase isn't configured yet) ──────────
  function getDemoPhotos() {
    return [
      {
        id: 1,
        title: 'Morning Mist',
        wisdom: 'In the quiet hours before the world wakes, nature speaks in whispers. The mist does not struggle to rise — it simply is. So too can we simply be, without the weight of what we must become.',
        attribution: '— Serenscape',
        alt_text: 'Misty forest in the early morning light',
        location: 'Black Forest, Germany',
        image_url: null
      },
      {
        id: 2,
        title: 'Still Waters',
        wisdom: 'The deepest lakes make no sound. Depth itself is a form of peace. To be still is not to be empty — it is to be full of something the noise of the world cannot hold.',
        attribution: '— Serenscape',
        alt_text: 'Perfectly still mountain lake at dawn',
        location: 'Norwegian Fjords',
        image_url: null
      },
      {
        id: 3,
        title: 'Ancient Light',
        wisdom: 'Every ray of light you see has travelled 93 million miles to reach your eyes. You were worth that journey. So is this moment.',
        attribution: '— Serenscape',
        alt_text: 'Sunlight filtering through an ancient forest canopy',
        location: 'Redwood National Park',
        image_url: null
      }
    ];
  }

  // ── Utility ───────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
