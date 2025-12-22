// Content script for BrainBox extension auth page
// This runs on brainbox-alpha.vercel.app/extension-auth or localhost:3000/extension-auth

// Listen for auth token from page
window.addEventListener('brainbox-auth-ready', async (event) => {
  const { accessToken, refreshToken, expiresAt } = event.detail;
  
  if (accessToken) {
    // Store tokens in extension storage via background script
    chrome.runtime.sendMessage({
      action: 'storeAuthToken',
      data: {
        accessToken,
        refreshToken,
        expiresAt
      }
    }, (response) => {
      if (response && response.success) {
        console.log('BrainBox extension authenticated successfully!');
        
        // Show success message
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 600;
          animation: slideIn 0.3s ease;
        `;
        notification.textContent = '✓ Extension connected successfully!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.style.animation = 'slideOut 0.3s ease';
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }
    });
  }
});

// Also check localStorage on load (fallback)
setTimeout(async () => {
  const storedToken = window.localStorage.getItem('brainbox_extension_token');
  if (storedToken) {
    try {
      const { accessToken, refreshToken, expiresAt } = JSON.parse(storedToken);
      
      // Send to background script
      chrome.runtime.sendMessage({
        action: 'storeAuthToken',
        data: {
          accessToken,
          refreshToken,
          expiresAt
        }
      }, (response) => {
        if (response && response.success) {
          console.log('Token stored from localStorage');
          // Clear from localStorage
          window.localStorage.removeItem('brainbox_extension_token');
        }
      });
    } catch (error) {
      console.error('Error parsing stored token:', error);
    }
  }
}, 1000);

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);
