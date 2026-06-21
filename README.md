# ✦ Serenscape

**A calm platform for nature photography, wisdom, and mindfulness.**

Users contribute nature photographs paired with words of reflection. A curator reviews every submission before it appears in the gallery. Visitors can accompany each image with ambient soundscapes.

---

## File structure

```
serenscape/
├── index.html               ← Landing page (hero + static photo)
├── images/
│   └── hero.jpg              ← ⚙️  Add your own hero photo here
├── pages/
│   ├── gallery.html          ← The photo gallery + lightbox viewing experience
│   ├── submit.html           ← Public submission form
│   └── about.html            ← About page
├── admin/
│   └── review.html           ← Curator review panel (login protected)
├── css/
│   ├── main.css              ← Core design system
│   ├── submit.css            ← Submission form styles
│   └── admin.css             ← Curator panel styles
├── js/
│   ├── supabase-client.js    ← ⚙️  Configure your Supabase keys here
│   ├── gallery.js            ← Gallery rendering
│   ├── lightbox.js           ← Viewing experience + music
│   ├── submit.js             ← Form + Supabase upload
│   ├── admin.js              ← Curator review workflow
│   └── nav.js                ← Mobile navigation
├── audio/                    ← Place your ambient audio files here
│   ├── forest-birdsong.mp3
│   ├── gentle-rain.mp3
│   ├── ocean-waves.mp3
│   ├── mountain-wind.mp3
│   └── tibetan-bells.mp3
└── README.md
```

**Note:** The homepage (`index.html`) is now a standalone landing page with a static hero photo. Clicking "Enter the gallery" takes visitors to `pages/gallery.html`, a genuinely separate page rather than a scroll-jump on the same page.
```

---

## 1. Recommended database: Supabase ✓

**Supabase is the right choice** for this project. Here's why:
- Free tier is generous (500 MB database, 1 GB storage)
- Built-in **file storage** for photos — no third-party CDN needed
- Built-in **authentication** for the curator login
- Row Level Security (RLS) policies keep public users from approving their own photos
- Works perfectly with static GitHub Pages hosting (no server required)

---

## 2. Supabase setup — step by step

### Step 1: Create a project
1. Go to [supabase.com](https://supabase.com) and sign up / sign in
2. Click **New project**
3. Give it a name (e.g. `serenscape`), choose a region close to your users, set a database password, click **Create project**
4. Wait ~2 minutes for the project to provision

### Step 2: Create the photos table
Go to **Table Editor** → **New table** and create:

**Table name:** `photos`

| Column name | Type | Default | Notes |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `created_at` | `timestamptz` | `now()` | Auto-set |
| `title` | `text` | — | Required |
| `wisdom` | `text` | — | Required |
| `attribution` | `text` | `'— Serenscape'` | |
| `alt_text` | `text` | — | Image description |
| `location` | `text` | — | Optional |
| `contributor_name` | `text` | — | Optional |
| `contributor_email` | `text` | — | Optional |
| `storage_path` | `text` | — | Path in Storage bucket |
| `image_url` | `text` | — | Public URL (auto-set) |
| `approved` | `bool` | `false` | Curator approval gate |

Or run this SQL in **SQL Editor**:

```sql
create table public.photos (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  title            text not null,
  wisdom           text not null,
  attribution      text default '— Serenscape',
  alt_text         text,
  location         text,
  contributor_name text,
  contributor_email text,
  storage_path     text,
  image_url        text,
  approved         boolean not null default false
);
```

### Step 3: Set up Row Level Security (RLS)

Enable RLS on the photos table, then add these policies in **Authentication** → **Policies**:

```sql
-- Anyone can read approved photos (public gallery)
create policy "Public can view approved photos"
  on public.photos for select
  using (approved = true);

-- Anyone can insert (submit a photo) — not yet approved
create policy "Anyone can submit"
  on public.photos for insert
  with check (approved = false);

-- Only authenticated curators can update or delete
create policy "Curators can update"
  on public.photos for update
  using (auth.role() = 'authenticated');

