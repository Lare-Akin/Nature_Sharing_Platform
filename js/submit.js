/**
 * submit.js
 * Handles photo submission form: validation, image upload to Supabase Storage,
 * and row insertion to the photos table with approved = false.
 */

(function Submit() {
  const form       = document.getElementById('submit-form');
  const successEl  = document.getElementById('submit-success');
  const submitBtn  = document.getElementById('submit-btn');
  const uploadZone = document.getElementById('upload-zone');
  const photoInput = document.getElementById('photo-input');
  const preview    = document.getElementById('upload-preview');
  const wisdomEl   = document.getElementById('wisdom');
  const wisdomCount = document.getElementById('wisdom-count');

  if (!form) return;

  // ── Live character count ──────────────────────────────────────────
  wisdomEl?.addEventListener('input', () => {
    wisdomCount.textContent = wisdomEl.value.length;
  });

  // ── Image preview ─────────────────────────────────────────────────
  photoInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.style.display = 'block';
        document.getElementById('upload-content').style.display = 'none';
        uploadZone.classList.add('has-preview');
      };
      reader.readAsDataURL(file);
    }
  });

  // Drag-and-drop
  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      photoInput.files = dt.files;
      photoInput.dispatchEvent(new Event('change'));
    }
  });

  // Keyboard activation of upload zone
  uploadZone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      photoInput.click();
    }
  });

  // ── Form submission ───────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const file    = photoInput.files?.[0];
      const db      = typeof getSupabase === 'function' ? getSupabase() : null;
      let storagePath = null;
      let imageUrl    = null;

      // 1. Upload image to Supabase Storage
      if (db && file) {
        const ext      = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        storagePath = `pending/${fileName}`;

        const { error: uploadErr } = await db.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, { contentType: file.type, upsert: false });

        if (uploadErr) throw new Error('Image upload failed: ' + uploadErr.message);

        const { data: urlData } = db.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
        imageUrl = urlData?.publicUrl || null;
      }

      // 2. Insert record (approved = false — awaits curator review)
      const record = {
        title:             getValue('title')             || null,
        wisdom:            getValue('wisdom')             || null,
        attribution:       getValue('attribution')        || '— Laré & Nature',
        alt_text:          getValue('alt-text')           || null,
        location:          getValue('location')           || null,
        contributor_name:  getValue('contributor-name')   || null,
        contributor_email: getValue('contributor-email')  || null,
        storage_path:      storagePath                    || null,
        image_url:         imageUrl                       || null,
        approved:          false,
        created_at:        new Date().toISOString()
      };
      
      if (db) {
        const { error: insertErr } = await db.from(TABLES.photos).insert([record]);
        if (insertErr) throw new Error('Submission failed: ' + insertErr.message);
      } else {
        // Demo mode — no Supabase configured
        console.info('Demo mode: would have submitted', record);
        await new Promise(r => setTimeout(r, 800));
      }

      // 3. Show success
      form.hidden = true;
      successEl.hidden = false;
      successEl.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error(err);
      showFormError('Something went wrong: ' + err.message + '. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  // ── Validation ────────────────────────────────────────────────────
  function validateForm() {
    let valid = true;

    if (!photoInput.files?.length) {
      showError('photo-error', 'Please choose a photograph to share.');
      valid = false;
    } else {
      const file = photoInput.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showError('photo-error', 'Your photograph is over 10 MB. Please reduce the file size and try again.');
        valid = false;
      }
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
        showError('photo-error', 'Please upload a JPG, PNG, or WebP image.');
        valid = false;
      }
    }

    if (!getValue('alt-text')) {
      showError('alt-error', 'Please describe your photograph so all visitors can experience it.');
      valid = false;
    }

    if (!getValue('title')) {
      showError('title-error', 'Please give this moment a name.');
      valid = false;
    }

    if (!getValue('wisdom') || getValue('wisdom').length < 20) {
      showError('wisdom-error', 'Please write at least 20 characters of reflection to accompany the image.');
      valid = false;
    }

    if (!form.querySelector('#consent-rights').checked) {
      showError('rights-error', 'Please confirm you have the right to share this photograph.');
      valid = false;
    }

    return valid;
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function getValue(id) {
    return document.getElementById(id)?.value?.trim() || '';
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.setAttribute('aria-live', 'assertive'); el.style.display = 'block'; }
    // Move focus to first error
    el?.previousElementSibling?.focus?.();
  }

  function showFormError(msg) {
    const el = document.getElementById('form-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function clearErrors() {
    document.querySelectorAll('.form-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
      el.removeAttribute('aria-live');
    });
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    document.getElementById('submit-btn-label').hidden = on;
    document.getElementById('submit-btn-loading').hidden = !on;
  }
})();
