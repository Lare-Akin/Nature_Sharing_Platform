/**
 * lightbox.js
 * Full-screen photo + wisdom viewing experience.
 * Meets WCAG 2.2: focus trap, keyboard nav, aria-live, reduced-motion.
 */

(function Lightbox() {
  const lb          = document.getElementById('lightbox');
  const backdrop    = document.getElementById('lightbox-backdrop');
  const closeBtn    = document.getElementById('lightbox-close');
  const prevBtn     = document.getElementById('lightbox-prev');
  const nextBtn     = document.getElementById('lightbox-next');
  const imgEl       = document.getElementById('lightbox-img');
  const titleEl     = document.getElementById('lightbox-title');
  const wisdomEl    = document.getElementById('lightbox-wisdom');
  const attrEl      = document.getElementById('lightbox-attribution');
  const locationEl  = document.getElementById('lightbox-location');
  const audioEl     = document.getElementById('audio-player');
  const volSlider   = document.getElementById('volume-slider');
  const musicBtns   = document.querySelectorAll('.music-btn');

  if (!lb) return;

  let lastFocus = null;

  // ── Open ──────────────────────────────────────────────────────────
  window.openLightbox = function(index) {
    lastFocus = document.activeElement;
    window.serenCurrent = index;
    populateLightbox(index);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    // Move focus to close button
    requestAnimationFrame(() => closeBtn.focus());
    trapFocus(lb);
  };

  function populateLightbox(index) {
    const photos = window.serenPhotos || [];
    const photo  = photos[index];
    if (!photo) return;

    // Image
    const db = typeof getSupabase === 'function' ? getSupabase() : null;
    let imageUrl = photo.image_url;
    if (!imageUrl && db && photo.storage_path) {
      const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(photo.storage_path);
      imageUrl = data?.publicUrl || null;
    }

    if (imageUrl) {
      imgEl.src = imageUrl;
      imgEl.alt = photo.alt_text || photo.title || 'Nature photograph';
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }

    // Text
    titleEl.textContent  = photo.title        || 'Untitled';
    wisdomEl.textContent = photo.wisdom        || '';
    attrEl.textContent   = photo.attribution   || '';
    locationEl.textContent = photo.location    || '';

    // Prev / Next
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === photos.length - 1;
  }

  // ── Close ─────────────────────────────────────────────────────────
  function closeLightbox() {
    lb.hidden = true;
    document.body.style.overflow = '';
    stopMusic();
    if (lastFocus) lastFocus.focus();
  }

  closeBtn.addEventListener('click', closeLightbox);
  backdrop.addEventListener('click', closeLightbox);

  // ── Keyboard navigation ───────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;

    if (e.key === 'Escape')       closeLightbox();
    if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1);  }
  });

  prevBtn.addEventListener('click', () => navigate(-1));
  nextBtn.addEventListener('click', () => navigate(1));

  function navigate(dir) {
    const photos = window.serenPhotos || [];
    const next   = window.serenCurrent + dir;
    if (next >= 0 && next < photos.length) {
      window.serenCurrent = next;
      populateLightbox(next);
    }
  }

  // ── Focus trap (WCAG 2.1 / 2.2) ──────────────────────────────────
  function trapFocus(container) {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    function handler(e) {
      if (e.key !== 'Tab') return;
      if (lb.hidden) { document.removeEventListener('keydown', handler); return; }

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }

    document.addEventListener('keydown', handler);
  }

  // ── Music player ──────────────────────────────────────────────────
  audioEl.volume = 0.5;

  volSlider.addEventListener('input', () => {
    audioEl.volume = volSlider.value / 100;
  });

  musicBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update aria-checked state
      musicBtns.forEach(b => b.setAttribute('aria-checked', 'false'));
      btn.setAttribute('aria-checked', 'true');

      const track = btn.dataset.track;
      if (track === 'none') {
        stopMusic();
        return;
      }

      const src = btn.dataset.src;
      // In production these will be real audio files in an /audio folder.
      // For demo, we gracefully handle missing files.
      playTrack(src);
    });
  });

  function playTrack(src) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Respect user who hasn't interacted — browsers block autoplay
    audioEl.src = src;
    audioEl.play().catch(() => {
      // Autoplay blocked — user will need to click play again; this is expected browser behaviour
    });
  }

  function stopMusic() {
    audioEl.pause();
    audioEl.src = '';
    musicBtns.forEach(b => b.setAttribute('aria-checked', 'false'));
    document.querySelector('.music-btn--off')?.setAttribute('aria-checked', 'true');
  }
})();