create policy "Curators can delete"
  on public.photos for delete
  using (auth.role() = 'authenticated');
```

### Step 4: Create the Storage bucket
1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name it: `nature-photos`
4. Set to **Public** (images need to be viewable without login)
5. Click **Create bucket**

Add storage policies:

```sql
-- Anyone can upload to /pending/
create policy "Public uploads to pending"
  on storage.objects for insert
  with check (bucket_id = 'nature-photos' AND (storage.foldername(name))[1] = 'pending');

-- Anyone can read public files
create policy "Public read"
  on storage.objects for select
  using (bucket_id = 'nature-photos');

-- Only curators can delete
create policy "Curator delete"
  on storage.objects for delete
  using (bucket_id = 'nature-photos' AND auth.role() = 'authenticated');
```

### Step 5: Create curator account
1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter your email and a strong password
4. This account is used to log into `/admin/review.html`

### Step 6: Get your API keys
1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xyzabc.supabase.co`)
   - **anon public** key (long JWT string — this is safe to expose in frontend code)

### Step 7: Add keys to the project
Open `js/supabase-client.js` and replace:

```javascript
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
```

### Step 8: Add the Supabase CDN script
In **every HTML file**, add this `<script>` tag **before** `supabase-client.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Add it to: `index.html`, `pages/submit.html`, `pages/about.html`, `admin/review.html`

---

## 3. Ambient audio files

The music player references these files in your `/audio/` folder. Source royalty-free audio from:
- [Freesound.org](https://freesound.org) (Creative Commons)
- [Pixabay](https://pixabay.com/music/) (free for commercial use)
- [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk/)

Name your files to match exactly:
- `audio/forest-birdsong.mp3`
- `audio/gentle-rain.mp3`
- `audio/ocean-waves.mp3`
- `audio/mountain-wind.mp3`
- `audio/tibetan-bells.mp3`

---

## 4. Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `serenscape`)
2. Upload all project files to the repo root
3. Go to **Settings** → **Pages**
4. Under **Source**, select `Deploy from a branch` → `main` → `/ (root)`
5. Your site will be live at `https://YOUR-USERNAME.github.io/serenscape/`

**Note on JavaScript:** The brief mentions Java — for a static GitHub Pages site, JavaScript is the correct choice. Java would require a server backend. If you later want a backend (for server-side image processing, email notifications, etc.), consider Supabase Edge Functions, which are written in TypeScript and run without a dedicated server.

---

## 5. WCAG 2.2 compliance checklist

This codebase implements:

- ✅ **1.1.1** — All images have descriptive `alt` text (required at submission)
- ✅ **1.3.1** — Semantic HTML (`<main>`, `<header>`, `<nav>`, `<article>`, `role` attributes)
- ✅ **1.4.3** — Colour contrast ratios meet AA (dark text on light backgrounds)
- ✅ **1.4.4** — Text scales with browser zoom
- ✅ **2.1.1** — All interactive elements are keyboard accessible
- ✅ **2.1.2** — No keyboard traps (lightbox uses proper focus trap with Escape to exit)
- ✅ **2.4.1** — Skip link to main content
- ✅ **2.4.3** — Logical focus order
- ✅ **2.4.7** — Visible focus indicators (gold outline)
- ✅ **2.4.11** — Focus not obscured (WCAG 2.2 new criterion)
- ✅ **2.5.3** — Labels match accessible names
- ✅ **2.5.8** — Touch targets ≥ 44×44px (WCAG 2.2 new criterion)
- ✅ **3.3.1/3.3.2** — Error identification and labels on all form fields
- ✅ **prefers-reduced-motion** — All animations disabled for users who prefer it

---

## 6. Adding more soundscapes

To add a track, in `index.html` add a new button inside `.music-options`:

```html
<button class="music-btn" role="radio" aria-checked="false"
        data-track="stream" data-src="audio/babbling-stream.mp3">
  <span class="music-icon" aria-hidden="true">💧</span>
  <span>Stream</span>
</button>
```

Then add `audio/babbling-stream.mp3` to your project.

---

*Serenscape — a place of shared stillness.*
