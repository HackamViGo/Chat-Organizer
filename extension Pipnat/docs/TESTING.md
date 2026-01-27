# BrainBox Extension - Testing Guide

## Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `/extension` directory

## Testing ChatGPT

1. Go to https://chatgpt.com
2. Wait 5 seconds for extension to initialize
3. Check popup - ChatGPT status should be 🟢
4. Hover over any conversation in sidebar
5. Click the 💾 button
6. Verify toast notification shows success

## Testing Gemini

1. Go to https://gemini.google.com
2. Open any existing conversation (required for key discovery)
3. Wait 3 seconds
4. Check popup - Gemini status should be 🟢
5. Navigate back to conversation list
6. Hover over conversation
7. Click save button

## Testing Claude

1. Go to https://claude.ai
2. Hover over conversation
3. Click save button

## Debugging

### View Console Logs
- Right-click extension icon → Inspect popup
- Or open DevTools on any AI platform page

### Check Storage
```javascript
chrome.storage.local.get(null, (data) => console.log(data));
```

### Common Issues

**ChatGPT token not captured:**
- Refresh the page
- Make sure you're logged in
- Check console for errors

**Gemini key not discovered:**
- Open any conversation first
- Check console for "key discovered" message
- Refresh if needed

**Save fails:**
- Check if logged into dashboard
- Verify network tab for API errors
- Check background service worker console

## Performance Checks

- Extension load time: < 1s
- Hover button injection: < 200ms
- API request: < 500ms (ChatGPT), < 1s (Gemini)
- Memory usage: < 50MB

## Next Steps

After basic testing works:
1. Implement folder selection UI
2. Add batch save functionality
3. Implement auto-categorization
4. Add error recovery mechanisms
5. Performance optimization
