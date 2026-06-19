/**
 * admin.js
 * Curator review panel — login, list pending, approve/reject submissions.
 * Uses Supabase Auth for authentication.
 */

(async function Admin() {
  const loginGate  = document.getElementById('login-gate');
  const reviewMain = document.getElementById('main-content');
  const signoutBtn = document.getElementById('signout-btn');
  const loginForm  = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  const db = typeof getSupabase === 'function' ? getSupabase() : null;

  // ── Check existing session ────────────────────────────────────────
  if (db) {
    const { data: { session } } = await db.auth.getSession();
    if (session) showReview();
  }

  // ── Login ─────────────────────────────────────────────────────────
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    const btn      = document.getElementById('login-btn');

    btn.textContent = 'Signing in…';
    btn.disabled    = true;

    try {
      if (!db) throw new Error('Supabase not configured — see js/supabase-client.js');
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showReview();
    } catch (err) {
      loginError.textContent = err.message || 'Sign in failed. Please try again.';
      loginError.style.display = 'block';
    } finally {
      btn.textContent = 'Sign in';
      btn.disabled    = false;
    }
  });

  // ── Sign out ──────────────────────────────────────────────────────
  signoutBtn?.addEventListener('click', async () => {
    if (db) await db.auth.signOut();
    loginGate.hidden = false;
    reviewMain.hidden = true;
  });

  // ── Show review interface ─────────────────────────────────────────
  function showReview() {
    loginGate.style.display = 'none';
    reviewMain.hidden = false;
    loadPending();
  }

  // ── Load pending submissions ──────────────────────────────────────
  async function loadPending() {
    const grid    = document.getElementById('review-grid');
    const loading = document.getElementById('review-loading');
    const empty   = document.getElementById('review-empty');
    const count   = document.getElementById('pending-count');

    let submissions = [];

    try {
      if (db) {
        const { data, error } = await db
          .from(TABLES.photos)
          .select('*')
          .eq('approved', false)
          .order('created_at', { ascending: true });
        if (error) throw error;
        submissions = data || [];
      } else {
        // Demo mode
        submissions = getDemoSubmissions();
      }
    } catch (err) {
      loading.textContent = 'Could not load submissions: ' + err.message;
      return;
    }

    loading.style.display = 'none';

    if (submissions.length === 0) {
      empty.hidden = false;
      count.textContent = 'Nothing pending — the queue is clear.';
      return;
    }

    count.textContent = `${submissions.length} submission${submissions.length !== 1 ? 's' : ''} awaiting review`;

    window.adminSubmissions = submissions;

    submissions.forEach((sub, idx) => {
      grid.appendChild(createCard(sub, idx));
    });
  }

  // ── Card builder ──────────────────────────────────────────────────
  function createCard(sub, idx) {
    const div = document.createElement('div');
    div.className = 'review-card';
    div.setAttribute('role', 'listitem');

    const imageUrl = resolveUrl(sub);
    const date     = sub.created_at ? new Date(sub.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    div.innerHTML = `
      ${imageUrl
        ? `<img class="review-card-image" src="${esc(imageUrl)}" alt="${esc(sub.alt_text || sub.title)}" loading="lazy" />`
        : `<div class="review-card-placeholder" aria-hidden="true">🌿</div>`}
      <div class="review-card-body">
        <h2 class="review-card-title">${esc(sub.title || 'Untitled')}</h2>
        <p class="review-card-meta">Submitted ${date}${sub.contributor_name ? ' by ' + esc(sub.contributor_name) : ''}</p>
        <p class="review-card-preview">${esc((sub.wisdom || '').slice(0, 120))}…</p>
        <button class="review-card-open" data-idx="${idx}"
                aria-label="Review submission: ${esc(sub.title || 'Untitled')}">
          Review this submission
        </button>
      </div>
    `;

    div.querySelector('.review-card-open').addEventListener('click', () => openModal(idx));
    return div;
  }

  // ── Modal ─────────────────────────────────────────────────────────
  let currentId = null;

  function openModal(idx) {
    const sub  = (window.adminSubmissions || [])[idx];
    if (!sub) return;
    currentId = sub.id;

    const modal = document.getElementById('review-modal');
    const img   = document.getElementById('modal-img');
    const imageUrl = resolveUrl(sub);

    img.src = imageUrl || '';
    img.alt = sub.alt_text || sub.title || 'Submission image';
    img.style.display = imageUrl ? 'block' : 'none';

    document.getElementById('modal-title').textContent        = sub.title || 'Untitled';
    document.getElementById('edit-title').value               = sub.title || '';
    document.getElementById('edit-wisdom').value              = sub.wisdom || '';
    document.getElementById('edit-attribution').value         = sub.attribution || '';
    document.getElementById('edit-alt').value                 = sub.alt_text || '';
    document.getElementById('modal-contributor').textContent  = sub.contributor_name || '—';
    document.getElementById('modal-location').textContent     = sub.location || '—';
    document.getElementById('modal-date').textContent         =
      sub.created_at ? new Date(sub.created_at).toLocaleString('en-GB') : '—';

    document.getElementById('action-error').textContent = '';
    modal.hidden = false;
    document.getElementById('modal-close').focus();

    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('review-modal').hidden = true;
    document.body.style.overflow = '';
  }

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-backdrop')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('review-modal').hidden) closeModal();
  });

  // ── Approve ───────────────────────────────────────────────────────
  document.getElementById('btn-approve')?.addEventListener('click', async () => {
    if (!currentId) return;
    const updates = {
      approved:    true,
      title:       document.getElementById('edit-title').value.trim(),
      wisdom:      document.getElementById('edit-wisdom').value.trim(),
      attribution: document.getElementById('edit-attribution').value.trim(),
      alt_text:    document.getElementById('edit-alt').value.trim()
    };

    try {
      if (db) {
        const { error } = await db.from(TABLES.photos).update(updates).eq('id', currentId);
        if (error) throw error;
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
      removeFromList(currentId);
      closeModal();
      showToast('Photograph approved and published ✓');
    } catch (err) {
      document.getElementById('action-error').textContent = 'Approval failed: ' + err.message;
    }
  });

  // ── Reject ────────────────────────────────────────────────────────
  document.getElementById('btn-reject')?.addEventListener('click', async () => {
    if (!currentId) return;
    if (!confirm('Remove this submission permanently? This cannot be undone.')) return;

    try {
      if (db) {
        // Also remove from storage
        const sub = (window.adminSubmissions || []).find(s => s.id === currentId);
        if (sub?.storage_path) {
          await db.storage.from(STORAGE_BUCKET).remove([sub.storage_path]);
        }
        const { error } = await db.from(TABLES.photos).delete().eq('id', currentId);
        if (error) throw error;
      } else {
        await new Promise(r => setTimeout(r, 400));
      }
      removeFromList(currentId);
      closeModal();
      showToast('Submission removed.');
    } catch (err) {
      document.getElementById('action-error').textContent = 'Rejection failed: ' + err.message;
    }
  });

  function removeFromList(id) {
    window.adminSubmissions = (window.adminSubmissions || []).filter(s => s.id !== id);
    const count = document.getElementById('pending-count');
    const n = window.adminSubmissions.length;
    count.textContent = n > 0
      ? `${n} submission${n !== 1 ? 's' : ''} awaiting review`
      : 'Nothing pending — the queue is clear.';
    if (n === 0) {
      document.getElementById('review-grid').innerHTML = '';
      document.getElementById('review-empty').hidden = false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function resolveUrl(sub) {
    if (sub.image_url) return sub.image_url;
    if (db && sub.storage_path) {
      const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(sub.storage_path);
      return data?.publicUrl || null;
    }
    return null;
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
      position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);
      background:var(--bark);color:var(--parchment);padding:.75rem 1.5rem;
      border-radius:100px;font-size:.875rem;z-index:9999;
      box-shadow:0 4px 16px rgba(0,0,0,.2);animation:fadeout 3s forwards;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3100);
  }

  function getDemoSubmissions() {
    return [
      {
        id: 'demo-1',
        title: 'First Light on the Moor',
        wisdom: 'There is a particular silence before the world wakes. In it, you can hear yourself think for the first time all day.',
        attribution: '— A.N. Walker',
        alt_text: 'Golden sunrise light across open moorland with purple heather',
        location: 'Dartmoor, Devon',
        contributor_name: 'Anna Walker',
        created_at: new Date().toISOString(),
        image_url: null,
        approved: false
      }
    ];
  }
})();
