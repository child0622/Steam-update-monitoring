
async function testAllOrigins(appId) {
    const newsUrl = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=1`;
    const targetUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(newsUrl)}`;
    
    console.log(`Testing AllOrigins for AppID: ${appId}`);
    console.log(`URL: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, { timeout: 5000 });
        console.log(`Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`Contents type: ${typeof data.contents}`);
            // contents is stringified JSON
            try {
                const innerData = JSON.parse(data.contents);
                 if (innerData.appnews && innerData.appnews.newsitems) {
                     console.log(`Success! Date: ${innerData.appnews.newsitems[0]?.date}`);
                 } else {
                     console.log("Structure missing");
                 }
            } catch (e) {
                console.log("Failed to parse inner JSON");
            }
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

testAllOrigins('1142710');
