import { FashionApi } from './api.js';

const api = new FashionApi();

const state = {
  activeView: 'overview',
  authMode: 'login',
  auth: {
    token: api.getToken(),
    profile: null
  },
  appStatus: 'Checking connection',
  appError: null,
  wardrobe: [],
  wardrobeStats: null,
  chatMessages: [
    { role: 'assistant', text: 'Ask for outfit ideas, styling advice, or wardrobe combinations.' }
  ],
  recommendations: [],
  tryOnImage: null,
  previewImage: null,
  loading: false
};

const views = [
  { id: 'overview', label: 'Overview', hint: 'Status and shortcuts' },
  { id: 'wardrobe', label: 'Wardrobe', hint: 'Inventory and uploads' },
  { id: 'chat', label: 'Stylist Chat', hint: 'Ask the AI' },
  { id: 'analysis', label: 'Analyze', hint: 'Tag an image' },
  { id: 'recommendations', label: 'Looks', hint: 'Build outfits' },
  { id: 'tryon', label: 'Try-On', hint: 'Visual preview' },
  { id: 'profile', label: 'Profile', hint: 'Account and photo' }
];

const root = document.getElementById('app');

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCount(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function chipList(items, tone = '') {
  return (items || []).slice(0, 6).map((item) => `<span class="chip ${tone}">${esc(item)}</span>`).join('');
}

function heroMarkup() {
  const profile = state.auth.profile;
  const wardrobeCount = state.wardrobe.length;
  const subscription = profile?.subscription?.tier || 'guest';

  return `
    <section class="hero fade-in">
      <div>
        <div class="chip-row" style="margin-bottom:16px">
          <span class="chip accent">Production shell</span>
          <span class="chip">${esc(state.appStatus)}</span>
          <span class="chip ${state.appError ? 'danger' : 'warn'}">${state.appError ? esc(state.appError) : esc(subscription)}</span>
        </div>
        <h2>Fashion AI, rebuilt as a real product.</h2>
        <p>
          A focused wardrobe workspace with authenticated profile state, direct AI tools, and a cleaner interface that can survive real users.
        </p>
        <div class="hero-actions">
          <button class="button-primary" data-action="view:wardrobe">Open wardrobe</button>
          <button class="button-secondary" data-action="view:chat">Ask the stylist</button>
          <button class="button-ghost" data-action="view:profile">Profile settings</button>
        </div>
      </div>
      <div class="hero-aside">
        <div class="metric-grid">
          <div class="metric-card">
            <strong>${formatCount(wardrobeCount)}</strong>
            <span>Saved wardrobe items</span>
          </div>
          <div class="metric-card">
            <strong>${formatCount(state.recommendations.length)}</strong>
            <span>Generated looks</span>
          </div>
          <div class="metric-card">
            <strong>${profile?.username ? esc(profile.username) : 'Guest'}</strong>
            <span>Active profile</span>
          </div>
          <div class="metric-card">
            <strong>${state.auth.token ? 'Signed in' : 'Not signed in'}</strong>
            <span>Session state</span>
          </div>
        </div>
        <div class="surface" style="padding:18px">
          <div class="section-head" style="margin-bottom:10px">
            <div>
              <h3 class="panel-title" style="font-size:1.35rem;margin-bottom:4px">System health</h3>
              <p class="section-subtitle">Live backend checks and product readiness.</p>
            </div>
          </div>
          <div class="stack">
            <div class="status-pill"><span class="status-indicator"></span><span>${esc(state.appStatus)}</span></div>
            <div class="notice">API base: ${esc(api.baseUrl)}</div>
            <div class="notice ${state.auth.token ? 'success' : ''}">${state.auth.token ? 'Authenticated session available.' : 'Connect an account to unlock wardrobe, profile, and try-on.'}</div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function authMarkup() {
  return `
    <section class="auth-layout fade-in">
      <div class="auth-hero">
        <div class="chip-row" style="margin-bottom:18px">
          <span class="chip accent">Secure auth</span>
          <span class="chip">Profile photo upload</span>
          <span class="chip">Wardrobe + chat sync</span>
        </div>
        <h2>One product shell for styling, inventory, and try-on.</h2>
        <p>
          The old prototype was a demo page. This version uses a shared API client, a persistent session, and a single layout that can grow into production.
        </p>
        <div class="split-grid" style="margin-top:24px">
          <div class="prompt-card" style="padding:18px">
            <h4>What’s wired</h4>
            <p>Auth, profile photo upload, wardrobe CRUD, chat, recommendations, analysis, and try-on.</p>
          </div>
          <div class="prompt-card" style="padding:18px">
            <h4>What’s next</h4>
            <p>Role-based access, server-side quotas, and stronger API contracts for production traffic.</p>
          </div>
        </div>
      </div>
      <div class="auth-panel">
        <div class="auth-tabs">
          <button class="${state.authMode === 'login' ? 'active' : ''}" data-action="auth-mode" data-mode="login">Sign in</button>
          <button class="${state.authMode === 'register' ? 'active' : ''}" data-action="auth-mode" data-mode="register">Create account</button>
        </div>
        <form class="auth-grid" data-form="auth">
          <div class="form-field">
            <label>Email</label>
            <input name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="form-field">
            <label>Password</label>
            <input name="password" type="password" placeholder="Minimum 6 characters" required />
          </div>
          <div class="form-field">
            <label>Username</label>
            <input name="username" type="text" placeholder="Optional" />
          </div>
          <button class="button-primary" type="submit">${state.authMode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p class="footer-note">API base can be changed from localStorage with the key <strong>fashion-api-base</strong>.</p>
      </div>
    </section>
  `;
}

function overviewMarkup() {
  const topItems = state.wardrobe.slice(0, 3);
  const latestMessages = state.chatMessages.slice(-3);

  return `
    <div class="panel-grid fade-in">
      <div>
        <section class="section-card">
          <div class="section-head">
            <div>
              <h3 class="section-title">Current wardrobe</h3>
              <p class="section-subtitle">Items synced from the API.</p>
            </div>
            <button class="button-ghost" data-action="view:wardrobe">See all</button>
          </div>
          <div class="cards">
            ${topItems.length ? topItems.map(itemCardMarkup).join('') : emptyState('No wardrobe items yet', 'Upload clothing photos to start building the closet.')}
          </div>
        </section>
        <section class="section-card">
          <div class="section-head">
            <div>
              <h3 class="section-title">Recent styling chat</h3>
              <p class="section-subtitle">Latest conversation state.</p>
            </div>
            <button class="button-ghost" data-action="view:chat">Open chat</button>
          </div>
          <div class="cards">
            ${latestMessages.map(messageMarkup).join('')}
          </div>
        </section>
      </div>
      <div class="stack">
        <section class="section-card">
          <h3 class="section-title">Quick actions</h3>
          <p class="section-subtitle">Shortcuts to the most common flows.</p>
          <div class="stack" style="margin-top:16px">
            <button class="button-secondary" data-action="view:recommendations">Generate outfit ideas</button>
            <button class="button-secondary" data-action="view:analysis">Analyze a garment photo</button>
            <button class="button-secondary" data-action="view:tryon">Run virtual try-on</button>
          </div>
        </section>
        <section class="section-card">
          <h3 class="section-title">Profile</h3>
          <div class="stack" style="margin-top:14px">
            <div class="notice">${state.auth.profile ? esc(state.auth.profile.email) : 'No authenticated profile loaded yet.'}</div>
            <div class="notice">Subscription: ${esc(state.auth.profile?.subscription?.tier || 'guest')}</div>
            <div class="notice">Photo: ${state.auth.profile?.profileImage ? 'available' : 'not set'}</div>
          </div>
        </section>
      </div>
    </div>
  `;
}

function itemCardMarkup(item) {
  const tags = item.tags || [];
  return `
    <article class="item-card">
      <div class="item-top">
        <div>
          <h4>${esc(item.name || 'Wardrobe item')}</h4>
          <p>${esc([item.color, item.style, item.itemType].filter(Boolean).join(' • ') || 'Saved clothing item')}</p>
        </div>
        <span class="chip accent">${esc(item.isFavorite ? 'Favorite' : item.itemType || 'Item')}</span>
      </div>
      <div class="item-meta">${chipList(tags)}</div>
    </article>
  `;
}

function messageMarkup(message) {
  const tone = message.role === 'user' ? 'accent' : '';
  return `
    <article class="message-card" style="padding:16px">
      <div class="item-top">
        <h4>${message.role === 'user' ? 'You' : 'Stylist'}</h4>
        <span class="chip ${tone}">${esc(message.role)}</span>
      </div>
      <p>${esc(message.text)}</p>
    </article>
  `;
}

function emptyState(title, body) {
  return `
    <div class="empty-state" style="padding:20px">
      <h4 style="margin:0 0 8px">${esc(title)}</h4>
      <p>${esc(body)}</p>
    </div>
  `;
}

function wardrobeMarkup() {
  return `
    <section class="section-shell active fade-in">
      <div class="surface">
        <div class="section-head">
          <div>
            <h3 class="section-title">Wardrobe</h3>
            <p class="section-subtitle">Search, inspect, and upload wardrobe items.</p>
          </div>
          <button class="button-ghost" data-action="refresh:wardrobe">Refresh</button>
        </div>
        <div class="form-grid" style="margin-bottom:16px">
          <div class="form-field">
            <label>Search</label>
            <input name="wardrobeSearch" placeholder="blazer, denim, white shirt" />
          </div>
          <div class="form-field">
            <label>Filter</label>
            <select name="wardrobeFilter">
              <option value="">All items</option>
              <option value="jacket">Jackets</option>
              <option value="shirt">Shirts</option>
              <option value="pants">Pants</option>
              <option value="dress">Dresses</option>
              <option value="shoes">Shoes</option>
            </select>
          </div>
        </div>
        <div class="split-grid">
          <form class="stack" data-form="wardrobe-upload">
            <div class="upload-field">
              <label>Add wardrobe photos</label>
              <input type="file" name="images" accept="image/*" multiple required />
            </div>
            <button class="button-primary" type="submit">Analyze and add</button>
            <p class="helper-text">Each image becomes a separate wardrobe item after AI analysis.</p>
          </form>
          <div>
            <div class="notice">Total items: ${formatCount(state.wardrobe.length)}</div>
            <div style="margin-top:14px" class="notice">Inventory health: ${state.wardrobeStats ? `${formatCount(state.wardrobeStats.stats?.totalItems || 0)} items / ${formatCount(state.wardrobeStats.stats?.totalImages || 0)} images` : 'waiting for sync'}</div>
          </div>
        </div>
      </div>
      <div class="surface">
        <div class="cards">
          ${state.wardrobe.length ? state.wardrobe.map(itemCardMarkup).join('') : emptyState('Your wardrobe is empty', 'Add a few garments to unlock styling and try-on.')}
        </div>
      </div>
    </section>
  `;
}

function chatMarkup() {
  return `
    <section class="section-shell active fade-in">
      <div class="surface">
        <div class="section-head">
          <div>
            <h3 class="section-title">Stylist chat</h3>
            <p class="section-subtitle">Ask for outfits, color pairings, or wardrobe edits.</p>
          </div>
          <button class="button-ghost" data-action="reset:chat">Reset</button>
        </div>
        <form class="stack" data-form="chat">
          <div class="form-field">
            <label>Your message</label>
            <textarea name="message" placeholder="What should I wear to a rooftop dinner?"></textarea>
          </div>
          <button class="button-primary" type="submit">Send to stylist</button>
        </form>
      </div>
      <div class="surface">
        <div class="cards">
          ${state.chatMessages.map(messageMarkup).join('')}
        </div>
      </div>
    </section>
  `;
}

function analysisMarkup() {
  return `
    <section class="section-shell active fade-in">
      <div class="surface">
        <div class="section-head">
          <div>
            <h3 class="section-title">Image analysis</h3>
            <p class="section-subtitle">Extract tags, colors, and style metadata from a clothing photo.</p>
          </div>
        </div>
        <form class="stack" data-form="analysis">
          <div class="upload-field">
            <label>Clothing image</label>
            <input type="file" name="image" accept="image/*" required />
          </div>
          <button class="button-primary" type="submit">Analyze image</button>
        </form>
        <div id="analysis-result" style="margin-top:16px"></div>
      </div>
    </section>
  `;
}

function recommendationsMarkup() {
  return `
    <section class="section-shell active fade-in">
      <div class="surface">
        <div class="section-head">
          <div>
            <h3 class="section-title">Outfit recommendations</h3>
            <p class="section-subtitle">Build looks from your wardrobe inventory.</p>
          </div>
        </div>
        <form class="stack" data-form="recommendations">
          <div class="form-grid">
            <div class="form-field">
              <label>Occasion</label>
              <input name="occasion" placeholder="Business meeting" required />
            </div>
            <div class="form-field">
              <label>Body shape</label>
              <select name="bodyShape">
                <option value="">Optional</option>
                <option>Rectangle</option>
                <option>Apple</option>
                <option>Pear</option>
                <option>Hourglass</option>
                <option>Inverted Triangle</option>
              </select>
            </div>
            <div class="form-field">
              <label>Weather</label>
              <input name="weather" placeholder="Warm, rainy, cold" />
            </div>
            <div class="form-field">
              <label>Use API wardrobe</label>
              <select name="useDatabase">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <button class="button-primary" type="submit">Generate looks</button>
        </form>
      </div>
      <div class="surface">
        <div class="cards">
          ${state.recommendations.length ? state.recommendations.map(recommendationMarkup).join('') : emptyState('No recommendations yet', 'Generate looks using saved wardrobe items.')}
        </div>
      </div>
    </section>
  `;
}

function recommendationMarkup(outfit) {
  const items = Array.isArray(outfit.items) ? outfit.items : [];
  return `
    <article class="recommendation-card" style="padding:18px">
      <h4>${esc(outfit.name || outfit.title || 'Outfit suggestion')}</h4>
      <p style="margin-top:8px">${esc(outfit.reasoning || outfit.stylingTips || 'Recommended styling combination')}</p>
      <div class="recommendation-meta" style="margin-top:14px">${chipList(items, 'accent')}</div>
    </article>
  `;
}

function tryOnMarkup() {
  return `
    <section class="section-shell active fade-in">
      <div class="surface">
        <div class="section-head">
          <div>
            <h3 class="section-title">Virtual try-on</h3>
            <p class="section-subtitle">Combine a garment image with a profile photo or upload.</p>
          </div>
        </div>
        <form class="stack" data-form="tryon">
          <div class="form-grid">
            <div class="upload-field">
              <label>Garment image</label>
              <input type="file" name="garment" accept="image/*" required />
            </div>
            <div class="upload-field">
              <label>Use profile photo or upload</label>
              <input type="file" name="userPhoto" accept="image/*" />
            </div>
          </div>
          <button class="button-primary" type="submit">Generate try-on</button>
        </form>
      </div>
      <div class="surface">
        <div class="preview-box" id="tryon-preview">
          ${state.previewImage ? `<img alt="Try-on preview" src="${state.previewImage}">` : '<span>Try-on preview will appear here</span>'}
        </div>
      </div>
    </section>
  `;
}

function profileMarkup() {
  const profile = state.auth.profile;
  return `
    <section class="section-shell active fade-in">
      <div class="surface">
        <div class="section-head">
          <div>
            <h3 class="section-title">Profile</h3>
            <p class="section-subtitle">Session state, photo upload, and account metadata.</p>
          </div>
          <button class="button-ghost" data-action="logout">Log out</button>
        </div>
        <div class="split-grid">
          <div class="stack">
            <div class="notice">Email: ${esc(profile?.email || 'Unknown')}</div>
            <div class="notice">Username: ${esc(profile?.username || 'Unknown')}</div>
            <div class="notice">Tier: ${esc(profile?.subscription?.tier || 'guest')}</div>
            <div class="notice">Profile image: ${profile?.profileImage ? 'available' : 'not set'}</div>
          </div>
          <div>
            <form class="stack" data-form="photo">
              <div class="upload-field">
                <label>Upload profile photo</label>
                <input type="file" name="photo" accept="image/*" required />
              </div>
              <button class="button-primary" type="submit">Save photo</button>
            </form>
            <button class="button-danger" style="margin-top:12px;width:100%" data-action="remove-photo">Remove profile photo</button>
          </div>
        </div>
      </div>
      <div class="surface">
        <div class="preview-box">
          ${profile?.profileImage ? `<img alt="Profile" src="${profile.profileImage}">` : '<span>Profile photo preview</span>'}
        </div>
      </div>
    </section>
  `;
}

function shellMarkup() {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">FA</div>
          <h1>Fashion AI</h1>
          <p>Product shell for wardrobe intelligence, styling help, and photo-driven try-on.</p>
        </div>
        <nav class="nav">
          ${views.map((view) => `
            <button class="${state.activeView === view.id ? 'active' : ''}" data-action="view:${view.id}">
              <span>
                <strong style="display:block;text-align:left">${esc(view.label)}</strong>
                <small style="display:block;color:var(--muted);text-align:left;margin-top:4px">${esc(view.hint)}</small>
              </span>
              <span class="dot"></span>
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <span class="status-pill"><span class="status-indicator"></span>${esc(state.auth.token ? 'Session active' : 'Signed out')}</span>
          <span>${esc(state.auth.profile?.email || 'No user loaded')}</span>
          <span>${esc(api.baseUrl)}</span>
        </div>
      </aside>
      <main class="main-panel">
        ${heroMarkup()}
        <div class="panel-grid">
          <div>
            ${state.activeView === 'overview' ? overviewMarkup() : ''}
            ${state.activeView === 'wardrobe' ? wardrobeMarkup() : ''}
            ${state.activeView === 'chat' ? chatMarkup() : ''}
            ${state.activeView === 'analysis' ? analysisMarkup() : ''}
            ${state.activeView === 'recommendations' ? recommendationsMarkup() : ''}
            ${state.activeView === 'tryon' ? tryOnMarkup() : ''}
            ${state.activeView === 'profile' ? profileMarkup() : ''}
          </div>
          <div class="stack">
            <section class="section-card">
              <h3 class="section-title">Connection</h3>
              <div class="stack" style="margin-top:14px">
                <div class="notice ${state.appError ? 'error' : 'success'}">${esc(state.appError || 'Backend healthy and ready.')}</div>
                <div class="notice">Wardrobe endpoint is the source of truth for saved items.</div>
                <div class="notice">Chat and try-on are using the same auth session and base URL.</div>
              </div>
            </section>
            <section class="section-card">
              <h3 class="section-title">Session</h3>
              <div class="stack" style="margin-top:14px">
                <div class="notice">Mode: ${esc(state.authMode)}</div>
                <div class="notice">Token: ${state.auth.token ? 'present' : 'missing'}</div>
                <div class="notice">View: ${esc(state.activeView)}</div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  `;
}

function render() {
  const signedIn = Boolean(state.auth.token && state.auth.profile);
  root.innerHTML = signedIn ? shellMarkup() : authMarkup();
}

function setNotice(message, type = 'info') {
  state.appStatus = message;
  state.appError = type === 'error' ? message : null;
}

function setLoading(loading, message = null) {
  state.loading = loading;
  if (message) setNotice(message, 'info');
  render();
}

async function loadSession() {
  if (!state.auth.token) {
    render();
    return;
  }

  try {
    const [profileResult, wardrobeResult, statsResult, healthResult] = await Promise.allSettled([
      api.profile(),
      api.wardrobe({ limit: 20 }),
      api.wardrobeStats(),
      api.health()
    ]);

    if (profileResult.status === 'fulfilled') {
      state.auth.profile = profileResult.value.profile;
    }

    if (wardrobeResult.status === 'fulfilled') {
      state.wardrobe = wardrobeResult.value.items || [];
    }

    if (statsResult.status === 'fulfilled') {
      state.wardrobeStats = statsResult.value;
    }

    if (healthResult.status === 'fulfilled') {
      setNotice(`Backend healthy: ${healthResult.value.status}`, 'info');
    }
  } catch (error) {
    setNotice(error.message, 'error');
  }

  render();
}

async function submitAuth(formData) {
  const payload = {
    email: formData.get('email')?.toString().trim(),
    password: formData.get('password')?.toString(),
    username: formData.get('username')?.toString().trim()
  };

  const action = state.authMode === 'login' ? api.login(payload) : api.register(payload);
  const result = await action;
  api.setToken(result.token);
  state.auth.token = result.token;
  state.auth.profile = (await api.profile()).profile;
  state.activeView = 'overview';
  await loadSession();
}

async function submitWardrobe(formData) {
  const files = formData.getAll('images');
  if (!files.length) throw new Error('Add at least one image.');
  await api.addWardrobeItems(files);
  await loadSession();
  state.activeView = 'wardrobe';
}

async function submitChat(formData) {
  const message = formData.get('message')?.toString().trim();
  if (!message) return;
  state.chatMessages.push({ role: 'user', text: message });
  render();

  const result = await api.chat({
    message,
    wardrobeContext: state.wardrobe,
    conversationHistory: state.chatMessages.slice(-8).map((entry) => ({ role: entry.role, content: entry.text })),
  });

  state.chatMessages.push({ role: 'assistant', text: result.message || 'No response returned.' });
  state.activeView = 'chat';
}

async function submitAnalysis(formData) {
  const file = formData.get('image');
  if (!(file instanceof File)) throw new Error('Select an image first.');
  const result = await api.analyzeImage(file);
  const target = document.getElementById('analysis-result');
  if (target) {
    const tags = result.tags || {};
    target.innerHTML = `
      <div class="notice success">
        <strong>Analysis complete</strong>
        <div class="chip-row" style="margin-top:10px">${chipList([tags.name, tags.itemType, tags.color, tags.style, ...(tags.tags || [])])}</div>
      </div>
    `;
  }
}

async function submitRecommendations(formData) {
  const occasion = formData.get('occasion')?.toString().trim();
  if (!occasion) throw new Error('Occasion is required.');
  const payload = {
    wardrobeItems: state.wardrobe,
    occasion,
    bodyShape: formData.get('bodyShape')?.toString().trim() || null,
    weather: formData.get('weather')?.toString().trim() || null,
    useDatabase: formData.get('useDatabase')?.toString() === 'true'
  };
  const result = await api.recommendations(payload);
  state.recommendations = result.outfits || [];
  state.activeView = 'recommendations';
}

async function submitTryOn(formData) {
  const garment = formData.get('garment');
  const userPhoto = formData.get('userPhoto');
  if (!(garment instanceof File)) throw new Error('Garment image is required.');
  const result = await api.tryOn(garment, userPhoto instanceof File && userPhoto.size ? userPhoto : null);
  state.previewImage = result.image;
  const preview = document.getElementById('tryon-preview');
  if (preview && result.image) preview.innerHTML = `<img alt="Try-on preview" src="${result.image}">`;
}

async function uploadProfilePhoto(formData) {
  const file = formData.get('photo');
  if (!(file instanceof File)) throw new Error('Select a profile photo.');
  await api.updateProfilePhoto(file);
  await loadSession();
  state.activeView = 'profile';
}

function bindInteractions() {
  root.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    if (action.startsWith('view:')) {
      state.activeView = action.split(':')[1];
      render();
      return;
    }

    if (action === 'auth-mode') {
      state.authMode = target.dataset.mode || 'login';
      render();
      return;
    }

    if (action === 'logout') {
      api.setToken(null);
      state.auth.token = null;
      state.auth.profile = null;
      state.wardrobe = [];
      state.recommendations = [];
      state.chatMessages = [{ role: 'assistant', text: 'Ask for outfit ideas, styling advice, or wardrobe combinations.' }];
      render();
      return;
    }

    if (action === 'remove-photo') {
      await api.removeProfilePhoto();
      await loadSession();
      return;
    }

    if (action === 'reset:chat') {
      state.chatMessages = [{ role: 'assistant', text: 'Ask for outfit ideas, styling advice, or wardrobe combinations.' }];
      render();
    }
  });

  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();

    const formData = new FormData(form);

    try {
      setLoading(true, 'Working');
      if (form.dataset.form === 'auth') await submitAuth(formData);
      if (form.dataset.form === 'wardrobe-upload') await submitWardrobe(formData);
      if (form.dataset.form === 'chat') await submitChat(formData);
      if (form.dataset.form === 'analysis') await submitAnalysis(formData);
      if (form.dataset.form === 'recommendations') await submitRecommendations(formData);
      if (form.dataset.form === 'tryon') await submitTryOn(formData);
      if (form.dataset.form === 'photo') await uploadProfilePhoto(formData);
      setNotice('Ready', 'info');
    } catch (error) {
      setNotice(error.message, 'error');
    } finally {
      setLoading(false);
      await loadSession();
    }
  });
}

async function bootstrap() {
  bindInteractions();
  await loadSession();
  if (!state.auth.token) {
    try {
      const health = await api.health();
      setNotice(`Backend healthy: ${health.status}`, 'info');
    } catch (error) {
      setNotice(error.message, 'error');
    }
    render();
  }
}

bootstrap();