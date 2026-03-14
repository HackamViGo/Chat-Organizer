// This script is injected into the MAIN world to extract tokens
// It runs outside the module system as an IIFE

(function extractGeminiToken() {
  const MAX_ATTEMPTS = 20;
  const INTERVAL_MS = 500;
  let attempts = 0;

  function tryExtract() {
    attempts++;

    try {
      // Primary: WIZ_global_data (SN1M0e token)
      const wiz = window.WIZ_global_data;
      const token = wiz?.['SNlM0e'] || wiz?.['cfb2h'];

      if (token) {
        window.postMessage({ type: 'BRAINBOX_GEMINI_TOKEN', token }, '*');
        clearInterval(intervalId);
        return;
      }
    } catch (e) {
      // Context not ready
    }

    if (attempts >= MAX_ATTEMPTS) {
      clearInterval(intervalId);
    }
  }

  const intervalId = setInterval(tryExtract, INTERVAL_MS);
  tryExtract(); // execute immediately upon injection
})();
