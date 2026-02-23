
// import fetch from 'node-fetch'; // Built-in in Node 18+

const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url) => `https://cors-anywhere.herokuapp.com/${url}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function testNews(appId) {
    const newsUrl = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=1`;
    const playersUrl = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`;
    
    console.log(`Testing for AppID: ${appId}`);

    for (const [index, proxyFn] of PROXIES.entries()) {
        console.log(`\n--- Proxy ${index + 1} ---`);
        
        // Test News
        const proxiedNewsUrl = proxyFn(newsUrl);
        console.log(`News URL: ${proxiedNewsUrl}`);
        try {
            const response = await fetch(proxiedNewsUrl, { timeout: 5000 });
            console.log(`News Status: ${response.status}`);
            if (response.ok) {
                const text = await response.text();
                console.log(`News Body: ${text.substring(0, 200)}`);
            }
        } catch (e) {
            console.log(`News Error: ${e.message}`);
        }

        // Test Players
        const proxiedPlayersUrl = proxyFn(playersUrl);
        console.log(`Players URL: ${proxiedPlayersUrl}`);
        try {
            const response = await fetch(proxiedPlayersUrl, { timeout: 5000 });
            console.log(`Players Status: ${response.status}`);
            if (response.ok) {
                const text = await response.text();
                console.log(`Players Body: ${text.substring(0, 100)}`);
            }
        } catch (e) {
            console.log(`Players Error: ${e.message}`);
        }
    }
}

testNews('1142710');
