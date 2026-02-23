
async function testCorsProxy(appId) {
    const newsUrl = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=1`;
    // Try unencoded
    const targetUrl = `https://corsproxy.io/?${newsUrl}`;
    
    console.log(`Testing CorsProxy Unencoded for AppID: ${appId}`);
    console.log(`URL: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, { timeout: 5000 });
        console.log(`Status: ${response.status}`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

testCorsProxy('1142710');
