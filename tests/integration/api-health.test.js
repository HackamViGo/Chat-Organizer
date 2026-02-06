/**
 * Integration Test for API Endpoints
 * Verifies that the local server is running and responding to requests
 */

const http = require('http');

async function checkApiHealth(retries = 3, delay = 2000) {
    console.log(`🧪 Running Integration Test: API Health Check (Attempts remaining: ${retries})`);
    
    for (let i = 0; i < retries; i++) {
        try {
            const success = await new Promise((resolve, reject) => {
                const options = {
                    hostname: 'localhost',
                    port: 3000,
                    path: '/api/prompts',
                    method: 'GET',
                    timeout: 5000
                };

                const req = http.request(options, (res) => {
                    if (res.statusCode === 200 || res.statusCode === 401) { 
                        console.log('✅ API is up and responding.');
                        resolve(true);
                    } else {
                        console.warn(`⚠️ Unexpected status: ${res.statusCode}`);
                        resolve(false);
                    }
                });

                req.on('error', (e) => {
                    console.warn(`⚠️ Failed to connect (Attempt ${i + 1}/${retries}): ${e.message}`);
                    resolve(false);
                });

                req.on('timeout', () => {
                    req.destroy();
                    console.warn(`⚠️ Request timed out (Attempt ${i + 1}/${retries})`);
                    resolve(false);
                });

                req.end();
            });

            if (success) return true;
        } catch (err) {
            console.error('❌ Unexpected error during health check:', err);
        }

        if (i < retries - 1) {
            console.log(`⏳ Waiting ${delay}ms before next attempt...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    console.error('❌ All health check attempts failed.');
    console.log('💡 Ensure that "npm run dev" is running in a separate terminal.');
    return false;
}

async function run() {
    const success = await checkApiHealth();
    process.exit(success ? 0 : 1);
}

run();
