
// 代理配置：优先使用用户反馈速度较快的 cors-anywhere，并添加超时控制
const PROXIES = [
  // 优先级1：CORS Anywhere (用户反馈样本中速度较快，需配合 demo 页面授权)
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
  // 优先级2：CORS Proxy.io (备用，通常稳定)
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  // 优先级3：AllOrigins (最后手段，有时不稳定)
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export interface GameDetails {
  name: string;
  header_image: string;
}

// 带超时的 Fetch 封装
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function fetchWithProxy(targetUrl: string, retries = 2): Promise<any> {
  let lastError: any;

  // 尝试所有代理
  for (const proxyFn of PROXIES) {
    const proxiedUrl = proxyFn(targetUrl);
    
    // 每个代理内部重试
    for (let i = 0; i < retries; i++) {
      try {
        // 适当延长超时时间至 10 秒
        const response = await fetchWithTimeout(proxiedUrl, {}, 10000);
        
        if (!response.ok) {
           // 如果是 403/429，可能是代理被限制，尝试下一个代理
           if (response.status === 403 || response.status === 429) {
             throw new Error(`PROXY_LIMIT_${response.status}`);
           }
           throw new Error(`HTTP ${response.status}`);
        }

        // 尝试解析 JSON
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            throw new Error("INVALID_JSON_RESPONSE");
        }

        // 验证数据格式
        if (typeof data !== 'object' || data === null) {
             throw new Error("INVALID_DATA_FORMAT");
        }
        
        return data; // 成功
      } catch (error: any) {
        lastError = error;
        // 如果是代理限制或格式错误，直接切换下一个代理，不重试
        if (error.message.startsWith("PROXY_LIMIT") || error.message === "INVALID_JSON_RESPONSE") {
            break; 
        }
        // 如果是 AbortError (超时)，也直接重试或切代理
        
        // 简短等待后重试
        if (i < retries - 1) {
            await new Promise(r => setTimeout(r, 800));
        }
      }
    }
  }
  
  throw lastError || new Error("所有代理连接均失败，请检查网络");
}

export const steamApi = {
  async getGameDetails(appId: string): Promise<GameDetails> {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    try {
        const data = await fetchWithProxy(url);
        
        // 明确检查 Steam API 返回的 success 字段
        // Steam API 即使在 AppID 无效时也可能返回 200 OK，但 success 为 false
        if (!data || !data[appId]) {
             throw new Error("INVALID_RESPONSE_STRUCTURE");
        }
        
        if (data[appId].success === false) {
             // 这是一个明确的“无效 ID”信号，不应重试
             const error = new Error("INVALID_APP_ID");
             (error as any).isInvalidId = true;
             throw error;
        }
        
        const details = data[appId].data;
        return {
          name: details.name,
          header_image: details.header_image
        };
    } catch (e: any) {
        // 透传 INVALID_APP_ID
        if (e.message === "INVALID_APP_ID") {
            throw e;
        }
        console.error("获取游戏详情失败:", e);
        throw new Error(`获取游戏详情失败: ${e.message}`);
    }
  },

  async getLatestNews(appId: string): Promise<number> {
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=1`;
    try {
        const data = await fetchWithProxy(url);
        const newsItems = data.appnews?.newsitems;
        if (!newsItems || newsItems.length === 0) {
          return 0; 
        }
        return newsItems[0].date;
    } catch (e) {
        // News 获取失败通常不影响核心功能，可以返回 0
        // 为了防止死循环，如果 News 获取失败，我们返回 0，视为无更新，而不是抛出异常导致重试
        // 这样做可能会漏掉更新，但解决了“卡死”问题。
        // 如果用户需要绝对精准，可以再加一个严格模式。
        // 但根据用户反馈“一直重复刷新”，优先解决死循环。
        console.warn(`获取新闻失败 ${appId} (已忽略错误)`, e);
        return 0;
    }
  },

  async getPlayerCount(appId: string): Promise<number> {
    const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`;
    try {
        const data = await fetchWithProxy(url);
        // 如果 result 不是 1，说明获取失败或者 ID 无效
        if (data.response && data.response.result !== 1) {
             // 可能是无效 ID，也可能是没人玩（但没人玩通常返回 result:1, player_count:0）
             // 暂时视为成功（返回0），避免卡死
             return 0;
        }
        return data.response?.player_count || 0;
    } catch (e) {
        // 即使失败也返回 0，不阻断流程
        console.warn(`获取在线人数失败 ${appId} (已忽略错误)`, e);
        return 0;
    }
  }
};
