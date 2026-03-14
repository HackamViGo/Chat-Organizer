

async function run() {
  try {
    const res = await fetch('http://localhost:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.url.includes('gemini.google.com') && p.type === 'page');
    if (!page) return console.error('Gemini page not found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (() => {
              const u = document.querySelectorAll('.user-query-container, [data-turn-role="user"]');
              const m = document.querySelectorAll('.model-response-text, [data-turn-role="model"]');
              return 'Found: ' + u.length + ' users, ' + m.length + ' models. HTML preview: ' + document.body.innerHTML.substring(0, 100);
            })()
          `,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 1) {
        console.log('DOM Check:', msg.result.result.value);
        setTimeout(() => ws.close(), 1000);
      }
    };
    ws.onclose = () => process.exit(0);
  } catch(e) {
    console.error(e); process.exit(1);
  }
}
run();
