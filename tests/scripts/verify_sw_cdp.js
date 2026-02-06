import { WebSocket } from 'ws';

async function verify() {
  const wsUrl = 'ws://127.0.0.1:9222/devtools/page/1055429D50192F617F294CB48D8D9EEC';
  const ws = new WebSocket(wsUrl);

  const send = (id, method, params = {}) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      const callback = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          clearTimeout(timeout);
          ws.removeListener('message', callback);
          resolve(msg);
        }
      };
      ws.on('message', callback);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  ws.on('open', async () => {
    try {
      console.log('--- CONNECTED TO SW ---');
      await send(1, 'Runtime.enable');
      
      const resB = await send(2, 'Runtime.evaluate', { 
        expression: 'self.BRAINBOX_DEBUG_MODE = true; console.log("MCP Verification Probe");' 
      });
      console.log('RESULT_B:', JSON.stringify(resB, null, 2));

      const resC = await send(3, 'Runtime.evaluate', { 
        expression: 'typeof window' 
      });
      console.log('RESULT_C:', JSON.stringify(resC, null, 2));

      ws.close();
      process.exit(0);
    } catch (err) {
      console.error('VERIFY ERROR:', err);
      process.exit(1);
    }
  });

  ws.on('error', (err) => {
    console.error('WS ERROR:', err);
    process.exit(1);
  });
}

verify();
