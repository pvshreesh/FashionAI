import { FashionApi } from './api.js';

const api = new FashionApi();
const state = {
  activeView: 'wardrobe',
  auth: {
    token: api.getToken(),
    profile: api.getSession()?.user || null
  },
  system: {
    backend: 'checking',
    database: 'unknown',
    wardrobeMode: 'shared',
    capabilities: {}
  },
  notice: {
    type: 'info',
    message: ''
  },
  wardrobe: [],
  wardrobeSearch: '',
  wardrobeNote: '',
  recommendationOccasion: 'smart casual dinner',
  recommendations: [],
  chatInput: '',
  chatMessages: [{ role: 'assistant', text: 'Tell me the occasion, weather, or item you want to style.' }],
  analysisFile: null,
  analysisResult: null,
  analysisImageDataUrl: '',
  tryOnGarmentFile: null,
  tryOnUserPhotoFile: null,
  imagePrompt: 'Editorial fashion campaign photo of a confident model wearing a structured royal blue blazer, soft studio lighting, clean background',
  previewImage: null,
  generatedImage: null,
  loading: false,
  loadingMessage: '',
  accountMode: 'login',
  pendingConfirmationEmail: '',
  pendingConfirmationCode: '',
  profilePhotoFile: null
};

const views = [
  { id: 'analysis', label: 'Analyze' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'chat', label: 'Chat' },
  { id: 'tryon', label: 'Try-On' },
  { id: 'account', label: 'Account' }
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

function setNotice(message, type = 'info') {
  state.notice = { message, type };
  render();
}

function setLoading(loading, message = '') {
  state.loading = loading;
  state.loadingMessage = loading ? message : '';
  render();
}

function hasSession() {
  return Boolean(state.auth.token && state.auth.profile);
}

function sessionStatusLabel() {
  return hasSession()
    ? `Signed in as ${state.auth.profile.username || state.auth.profile.email}`
    : state.system.wardrobeMode === 'shared' ? 'Shared wardrobe mode' : 'Sign in for personal wardrobe';
}

function databaseConnected() {
  return ['configured', 'connected', 'ready'].includes(state.system.database);
}

function canUseWardrobe() {
  return databaseConnected() && (state.system.wardrobeMode === 'shared' || hasSession());
}

function wardrobeItems() {
  const query = state.wardrobeSearch.trim().toLowerCase();
  if (!query) return state.wardrobe;

  return state.wardrobe.filter((item) => {
    const haystack = [
      item.name,
      item.itemType,
      item.color,
      item.style,
      ...(item.tags || [])
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function chipList(items, tone = '') {
  return (items || [])
    .filter(Boolean)
    .slice(0, 6)
    .map((item) => `<span class="chip ${tone}">${esc(item)}</span>`)
    .join('');
}

function itemCardMarkup(item) {
  const itemId = item.id || item.itemId || item._id;
  const imageMarkup = item?.images?.[0]?.url
    ? `<img alt="${esc(item.name || 'Wardrobe item')}" src="${esc(item.images[0].url)}">`
    : '<div class="placeholder">No image</div>';
  const summary = [item.color, item.style, item.itemType].filter(Boolean).join(' / ');

  return `
    <article class="item-card">
      <div class="item-image">${imageMarkup}</div>
      <div class="item-info">
        <h4>${esc(item.name || 'Wardrobe item')}</h4>
        <p class="secondary">${esc(summary || 'Uncategorized')}</p>
        ${item.aiDescription ? `<p class="item-copy">${esc(item.aiDescription)}</p>` : ''}
        ${item.tags?.length ? `<div class="tags">${chipList(item.tags, 'small')}</div>` : ''}
        ${itemId ? `<button class="button-danger" data-action="delete-item" data-id="${esc(itemId)}" ${state.loading ? 'disabled' : ''}>Delete</button>` : ''}
      </div>
    </article>
  `;
}

function recommendationMarkup(outfit, index) {
  const items = Array.isArray(outfit.items) ? outfit.items.join(', ') : outfit.items || 'Suggested outfit';
  const reason = outfit.reasoning || outfit.whyItWorks || outfit.reason || '';
  const tips = outfit.stylingTips || outfit.tips || outfit.bodyShapeFlattery || '';

  return `
    <article class="result-card">
      <div class="result-title">Look ${index + 1}</div>
      <h3>${esc(items)}</h3>
      ${reason ? `<p>${esc(reason)}</p>` : ''}
      ${tips ? `<p class="secondary">${esc(tips)}</p>` : ''}
    </article>
  `;
}

function analysisSummaryMarkup() {
  if (!state.analysisResult) return '';

  const item = state.analysisResult;
  const details = [
    item.itemType,
    item.color,
    item.pattern,
    item.style,
    item.season
  ].filter(Boolean);

  return `
    <div class="panel stack">
      <div class="panel-header">
        <div>
          <div class="eyebrow">Latest Analysis</div>
          <h3>${esc(item.name || 'Untitled item')}</h3>
        </div>
        ${state.analysisImageDataUrl ? `<img class="thumb" src="${state.analysisImageDataUrl}" alt="Analyzed item preview">` : ''}
      </div>
      ${details.length ? `<p>${esc(details.join(' / '))}</p>` : ''}
      ${item.description || item.aiDescription ? `<p class="secondary">${esc(item.description || item.aiDescription)}</p>` : ''}
      ${item.tags?.length ? `<div class="tags">${chipList(item.tags)}</div>` : ''}
      <div class="action-row">
        <button class="button-primary" data-action="save-analysis" ${!canUseWardrobe() || state.loading ? 'disabled' : ''}>Save To Wardrobe</button>
        <button class="button-secondary" data-action="jump-wardrobe">Open Wardrobe</button>
        ${!canUseWardrobe() ? `<span class="helper-text">${databaseConnected() ? 'Sign in to save to your personal wardrobe.' : 'AWS data services need to be configured before saving.'}</span>` : ''}
      </div>
    </div>
  `;
}

function noticeMarkup() {
  if (!state.notice.message && !state.loading) return '';
  const message = state.loading ? state.loadingMessage : state.notice.message;
  const type = state.loading ? state.notice.type || 'info' : state.notice.type;
  return `
    <div class="notice ${esc(type)}" role="status" aria-live="polite">
      <span>${esc(message)}</span>
      <button class="close" data-action="dismiss-notice" aria-label="Dismiss notice">x</button>
    </div>
  `;
}

function navMarkup() {
  return `
    <nav class="sidebar">
      <div class="nav-header">
        <div class="eyebrow">Fashion workflow</div>
        <h1>Fashion AI</h1>
        <p>Analyze, save, and style from one place.</p>
      </div>
      <div class="nav-items">
        ${views.map((view) => `
          <button class="nav-btn ${state.activeView === view.id ? 'active' : ''}" data-action="view:${view.id}">
            <span>${view.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="nav-status">
        <div class="status-item">
          <span class="dot ${state.system.backend === 'online' ? 'online' : 'offline'}"></span>
          <span>Backend ${state.system.backend === 'online' ? 'ready' : 'offline'}</span>
        </div>
        <div class="status-item">
          <span class="dot ${databaseConnected() ? 'online' : 'offline'}"></span>
          <span>Database ${databaseConnected() ? 'configured' : 'offline'}</span>
        </div>
        <div class="status-item">
          <span class="dot ${hasSession() || state.system.wardrobeMode === 'shared' ? 'online' : 'warn'}"></span>
          <span>${sessionStatusLabel()}</span>
        </div>
      </div>
    </nav>
  `;
}

function analysisViewMarkup() {
  const analyzeEnabled = state.system.capabilities.analyze !== false;
  return `
    <section class="view-content stack-xl">
      <header class="hero">
        <div>
          <div class="eyebrow">Happy Path</div>
          <h2>Analyze an item, save it, and build recommendations from your wardrobe.</h2>
          <p>Start by uploading one garment photo. The app will extract tags you can save directly into your ${state.system.wardrobeMode === 'shared' ? 'shared' : 'personal'} wardrobe.</p>
        </div>
      </header>
      <div class="panel stack">
        <div class="panel-header">
          <div>
            <div class="eyebrow">Step 1</div>
            <h3>Analyze a clothing image</h3>
          </div>
        </div>
        <div class="form-group">
          <label for="analysis-image">Item photo</label>
          <input id="analysis-image" type="file" accept="image/*" data-action="analysis-file" ${state.loading ? 'disabled' : ''}>
        </div>
        <div class="action-row">
          <button class="button-primary" data-action="analyze-image" ${state.analysisFile && analyzeEnabled && !state.loading ? '' : 'disabled'}>Run Analysis</button>
          <button class="button-secondary" data-action="clear-analysis" ${state.analysisResult || state.analysisFile ? '' : 'disabled'}>Reset</button>
        </div>
      </div>
      ${!analyzeEnabled ? '<p class="secondary">Add GEMINI_API_KEY to enable clothing analysis.</p>' : ''}
      ${analysisSummaryMarkup()}
    </section>
  `;
}

function wardrobeViewMarkup() {
  const items = wardrobeItems();
  const canRecommend = canUseWardrobe() && state.wardrobe.length > 0 && state.system.capabilities.recommendations !== false;

  return `
    <section class="view-content stack-xl">
      <header class="view-header split">
        <div>
          <div class="eyebrow">Step 2</div>
          <h2>Wardrobe</h2>
          <p>${state.wardrobeNote ? esc(state.wardrobeNote) : 'Saved items live here and feed outfit recommendations.'}</p>
        </div>
        <div class="inline-controls">
          <input
            type="text"
            placeholder="Search wardrobe"
            data-action="wardrobe-search"
            value="${esc(state.wardrobeSearch)}"
          >
          <button class="button-secondary" data-action="refresh-wardrobe" ${canUseWardrobe() && !state.loading ? '' : 'disabled'}>Refresh</button>
        </div>
      </header>

      <div class="panel stack">
        <div class="panel-header">
          <div>
            <div class="eyebrow">Step 3</div>
            <h3>Generate outfit recommendations</h3>
          </div>
        </div>
        <div class="inline-controls">
          <input
            type="text"
            placeholder="Occasion"
            data-action="occasion-input"
            value="${esc(state.recommendationOccasion)}"
          >
          <button class="button-primary" data-action="recommend-outfits" ${canRecommend ? '' : 'disabled'}>Recommend Outfits</button>
        </div>
        ${!canUseWardrobe() ? `<p class="secondary">${databaseConnected() ? 'Sign in to use your personal wardrobe.' : 'AWS data services are not configured.'}</p>` : ''}
      </div>

      ${state.recommendations.length ? `
        <div class="result-grid">
          ${state.recommendations.map((outfit, index) => recommendationMarkup(outfit, index)).join('')}
        </div>
      ` : ''}

      ${items.length ? `
        <div class="items-grid">
          ${items.map((item) => itemCardMarkup(item)).join('')}
        </div>
      ` : state.wardrobeSearch && state.wardrobe.length ? `
        <div class="panel empty-panel">
          <h3>No matching items</h3>
          <p>Try a different wardrobe search.</p>
        </div>
      ` : `
        <div class="panel empty-panel">
          <h3>${canUseWardrobe() ? 'No wardrobe items yet' : 'Sign in to open your wardrobe'}</h3>
          <p>${canUseWardrobe() ? 'Analyze something first, then save it here.' : 'Your saved clothing and recommendations are private to your account.'}</p>
          <button class="button-primary" data-action="view:${canUseWardrobe() ? 'analysis' : 'account'}">${canUseWardrobe() ? 'Go To Analyze' : 'Go To Account'}</button>
        </div>
      `}
    </section>
  `;
}

function chatViewMarkup() {
  const chatEnabled = state.system.capabilities.chat !== false;
  return `
    <section class="view-content stack-xl">
      <header class="view-header">
        <div>
          <div class="eyebrow">Stylist Chat</div>
          <h2>Ask for styling help</h2>
          <p>Ask about colors, fit, occasions, or ways to style your saved items.</p>
        </div>
      </header>
      <div class="panel stack">
        <div class="chat-messages">
          ${state.chatMessages.map((message) => `
            <div class="message ${message.role}">
              <p>${esc(message.text)}</p>
            </div>
          `).join('')}
        </div>
        <div class="chat-input">
          <input type="text" placeholder="Ask about colors, occasions, or how to style saved items." data-action="chat-input" value="${esc(state.chatInput)}" ${state.loading ? 'disabled' : ''}>
          <button class="button-primary" data-action="send-chat" ${chatEnabled && !state.loading ? '' : 'disabled'}>Send</button>
        </div>
        ${!chatEnabled ? '<p class="secondary">Add GEMINI_API_KEY to enable stylist chat.</p>' : ''}
      </div>
    </section>
  `;
}

function tryOnViewMarkup() {
  const imageGenerationEnabled = state.system.capabilities.imageGeneration === true;
  const tryOnEnabled = state.system.capabilities.tryOn !== false;
  return `
    <section class="view-content stack-xl">
      <header class="view-header">
        <div>
          <div class="eyebrow">Virtual Try-On</div>
          <h2>Preview a garment on a person photo</h2>
          <p>Upload a garment image and optionally a person photo. If you are signed in with a profile photo, the app can reuse it.</p>
        </div>
      </header>
      <div class="panel stack">
        <div class="panel-header">
          <div>
            <div class="eyebrow">Text To Image</div>
            <h3>Generate a fresh fashion image from a prompt</h3>
          </div>
        </div>
        <div class="form-group">
          <label for="image-prompt">Prompt</label>
          <textarea id="image-prompt" rows="4" data-action="image-prompt" ${state.loading ? 'disabled' : ''}>${esc(state.imagePrompt)}</textarea>
        </div>
        <div class="action-row">
          <button class="button-primary" data-action="generate-image" ${imageGenerationEnabled && !state.loading ? '' : 'disabled'}>Generate Image</button>
        </div>
        ${!imageGenerationEnabled ? '<p class="secondary">Configure Cloudflare image generation to enable this feature.</p>' : ''}
      </div>
      ${state.generatedImage ? `
        <div class="panel">
          <img class="preview-image" src="${state.generatedImage}" alt="Generated fashion image">
        </div>
      ` : ''}
      <div class="panel stack">
        <div class="form-group">
          <label for="tryon-garment">Garment image</label>
          <input id="tryon-garment" type="file" accept="image/*" data-action="tryon-garment" ${state.loading ? 'disabled' : ''}>
        </div>
        <div class="form-group">
          <label for="tryon-user-photo">Person photo</label>
          <input id="tryon-user-photo" type="file" accept="image/*" data-action="tryon-user-photo" ${state.loading ? 'disabled' : ''}>
        </div>
        <div class="action-row">
          <button class="button-primary" data-action="generate-tryon" ${state.tryOnGarmentFile && tryOnEnabled && !state.loading ? '' : 'disabled'}>Generate Try-On</button>
        </div>
        ${!tryOnEnabled ? '<p class="secondary">Add GEMINI_API_KEY to enable virtual try-on.</p>' : ''}
      </div>
      ${state.previewImage ? `
        <div class="panel">
          <img class="preview-image" src="${state.previewImage}" alt="Virtual try-on preview">
        </div>
      ` : ''}
    </section>
  `;
}

function accountViewMarkup() {
  const profile = state.auth.profile;
  const authEnabled = state.system.capabilities.auth !== false;
  const sharedWardrobe = state.system.wardrobeMode === 'shared';

  if (hasSession()) {
    return `
      <section class="view-content stack-xl">
        <header class="view-header">
          <div>
          <div class="eyebrow">Account</div>
          <h2>${esc(profile.username || profile.email)}</h2>
          <p>${esc(profile.email || '')}</p>
          </div>
        </header>
        <div class="panel stack">
          ${profile.profileImage ? `<img class="profile-photo" src="${esc(profile.profileImage)}" alt="Profile">` : ''}
          <p class="secondary">Subscription: ${esc(profile.subscription?.tier || 'free')}</p>
          <div class="form-group">
            <label for="profile-photo">Profile photo for virtual try-on</label>
            <input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" data-action="profile-photo" ${state.loading ? 'disabled' : ''}>
          </div>
          <div class="action-row">
            <button class="button-primary" data-action="upload-profile-photo" ${state.profilePhotoFile && !state.loading ? '' : 'disabled'}>Upload Photo</button>
            ${profile.profileImage ? '<button class="button-danger" data-action="remove-profile-photo">Remove Photo</button>' : ''}
            <button class="button-secondary" data-action="logout">Sign Out</button>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="view-content stack-xl">
      <header class="view-header">
        <div>
          <div class="eyebrow">Account</div>
          <h2>${sharedWardrobe ? 'Sign in is optional' : 'Sign in to your wardrobe'}</h2>
          <p>${sharedWardrobe ? 'The shared demo wardrobe works without an account.' : 'Your account keeps saved clothing, recommendations, and profile photo private.'}</p>
        </div>
      </header>
      <div class="panel stack auth-panel">
        <div class="toggle-row">
          <button class="${state.accountMode === 'login' ? 'button-primary' : 'button-secondary'}" data-action="mode:login">Login</button>
          <button class="${state.accountMode === 'register' ? 'button-primary' : 'button-secondary'}" data-action="mode:register">Register</button>
        </div>
        <form class="stack" data-action="account-submit">
          ${state.accountMode === 'register' ? `
            <div class="form-group">
              <label for="account-username">Username</label>
              <input id="account-username" name="username" type="text" placeholder="Your name">
            </div>
          ` : ''}
          <div class="form-group">
            <label for="account-email">Email</label>
            <input id="account-email" name="email" type="email" placeholder="name@example.com" required>
          </div>
          <div class="form-group">
            <label for="account-password">Password</label>
            <input id="account-password" name="password" type="password" placeholder="At least 8 characters" required>
          </div>
          <button class="button-primary" type="submit" ${authEnabled && !state.loading ? '' : 'disabled'}>${state.accountMode === 'login' ? 'Login' : 'Create Account'}</button>
        </form>
        ${!authEnabled ? '<p class="secondary">Configure Amazon Cognito to enable accounts.</p>' : ''}
        ${state.pendingConfirmationEmail ? `
          <form class="stack" data-action="confirm-submit">
            <div class="form-group">
              <label for="account-confirmation-code">Verification code</label>
              <input
                id="account-confirmation-code"
                name="code"
                type="text"
                placeholder="Email verification code"
                value="${esc(state.pendingConfirmationCode)}"
                required
              >
            </div>
            <button class="button-secondary" type="submit">Confirm Account</button>
          </form>
        ` : ''}
      </div>
    </section>
  `;
}

function render() {
  const focusedAction = document.activeElement?.dataset?.action;
  const selectionStart = document.activeElement?.selectionStart;
  const viewMap = {
    analysis: analysisViewMarkup,
    wardrobe: wardrobeViewMarkup,
    chat: chatViewMarkup,
    tryon: tryOnViewMarkup,
    account: accountViewMarkup
  };

  const viewMarkup = (viewMap[state.activeView] || analysisViewMarkup)();

  root.innerHTML = `
    ${navMarkup()}
    <main class="main">
      ${noticeMarkup()}
      ${viewMarkup}
    </main>
  `;

  attachListeners();
  if (focusedAction) {
    const focusedElement = root.querySelector(`[data-action="${CSS.escape(focusedAction)}"]`);
    focusedElement?.focus();
    if (Number.isInteger(selectionStart) && focusedElement?.setSelectionRange) {
      focusedElement.setSelectionRange(selectionStart, selectionStart);
    }
  }
}

function attachListeners() {
  root.querySelectorAll('[data-action]').forEach((element) => {
    const action = element.dataset.action;
    if (element.tagName === 'FORM') {
      element.addEventListener('submit', handleAction);
      return;
    }
    if (action === 'chat-input' || action === 'wardrobe-search' || action === 'occasion-input' || action === 'image-prompt') {
      element.addEventListener('input', handleAction);
      return;
    }
    if (action === 'analysis-file' || action === 'tryon-garment' || action === 'tryon-user-photo' || action === 'profile-photo') {
      element.addEventListener('change', handleAction);
      return;
    }
    element.addEventListener('click', handleAction);
  });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function refreshWardrobe(showNotice = false) {
  const wardrobe = await api.wardrobe();
  state.wardrobe = wardrobe.items;
  state.wardrobeNote = wardrobe.note || '';
  if (showNotice) {
    setNotice(`Loaded ${wardrobe.items.length} wardrobe item${wardrobe.items.length === 1 ? '' : 's'}.`, 'success');
  } else {
    render();
  }
}

async function refreshSession() {
  if (!state.auth.token) {
    state.auth.profile = null;
    api.setSession(null);
    return;
  }

  try {
    state.auth.profile = await api.me();
    api.setSession({
      ...api.getSession(),
      token: state.auth.token,
      user: state.auth.profile
    });
  } catch (error) {
    api.setSession(null);
    state.auth.token = null;
    state.auth.profile = null;
    throw error;
  }
}

async function submitAccountForm(form) {
  const formData = new FormData(form);
  const payload = {
    email: String(formData.get('email') || '').trim(),
    password: String(formData.get('password') || '')
  };

  if (state.accountMode === 'register') {
    payload.username = String(formData.get('username') || '').trim();
  }

  setLoading(true, state.accountMode === 'login' ? 'Signing in...' : 'Creating account...');

  try {
    const result = state.accountMode === 'login'
      ? await api.login(payload)
      : await api.register(payload);

    if (!result.token) {
      api.setSession(null);
      state.auth.token = null;
      state.auth.profile = null;
      state.pendingConfirmationEmail = payload.email;
      state.pendingConfirmationCode = '';
      state.activeView = 'account';
      setLoading(false);
      setNotice(result.message || 'Account created. Check your email to finish signing in.', 'success');
      return;
    }

    const session = {
      token: result.token,
      idToken: result.idToken,
      refreshToken: result.refreshToken,
      user: result.user
    };
    api.setSession(session);
    state.auth.token = session.token;
    state.auth.profile = session.user;
    state.pendingConfirmationEmail = '';
    state.pendingConfirmationCode = '';
    state.activeView = 'analysis';
    await refreshWardrobe();
    setLoading(false);
    setNotice('Account ready. You can now save analyzed items to your wardrobe.', 'success');
  } catch (error) {
    setLoading(false);
    setNotice(error.message, 'error');
  }
}

async function submitConfirmationForm(form) {
  const formData = new FormData(form);
  const code = String(formData.get('code') || '').trim();
  if (!state.pendingConfirmationEmail || !code) {
    setNotice('Enter the verification code from your email.', 'error');
    return;
  }

  setLoading(true, 'Confirming account...');
  try {
    await api.confirmRegistration({
      email: state.pendingConfirmationEmail,
      code
    });
    state.pendingConfirmationCode = '';
    state.accountMode = 'login';
    setLoading(false);
    setNotice('Account confirmed. Sign in to continue.', 'success');
  } catch (error) {
    setLoading(false);
    setNotice(error.message, 'error');
  }
}

async function handleAction(event) {
  event.preventDefault();
  const action = event.currentTarget.dataset.action;

  if (!action) return;

  if (action.startsWith('view:')) {
    state.activeView = action.replace('view:', '');
    render();
    return;
  }

  if (action.startsWith('mode:')) {
    state.accountMode = action.replace('mode:', '');
    render();
    return;
  }

  if (action === 'dismiss-notice') {
    state.notice = { type: 'info', message: '' };
    render();
    return;
  }

  if (action === 'chat-input') {
    state.chatInput = event.currentTarget.value;
    render();
    return;
  }

  if (action === 'wardrobe-search') {
    state.wardrobeSearch = event.currentTarget.value;
    render();
    return;
  }

  if (action === 'occasion-input') {
    state.recommendationOccasion = event.currentTarget.value;
    render();
    return;
  }

  if (action === 'image-prompt') {
    state.imagePrompt = event.currentTarget.value;
    render();
    return;
  }

  if (action === 'analysis-file') {
    state.analysisFile = event.currentTarget.files?.[0] || null;
    state.analysisResult = null;
    state.analysisImageDataUrl = '';
    render();
    return;
  }

  if (action === 'tryon-garment') {
    state.tryOnGarmentFile = event.currentTarget.files?.[0] || null;
    render();
    return;
  }

  if (action === 'tryon-user-photo') {
    state.tryOnUserPhotoFile = event.currentTarget.files?.[0] || null;
    render();
    return;
  }

  if (action === 'profile-photo') {
    state.profilePhotoFile = event.currentTarget.files?.[0] || null;
    render();
    return;
  }

  if (action === 'account-submit') {
    await submitAccountForm(event.currentTarget);
    return;
  }

  if (action === 'confirm-submit') {
    await submitConfirmationForm(event.currentTarget);
    return;
  }

  if (action === 'logout') {
    api.setSession(null);
    state.auth.token = null;
    state.auth.profile = null;
    state.pendingConfirmationEmail = '';
    state.pendingConfirmationCode = '';
    state.recommendations = [];
    state.activeView = 'wardrobe';
    if (canUseWardrobe()) await refreshWardrobe();
    else state.wardrobe = [];
    setNotice(state.system.wardrobeMode === 'shared' ? 'Signed out. Shared wardrobe mode is still available.' : 'Signed out.', 'success');
    return;
  }

  if (action === 'analyze-image') {
    if (!state.analysisFile) return;
    setLoading(true, 'Analyzing clothing image...');
    try {
      const [analysisResult, imageDataUrl] = await Promise.all([
        api.analyzeImage(state.analysisFile),
        fileToDataUrl(state.analysisFile)
      ]);
      state.analysisResult = analysisResult;
      state.analysisImageDataUrl = imageDataUrl;
      setLoading(false);
      setNotice('Analysis complete. Save it to your wardrobe when you are ready.', 'success');
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
    return;
  }

  if (action === 'clear-analysis') {
    state.analysisFile = null;
    state.analysisResult = null;
    state.analysisImageDataUrl = '';
    render();
    return;
  }

  if (action === 'save-analysis') {
    if (!state.analysisResult || !state.analysisImageDataUrl) return;
    setLoading(true, 'Saving item to wardrobe...');
    try {
      const savedItem = await api.saveAnalyzedItem({
        analysis: state.analysisResult,
        imageDataUrl: state.analysisImageDataUrl
      });
      state.wardrobe.unshift(savedItem);
      state.activeView = 'wardrobe';
      setLoading(false);
      setNotice('Saved to wardrobe. You can generate recommendations from it now.', 'success');
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
    return;
  }

  if (action === 'jump-wardrobe') {
    state.activeView = 'wardrobe';
    render();
    return;
  }

  if (action === 'refresh-wardrobe') {
    setLoading(true, 'Refreshing wardrobe...');
    try {
      await refreshWardrobe(true);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
    return;
  }

  if (action === 'delete-item') {
    const itemId = event.currentTarget.dataset.id;
    if (!itemId || !window.confirm('Delete this wardrobe item?')) return;
    setLoading(true, 'Deleting wardrobe item...');
    try {
      await api.deleteWardrobeItem(itemId);
      state.wardrobe = state.wardrobe.filter((item) => (item.id || item.itemId || item._id) !== itemId);
      state.recommendations = [];
      setLoading(false);
      setNotice('Wardrobe item deleted.', 'success');
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
    return;
  }

  if (action === 'upload-profile-photo') {
    if (!state.profilePhotoFile) return;
    setLoading(true, 'Uploading profile photo...');
    try {
      const result = await api.updateProfilePhoto(state.profilePhotoFile);
      state.auth.profile = { ...state.auth.profile, profileImage: result.profileImage || null };
      state.profilePhotoFile = null;
      api.setSession({ ...api.getSession(), user: state.auth.profile });
      setLoading(false);
      setNotice('Profile photo updated.', 'success');
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
    return;
  }

  if (action === 'remove-profile-photo') {
    setLoading(true, 'Removing profile photo...');
    try {
      await api.removeProfilePhoto();
      state.auth.profile = { ...state.auth.profile, profileImage: null };
      api.setSession({ ...api.getSession(), user: state.auth.profile });
      setLoading(false);
      setNotice('Profile photo removed.', 'success');
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
    return;
  }

  if (action === 'recommend-outfits') {
    if (!state.recommendationOccasion.trim()) {
      setNotice('Add an occasion first.', 'error');
      return;
    }

    setLoading(true, 'Generating outfit recommendations...');
    try {
      state.recommendations = await api.recommendations({
        occasion: state.recommendationOccasion.trim(),
        useDatabase: true
      });
      setLoading(false);
      setNotice('Recommendations ready.', 'success');
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
    return;
  }

  if (action === 'send-chat') {
    const chatInput = root.querySelector('[data-action="chat-input"]');
    const message = String(chatInput?.value || '').trim();
    if (!message) return;

    state.chatMessages.push({ role: 'user', text: message });
    state.chatInput = '';
    setLoading(true, 'Getting stylist response...');

    try {
      const reply = await api.chat({
        message,
        conversationHistory: state.chatMessages.slice(0, -1).map((entry) => ({
          role: entry.role,
          content: entry.text
        }))
      });
      state.chatMessages.push({ role: 'assistant', text: reply });
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
    return;
  }

  if (action === 'generate-tryon') {
    if (!state.tryOnGarmentFile) {
      setNotice('Choose a garment image first.', 'error');
      return;
    }

    setLoading(true, 'Generating virtual try-on...');
    try {
      const result = await api.tryOn(state.tryOnGarmentFile, state.tryOnUserPhotoFile || null);
      state.previewImage = result.image;
      setLoading(false);
      setNotice(result.message || 'Try-on generated.', 'success');
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
  }

  if (action === 'generate-image') {
    if (!state.imagePrompt.trim()) {
      setNotice('Add a prompt first.', 'error');
      return;
    }

    setLoading(true, 'Generating fashion image...');
    try {
      const result = await api.generateImage(state.imagePrompt.trim());
      state.generatedImage = result.image;
      setLoading(false);
      setNotice('Image generated.', 'success');
    } catch (error) {
      setLoading(false);
      setNotice(error.message, 'error');
    }
  }
}

async function init() {
  setNotice('Checking backend...', 'info');

  try {
    const health = await api.health();
    state.system.backend = 'online';
    state.system.database = health.database || 'unknown';
    state.system.wardrobeMode = health.wardrobeMode || 'shared';
    state.system.capabilities = health.capabilities || {};

    if (state.auth.token) {
      try {
        await refreshSession();
      } catch (error) {
        api.setSession(null);
        state.auth.token = null;
        state.auth.profile = null;
        setNotice('Session expired. Shared wardrobe mode is still available.', 'warn');
      }
    }

    if (state.system.wardrobeMode === 'per-user' && !hasSession()) state.activeView = 'account';

    if (canUseWardrobe()) {
      try {
        await refreshWardrobe();
      } catch (error) {
        state.system.database = 'disconnected';
        setNotice('The backend is online, but the wardrobe database is unavailable.', 'warn');
      }
    }

    if (state.system.database !== 'disconnected') setNotice('', 'info');
  } catch (error) {
    state.system.backend = 'offline';
    state.system.database = 'unknown';
    setNotice('Backend offline. Start the server to use the app shell.', 'warn');
  }

  render();
}

init();
