// BrainBox - Auth Manager
// Handles authentication state and login flow

const DASHBOARD_URL = 'https://brainbox-alpha.vercel.app';

export class AuthManager {
  static async checkAuth() {
    const auth = await chrome.storage.sync.get(['isLoggedIn']);
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    
    // Check both sync storage (for mock auth) and local storage (for real auth)
    return auth.isLoggedIn || !!accessToken;
  }

  static async login() {
    console.log('[AuthManager] 🔐 Opening login page...');
    
    // Open the dashboard auth page
    chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
    
    // Note: Actual authentication happens via the dashboard auth page
    // which will call setAuthToken via message passing
  }

  static async logout() {
    console.log('[AuthManager] 🚪 Logging out...');
    
    // Clear all auth data
    await chrome.storage.sync.remove(['isLoggedIn', 'user']);
    await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt']);
    
    return { success: true };
  }

  static async getUserInfo() {
    const auth = await chrome.storage.sync.get(['user', 'isLoggedIn']);
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    
    if (auth.isLoggedIn && auth.user) {
      return auth.user;
    }
    
    if (accessToken) {
      // Could fetch user info from API here if needed
      return { name: 'User', email: 'user@example.com' };
    }
    
    return null;
  }
}
