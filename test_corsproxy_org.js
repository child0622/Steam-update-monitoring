
async function testCorsProxyOrg(appId) {
    const newsUrl = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=1`;
    const targetUrl = `https://corsproxy.org/?${encodeURIComponent(newsUrl)}`;
    
    console.log(`Testing CorsProxy.org for AppID: ${appId}`);
    console.log(`URL: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, { timeout: 5000 });
        console.log(`Status: ${response.status}`);
        if (response.ok) {
            const text = await response.text();
             console.log(`Body: ${text.substring(0, 100)}`);
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

testCorsProxyOrg('1142710');
