/**
 * Integration Test for API Endpoints
 * Verifies that the local server is running and responding to requests
 */

const http = require('http');

async function checkApiHealth() {
    console.log('🧪 Running Integration Test: API Health Check');
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/prompts',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            console.log(`📡 Status: ${res.statusCode}`);
            
            if (res.statusCode === 200 || res.statusCode === 401) { 
                // 401 is also "alive" but unauthorized, which is fine for health check
                console.log('✅ API is up and responding.');
                resolve(true);
            } else {
                console.error(`❌ Unexpected status: ${res.statusCode}`);
                resolve(false);
            }
        });

        req.on('error', (e) => {
            console.error(`❌ Failed to connect to server: ${e.message}`);
            console.log('💡 Ensure that "npm run dev" is running in a separate terminal.');
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('❌ Request timed out');
            resolve(false);
        });

        req.end();
    });
}

async function run() {
    const success = await checkApiHealth();
    process.exit(success ? 0 : 1);
}

run();
