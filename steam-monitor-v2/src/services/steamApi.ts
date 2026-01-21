
// 代理配置：优先使用无需授权且速度较快的代理
const PROXIES = [
  // 优先级1：CORS Proxy.io (目前最稳定，无需授权)
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  // 优先级2：CodeTabs (备用，无需授权)
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  // 优先级3：CORS Anywhere (需要用户手动点击 demo 授权，降级为备用)
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
  // 优先级4：AllOrigins (JSON包装，作为最后手段)
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export interface GameDetails {
  name: string;
  header_image: string;
}

// 带超时的 Fetch 封装
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000) {
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

async function fetchWithProxy(targetUrl: string): Promise<any> {
  let lastError: any;

  // 尝试所有代理 (无内部重试，快速失败)
  for (const proxyFn of PROXIES) {
    const proxiedUrl = proxyFn(targetUrl);
    
    try {
      // 超时时间适当延长到 8 秒，因为 News API 可能较慢
      const response = await fetchWithTimeout(proxiedUrl, {}, 8000);
      
      if (!response.ok) {
          if (response.status === 403 || response.status === 429) {
            // 代理限制，继续下一个代理
            continue;
          }
          // 其他 HTTP 错误，继续下一个代理
          continue; 
      }

      let data;
      try {
          data = await response.json();
      } catch (jsonError) {
          // JSON 解析失败，继续下一个代理
          continue;
      }

      if (typeof data !== 'object' || data === null) {
            // 格式错误，继续下一个代理
            continue;
      }
      
      return data; // 成功
    } catch (error: any) {
      lastError = error;
      // 网络错误或超时，继续下一个代理
      continue;
    }
  }
  
  throw lastError || new Error("所有代理连接均失败");
}

export const steamApi = {
  async getGameDetails(appId: string): Promise<GameDetails> {
    // 强制使用中文语言参数
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=schinese`;
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
    // 移除语言参数，确保 100% 兼容性，只追求获取正确的时间戳
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
        console.warn(`获取新闻失败 ${appId} (已忽略错误)`, e);
        return 0;
    }
  },

  async getPlayerCount(appId: string): Promise<number> {
    const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`;
    try {
        const data = await fetchWithProxy(url);
        
        // 增加对数据结构的宽容检查
        if (!data || !data.response) {
             return 0;
        }

        // 如果 result 不是 1，说明获取失败或者 ID 无效
        if (data.response.result !== 1) {
             // 可能是无效 ID，也可能是没人玩（但没人玩通常返回 result:1, player_count:0）
             // 暂时视为成功（返回0），避免卡死
             return 0;
        }
        return data.response.player_count || 0;
    } catch (e) {
        // 即使失败也返回 0，不阻断流程
        console.warn(`获取在线人数失败 ${appId} (已忽略错误)`, e);
        return 0;
    }
  }
};
