
// const fetch = require('node-fetch'); // Ensure node-fetch is available or use built-in fetch if Node 18+

const appId = '1142710'; // Total War: WARHAMMER III
const targetUrl = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=1`;

const proxies = [
    {
        name: 'CodeTabs',
        fn: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    },
    {
        name: 'CORS Anywhere',
        fn: (url) => `https://cors-anywhere.herokuapp.com/${url}`
    },
    {
        name: 'AllOrigins',
        fn: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    }
];

async function benchmark() {
    console.log('Starting benchmark...\n');
    
    for (const proxy of proxies) {
        const url = proxy.fn(targetUrl);
        const start = performance.now();
        
        try {
            const response = await fetch(url, { timeout: 8000 });
            const end = performance.now();
            const duration = (end - start).toFixed(2);
            
            console.log(`[${proxy.name}]`);
            console.log(`Status: ${response.status}`);
            console.log(`Time: ${duration}ms`);
            
            if (response.ok) {
                const text = await response.text();
                // Simple validation
                if (text.includes('appnews')) {
                     console.log('Result: Valid JSON');
                } else {
                     console.log('Result: Invalid content');
                }
            } else {
                console.log(`Result: Failed (${response.statusText})`);
                if (response.status === 403 && proxy.name === 'CORS Anywhere') {
                    console.log('NOTE: CORS Anywhere requires temporary demo access activation.');
                }
            }
        } catch (e) {
            const end = performance.now();
            console.log(`[${proxy.name}] Failed: ${e.message} (${(end - start).toFixed(2)}ms)`);
        }
        console.log('-'.repeat(20));
    }
}

benchmark();
