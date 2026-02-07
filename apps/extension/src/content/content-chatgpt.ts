// BrainBox - ChatGPT Content Script
import { logger } from '../lib/logger';
import { BrainBoxUI } from '../lib/ui';

let ui: BrainBoxUI | null = null;
let hoverButtons = new WeakMap<Element, boolean>();
let observer: MutationObserver | null = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    logger.info('ChatGPT', '🚀 Initializing...');
    
    // Retry logic for UI Library
    let attempts = 0;
    const checkUI = () => {
        if ((window as any).BrainBoxUI) {
            ui = new (window as any).BrainBoxUI();
            logger.info('ChatGPT', '✅ UI Library found');
            start();
        } else if (attempts < 10) {
            attempts++;
            setTimeout(checkUI, 100);
        } else {
            logger.error('ChatGPT', '⚠️ UI Library NOT found after retries');
            start();
        }
    };
    
    checkUI();
}

function start() {
    clearCache();
}

// ============================================================================
// STYLES
// ============================================================================

function injectStyles() {
    if (document.getElementById('brainbox-chatgpt-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'brainbox-chatgpt-styles';
    style.textContent = `
        .brainbox-capture-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #4f46e5;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            z-index: 1000;
        }
    `;
    document.head.appendChild(style);
}

function clearCache() {
    hoverButtons = new WeakMap();
}

// Run init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
