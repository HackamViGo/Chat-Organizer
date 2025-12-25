// BrainBox Extension Popup Logic
const API_BASE_URL = 'https://brainbox-alpha.vercel.app';

// DOM Elements
const views = {
  loading: document.getElementById('view-loading'),
  login: document.getElementById('view-login'),
  dashboard: document.getElementById('view-dashboard')
};

const userElements = {
  name: document.getElementById('user-name'),
  email: document.getElementById('user-email'),
  avatar: document.getElementById('user-avatar'),
  badge: document.getElementById('connection-badge')
};

const statElements = {
  chats: document.getElementById('stat-chats'),
  folders: document.getElementById('stat-folders'),
  prompts: document.getElementById('stat-prompts'),
  images: document.getElementById('stat-images')
};

// Initialize
async function init() {
  try {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);

    if (!accessToken) {
      // User requested: "ако пробваш да позваш extansiona а не си логнат да те праща директно в лог ин"
      chrome.tabs.create({ url: `${API_BASE_URL}/extension-auth` });
      window.close();
      return;
    }

    // Attempt to fetch stats
    await loadDashboard(accessToken);

    // Check if we are on a supported AI platform
    await checkPlatformStatus();

  } catch (error) {
    console.error('Init error:', error);
    chrome.tabs.create({ url: `${API_BASE_URL}/extension-auth` });
    window.close();
  }
}

function showView(viewName) {
  Object.keys(views).forEach(key => {
    views[key].classList.toggle('active', key === viewName);
  });
}

async function loadDashboard(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired
        await handleLogout();
        return;
      }
      throw new Error('Stats fetch failed');
    }

    const data = await response.json();

    // Update UI
    userElements.name.textContent = data.user.full_name;
    userElements.email.textContent = data.user.email;
    userElements.badge.style.display = 'flex';

    if (data.user.avatar_url) {
      userElements.avatar.innerHTML = `<img src="${data.user.avatar_url}" alt="Avatar">`;
    } else {
      userElements.avatar.textContent = data.user.full_name.charAt(0).toUpperCase();
    }

    statElements.chats.textContent = data.stats.chats;
    statElements.folders.textContent = data.stats.folders;
    statElements.prompts.textContent = data.stats.prompts;
    statElements.images.textContent = data.stats.images;

    showView('dashboard');
  } catch (err) {
    console.error('Dashboard load error:', err);
    showView('login');
  }
}

async function checkPlatformStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  const url = tab.url;
  const isAIPlatform = url.includes('chatgpt.com') ||
    url.includes('chat.openai.com') ||
    url.includes('claude.ai') ||
    url.includes('gemini.google.com') ||
    url.includes('lmarena.ai') ||
    url.includes('lmsys.org');

  if (isAIPlatform) {
    document.getElementById('save-current-section').style.display = 'block';
  }
}

// Event Listeners
document.getElementById('btn-login').addEventListener('click', () => {
  chrome.tabs.create({ url: `${API_BASE_URL}/extension-auth` });
  window.close();
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await handleLogout();
});

document.getElementById('btn-open-app').addEventListener('click', () => {
  chrome.tabs.create({ url: API_BASE_URL });
  window.close();
});

document.getElementById('btn-settings').addEventListener('click', () => {
  chrome.tabs.create({ url: `${API_BASE_URL}/settings` });
  window.close();
});

document.getElementById('btn-save-current').addEventListener('click', async () => {
  // Trigger save in content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: 'triggerSaveContent' });
    window.close();
  }
});

async function handleLogout() {
  await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt']);
  showView('login');
  userElements.badge.style.display = 'none';
}

// Start
init();
