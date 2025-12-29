# Chrome Extension Testing

## Quick Start
```bash
npm run test:chrome
# OR
bash dev/test-chrome.sh
```

## What It Does
1. Copies your Chrome profile (with Google login & cookies)
2. Cleans storage databases (IndexedDB, localStorage, etc.)
3. **Preserves cookies** for authentication (Supabase/Vercel)
4. Launches isolated Chrome instance
5. Auto-deletes everything when you close Chrome

## Safety
- ✅ Original profile NEVER modified
- ✅ All tests in `/tmp` (auto-cleaned on reboot)
- ✅ Google account works (for dashboard sync)
- ✅ IndexedDB writes isolated

## Workflow
```
Extension idea
    ↓
Test in isolated Chrome (this script)
    ↓
Verify dashboard sync works
    ↓
If safe → Install in production
```

## Troubleshooting

**Can't login to Vercel/Supabase:**
1. **Close Chrome completely** before running script (Cookies file may be locked)
2. If still can't login:
   - Go to `https://brainbox-alpha.vercel.app/auth/signin`
   - Login manually (cookies will be saved)
   - Next time cookies will be copied

**Chrome won't start:**
```bash
rm -rf /tmp/chrome-extension-test-*
```

**Cookies not copying:**
- Close Chrome completely before running script
- Cookies file is locked when Chrome is running
- Script will warn you if Chrome is detected

**Need to test again:**
Just run the script again - creates fresh environment each time.

**Profile not found:**
The script will try common locations:
- `~/.config/google-chrome/Default`
- `~/.config/chromium/Default`
- `~/snap/chromium/common/chromium/Default`

**Extension not loading:**
1. Make sure extension is built/ready
2. In test Chrome: `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `extension/` directory

## Testing Checklist
- [ ] Extension loads without errors
- [ ] IndexedDB writes work
- [ ] Dashboard sync works (Vercel)
- [ ] No localStorage SecurityErrors (or they're expected)
- [ ] All features work as expected

