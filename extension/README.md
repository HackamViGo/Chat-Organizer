# AI Chat Organizer - Chrome Extension

Chrome extension for saving and organizing AI chat conversations from ChatGPT, Claude, and Google Gemini.

## Features

- **One-Click Save**: Save entire chat conversations with a single click
- **Platform Detection**: Automatically detects ChatGPT, Claude, and Gemini
- **Context Menu**: Right-click to save selected text or insert prompts
- **Prompt Selector**: Quick access to your saved prompts
- **Folder Organization**: Save chats directly to folders
- **Offline Support**: Works seamlessly with the PWA

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The extension icon should appear in your toolbar

### Generate Icons

1. Open `extension/icon-generator.html` in your browser
2. Click "Generate Icons"
3. Download all 4 icon sizes (16x16, 32x32, 48x48, 128x128)
4. Save them to `extension/icons/` folder as:
   - `icon16.png`
   - `icon32.png`
   - `icon48.png`
   - `icon128.png`

## Configuration

### API Base URL

By default, the extension connects to `http://localhost:3000`. To change this:

1. Open `extension/background.js`
2. Update the `API_BASE_URL` constant:
   ```javascript
   const API_BASE_URL = 'https://your-production-url.com';
   ```
3. Open `extension/popup.js`
4. Update the `API_BASE_URL` constant there as well

## Usage

### Saving a Chat

**Method 1: Save Button**
1. Navigate to ChatGPT, Claude, or Gemini
2. Wait for the chat to load
3. Click the "Save to Organizer" button in the top navigation
4. Confirm the save in the popup

**Method 2: Context Menu**
1. Select text in a chat conversation
2. Right-click and select "Save to AI Chat Organizer"
3. Fill in the title and select a folder
4. Click "Save Chat"

**Method 3: Extension Icon**
1. Click the extension icon in your toolbar
2. Fill in the chat details manually
3. Click "Save Chat"

### Inserting Prompts

1. Click in any text input or contentEditable field
2. Right-click and select "Insert Prompt"
3. Choose a prompt from the list
4. The prompt content will be inserted at the cursor

## Supported Platforms

- **ChatGPT**: chatgpt.com, chat.openai.com
- **Claude**: claude.ai
- **Google Gemini**: gemini.google.com

## Files Structure

```
extension/
├── manifest.json           # Extension configuration
├── background.js          # Service worker (background logic)
├── content-script.js      # Page interaction logic
├── content-styles.css     # Injected styles
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── icon-generator.html   # Tool to generate icons
├── README.md             # This file
└── icons/                # Extension icons (generate these)
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

- `activeTab`: Access the current tab to extract chat content
- `storage`: Store pending chats and settings
- `contextMenus`: Add right-click menu options
- `scripting`: Inject content scripts dynamically

## Troubleshooting

### Save button doesn't appear
- Make sure you're on a supported platform
- Refresh the page after installing the extension
- Check the browser console for errors

### API requests fail
- Verify the `API_BASE_URL` is correct
- Make sure you're logged in to the web app
- Check that the server is running

### Extension doesn't load
- Ensure all required files are present
- Generate the icon files using `icon-generator.html`
- Check for errors in `chrome://extensions/`

## Development

### Testing

1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the reload icon on the extension card
4. Test on a supported platform

### Debugging

- **Background Script**: Right-click extension icon → "Inspect service worker"
- **Content Script**: Open DevTools on the page → Console tab
- **Popup**: Right-click extension icon → "Inspect popup"

## Security

- All API requests include credentials for authentication
- Content scripts are isolated from page scripts
- No user data is stored in the extension (except pending saves)

## Future Enhancements

- [ ] Support for more AI platforms
- [ ] Automatic chat syncing
- [ ] Advanced filtering and search
- [ ] Keyboard shortcuts
- [ ] Custom platform configurations

## License

Part of the AI Chat Organizer project.
