
// 代理配置：优先使用本地/快速代理，逐级降级
const PROXIES = [
  // 优先级0：本地 Vite 代理 (仅开发环境有效，速度最快，无 CORS 问题)
  (url: string) => {
    // 检查是否在开发环境 (Vite 注入的变量)
    if (import.meta.env.DEV) {
        if (url.includes('store.steampowered.com')) {
            return url.replace('https://store.steampowered.com', '/api/store');
        }
        if (url.includes('api.steampowered.com')) {
            return url.replace('https://api.steampowered.com', '/api/steam');
        }
    }
    return null; // 非开发环境或不匹配，跳过
  },
  // 优先级1：CORS Anywhere (需一次性授权，速度快，支持完整 Header)
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
  // 优先级2：CodeTabs (全自动，无需授权，但较慢)
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  // 优先级3：AllOrigins (JSON包装，备用)
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export interface GameDetails {
  name: string;
  header_image: string;
}

// 带超时的 Fetch 封装
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
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
    let proxiedUrl;
    try {
        proxiedUrl = proxyFn(targetUrl);
        if (!proxiedUrl) continue; // 代理函数返回 null 表示不适用
    } catch (e) {
        continue; // 代理生成函数抛错，跳过
    }
    
    try {
      // 超时时间适当缩短到 5 秒，快速失败切换
      const response = await fetchWithTimeout(proxiedUrl, {}, 5000);
      
      // 记录数据流量 (近似值)
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
         // 需要动态导入 store 来避免循环依赖，或者直接在 store 里计算
         // 这里简单点，通过一个全局事件或 store 暴露的方法？
         // 由于 store 引用了 steamApi，这里不能反向引用 store。
         // 可以在 fetchWithProxy 的调用者处处理流量统计。
         // 但为了不修改太多，我们在 window 对象上挂一个临时的统计函数? 
         // 不，最干净的方法是 fetchWithProxy 返回 response 以及大小，由调用者处理。
         // 鉴于目前架构，我们暂且忽略这里，在 useGameStore 里大概估算。
      }

      if (!response.ok) {
          if (response.status === 403 || response.status === 429) {
            // 代理限制，继续下一个代理
            continue;
          }
          // 本地代理如果返回 404 (通常是因为目标资源不存在)，也可能是配置问题
          // 但如果是其他 5xx 错误，肯定是失败
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
