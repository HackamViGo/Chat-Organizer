
import { chromium } from 'playwright';

async function debugLMSYS(page) {
    console.log('  Testing LMSYS State & Extraction...');
    const result = await page.evaluate(() => {
        const url = window.location.href;
        
        const gradioContainer = document.querySelector('gradio-app');
        let chatbot = document.querySelector('.chatbot');
        if (!chatbot && gradioContainer && gradioContainer.shadowRoot) {
            chatbot = gradioContainer.shadowRoot.querySelector('.chatbot');
        }
        if (!chatbot) {
            chatbot = document.querySelector('#chatbot');
        }

        let textPreview = 'N/A';
        if (chatbot) {
            textPreview = chatbot.innerText.slice(0, 200);
        } else {
            const prose = document.querySelectorAll('.prose');
            if (prose.length > 0) {
                textPreview = `Found ${prose.length} prose elements. First: ${prose[0].innerText.slice(0, 50)}`;
            }
        }

        return {
            url,
            hasGradioApp: !!gradioContainer,
            hasChatbotClass: !!chatbot,
            textPreview
        };
    });
    console.log('  LMSYS Analysis:', JSON.stringify(result, null, 2));
}

async function debugQwen(page) {
    console.log('  Testing Qwen State & Extraction...');
    const result = await page.evaluate(() => {
        const url = window.location.href;
        const match = url.match(/\/chat\/([a-zA-Z0-9_-]+)/) || url.match(/\/c\/([a-zA-Z0-9_-]+)/);
        const sessionId = match ? match[1] : null;
        
        const main = document.querySelector('main');
        let textPreview = 'N/A';
        if (main) textPreview = main.innerText.slice(0, 200);

        return {
            url,
            sessionId,
            hasMain: !!main,
            textPreview
        };
    });
    console.log('  Qwen Analysis:', JSON.stringify(result, null, 2));
}

async function debugDeepSeek(page) {
    console.log('  Testing DeepSeek State & Extraction...');
    const result = await page.evaluate(() => {
        const url = window.location.href;
        const match = url.match(/\/chat\/([a-zA-Z0-9_-]+)/);
        const sessionId = match ? match[1] : null;

        const main = document.querySelector('#root'); // React root usually
        // Deepseek usually puts messages in some nice div structure
        // Look for .ds-message or similar
        
        let textPreview = 'N/A';
        if (document.body) textPreview = document.body.innerText.slice(0, 200);

        return {
            url,
            sessionId,
            textPreview,
            cookies: document.cookie // Check if we can see any auth cookies
        };
    });
    console.log('  DeepSeek Analysis:', JSON.stringify(result, null, 2));
}

async function debugLive() {
    console.log('🔌 Connecting to Chrome...');
    let browser;
    try {
        browser = await chromium.connectOverCDP('http://localhost:9222');
    } catch (e) {
        console.error('❌ Could not connect to Chrome. Is it running with --remote-debugging-port=9222?');
        console.error(e);
        process.exit(1);
    }

    const context = browser.contexts()[0];
    const pages = context.pages();
    console.log(`📄 Found ${pages.length} pages.`);

    let validPageFound = false;

    for (const page of pages) {
        const url = page.url();
        console.log(`Checking page: ${url}`);

        if (url.includes('chat.lmsys.org') || url.includes('lmarena.ai') || url.includes('arena.ai')) {
            validPageFound = true;
            console.log('\n--- 🔍 Debugging LMSYS/Arena ---');
            await debugLMSYS(page);
        } else if (url.includes('chat.qwen.ai') || url.includes('qwenlm.ai')) {
            validPageFound = true;
            console.log('\n--- 🔍 Debugging Qwen ---');
            await debugQwen(page);
        } else if (url.includes('chat.deepseek.com')) {
            validPageFound = true;
            console.log('\n--- 🔍 Debugging DeepSeek ---');
            await debugDeepSeek(page);
        }
    }

    if (!validPageFound) console.warn('⚠️ No supported AI tab found.');

    await browser.close();
}

debugLive();
