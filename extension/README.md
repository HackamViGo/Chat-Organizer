# BrainBox - AI Chat Organizer

**BrainBox** is a powerful browser extension that helps you organize, save, and manage your AI conversations from ChatGPT, Claude, and Gemini into a single, unified dashboard.

## 🚀 Features

*   **Multi-Platform Support**: Works seamlessly with ChatGPT, Claude.ai, and Google Gemini.
*   **Context Menu Save**: Right-click anywhere in a conversation to reveal the "Save to BrainBox" option.
*   **Smart Organization**: Organize chats into folders directly during the save process.
*   **Privacy First**: Your data is stored securely on your own BrainBox Dashboard.
*   **Safe Integration**: Uses non-intrusive Context Menu registration and official APIs where possible. No DOM injection that can break platform UIs.

## 📦 Installation

Since this extension is in **Developer Preview**, you need to install it manually:

1.  **Download/Clone** this repository to your computer.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle switch in the top right corner).
4.  Click **Load unpacked**.
5.  Select the `extension` folder inside the project directory.
6.  The **BrainBox** icon should appear in your toolbar.

## 🛠️ Usage

1.  **Login**: Ensure you are logged into your [BrainBox Dashboard](https://brainbox-alpha.vercel.app).
2.  **Navigate**: Go to your favorite AI chat platform (e.g., [chatgpt.com](https://chatgpt.com)).
3.  **Right-Click**: Right-click anywhere on the page or on a specific conversation link.
4.  **Save**: Select **"Save to BrainBox"** from the context menu.
5.  **Verify**: A toast notification will confirm if the chat was saved or updated.

## 🔒 Permissions & Privacy

We take your privacy seriously. This extension requires the following permissions:

*   `storage`: To securely store your authentication tokens locally.
*   `webRequest`: To intercept authentication tokens for API access (never logs passwords).
*   `host_permissions`: To interact with ChatGPT, Claude, Gemini, and your Dashboard.

**Note**: No data is sent to third-party servers. All conversation data is transmitted directly from your browser to your BrainBox Dashboard instance.

## Configuration

To switch between production and development environments, edit `extension/lib/config.js` and `extension/lib/config-global.js`.
- For production: `https://brainbox-alpha.vercel.app`
- For development: `http://localhost:3000`

> Note: If you change the URL, you must also update the `host_permissions` in `manifest.json`.
