# BrainBox Extension - Development Guide

## Environment Configuration

The extension can work with both **production** (Vercel) and **local development** (localhost).

### Current Configuration

**Default:** Production (Vercel)
```javascript
const ENVIRONMENT = 'production'; // Points to https://brainbox-alpha.vercel.app
```

---

## Switching Between Environments

### For Production (Default)

**File:** `extension/background/service-worker.js`

```javascript
const ENVIRONMENT = 'production'; // 'development' or 'production'
```

**Dashboard URL:** `https://brainbox-alpha.vercel.app`

**Use when:**
- Testing with real users
- Deploying to Chrome Web Store
- Working with production data

---

### For Local Development

**File:** `extension/background/service-worker.js`

```javascript
const ENVIRONMENT = 'development'; // 'development' or 'production'
```

**Dashboard URL:** `http://localhost:3000`

**Use when:**
- Developing new features
- Testing locally
- Debugging issues

**Prerequisites:**
1. Start local Next.js server: `npm run dev`
2. Make sure it's running on `http://localhost:3000`
3. Change `ENVIRONMENT` to `'development'`
4. Reload extension in Chrome

---

## Manifest Configuration

The `manifest.json` already includes permissions for both environments:

```json
{
  "host_permissions": [
    "https://brainbox-alpha.vercel.app/*",  // Production
    "http://localhost:3000/*"                // Development
  ],
  "content_scripts": [
    {
      "matches": [
        "https://brainbox-alpha.vercel.app/extension-auth",
        "http://localhost:3000/extension-auth"
      ]
    }
  ]
}
```

**No need to change manifest.json** - it supports both!

---

## Quick Switch Guide

### Switch to Development
1. Open `extension/background/service-worker.js`
2. Change line 7: `const ENVIRONMENT = 'development';`
3. Save file
4. Go to `chrome://extensions/`
5. Click "Reload" button on BrainBox extension
6. Check console: Should see "Dashboard URL: http://localhost:3000"

### Switch to Production
1. Open `extension/background/service-worker.js`
2. Change line 7: `const ENVIRONMENT = 'production';`
3. Save file
4. Go to `chrome://extensions/`
5. Click "Reload" button on BrainBox extension
6. Check console: Should see "Dashboard URL: https://brainbox-alpha.vercel.app"

---

## Verification

After switching, check the service worker console:

```javascript
// You should see:
[BrainBox] Environment: production  // or 'development'
[BrainBox] Dashboard URL: https://brainbox-alpha.vercel.app  // or 'http://localhost:3000'
```

**How to check:**
1. Go to `chrome://extensions/`
2. Find BrainBox extension
3. Click "service worker" link
4. Check console output

---

## Common Issues

### Issue: "Failed to fetch" errors
**Solution:** 
- Make sure local server is running (`npm run dev`)
- Check that ENVIRONMENT matches your setup
- Verify CORS settings in Next.js

### Issue: Extension doesn't connect to localhost
**Solution:**
1. Check ENVIRONMENT is set to 'development'
2. Reload extension
3. Check service worker console for correct URL
4. Make sure localhost:3000 is accessible

### Issue: Auth doesn't work on localhost
**Solution:**
- Make sure Supabase is configured for localhost
- Check `.env.local` has correct Supabase keys
- Verify redirect URLs in Supabase dashboard

---

## Before Deploying to Chrome Web Store

**CRITICAL:** Always set to production before publishing!

```javascript
const ENVIRONMENT = 'production'; // MUST be 'production' for store
```

**Checklist:**
- [ ] ENVIRONMENT = 'production'
- [ ] Test on production Vercel URL
- [ ] Verify all features work
- [ ] Check service worker console shows correct URL
- [ ] Test auth flow
- [ ] Test save functionality

---

## Development Workflow

### Recommended Setup

1. **Keep extension in production mode** by default
2. **Only switch to development** when actively developing
3. **Always switch back to production** before committing

### Why?
- Prevents accidentally deploying development version
- Ensures you're testing against real production environment
- Reduces configuration mistakes

---

## Environment Variables (Future Enhancement)

Currently using hardcoded constants. Future improvement could use:

```javascript
// Future: Read from config file or build-time variable
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://brainbox-alpha.vercel.app';
```

This would require a build step (webpack/vite) but would be more flexible.

---

**Current Status:** ✅ Configured for Production (Vercel)  
**Last Updated:** 2025-12-27

