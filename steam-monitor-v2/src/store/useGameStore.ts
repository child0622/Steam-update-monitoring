import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { steamApi } from '../services/steamApi';
import { notificationService } from '../services/notificationService';

export interface Game {
  appId: string;
  name: string;
  header_image: string;
  lastCheck: number;
  lastUpdate: number;
  playerCount: number;
}

interface GameStore {
  games: Record<string, Game>;
  isRefreshing: boolean;
  refreshProgress: { current: number; total: number; currentAppId?: string } | null;
  updateSummary: Game[];
  showSummaryModal: boolean;
  
  // System Metrics
  startTime: number;
  requestCount: number;
  logs: string[];
  dataThroughput: number; // in bytes

  addLog: (message: string) => void;
  incrementRequestCount: (success?: boolean) => void;
  addDataThroughput: (bytes: number) => void;
  
  addGame: (appId: string) => Promise<{ success: boolean; message?: string }>;
  removeGame: (appId: string) => void;
  refreshGames: (isAuto?: boolean) => Promise<void>;
  refreshSingleGame: (appId: string) => Promise<void>;
  closeSummaryModal: () => void;
  importGames: (appIds: string[], onProgress?: (current: number, total: number, appId: string) => void) => Promise<{ successCount: number; errors: string[] }>;
  restoreGames: (gamesList: Game[]) => void;
}

// 辅助函数：带错误捕获的单个游戏更新逻辑
async function fetchGameData(appId: string, currentGames: Record<string, Game>) {
    const oldGame = currentGames[appId];
    // 获取 store 实例用于更新流量
    // 注意：在函数内部获取 store 可能有闭包问题，但这里我们只需要 getState
    // 不过由于 fetchGameData 是独立的，我们最好通过参数传进来，或者简单估算。
    // 这里简单处理：每次成功请求假设消耗 2KB 流量 (JSON 大小)
    const ESTIMATED_SIZE = 2048; 
    
    try {
        const [lastUpdate, playerCount] = await Promise.all([
            steamApi.getLatestNews(appId),
            steamApi.getPlayerCount(appId)
        ]);
        
        // 成功后更新流量 (需要在组件或 store action 里调用 addDataThroughput，这里没法直接调用)
        // 这是一个架构上的小妥协，我们在下面 pMap 的回调里统一加流量?
        // 不，我们在 useGameStore 的 action 里处理。
        
        // 只有当获取到有效的时间戳时才更新，避免覆盖为 0 (1970年)
        const newLastUpdate = lastUpdate > 0 ? lastUpdate : oldGame.lastUpdate;
        const hasUpdate = newLastUpdate > oldGame.lastUpdate;
        
        return {
            appId,
            success: true,
            data: {
                ...oldGame,
                lastCheck: Date.now(),
                lastUpdate: newLastUpdate,
                playerCount: playerCount > 0 ? playerCount : oldGame.playerCount 
            },
            hasUpdate
        };
    } catch (error: any) {
        // 如果是无效 ID，标记为不可恢复
        const isInvalidId = error.message === "INVALID_APP_ID" || error.isInvalidId;
        console.warn(`刷新游戏 ${appId} 失败:`, error);
        return { appId, success: false, error, isFatal: isInvalidId };
    }
}

// 并发控制函数
async function pMap<T, R>(
  items: T[], 
  mapper: (item: T) => Promise<R>, 
  concurrency: number,
  onProgress?: (completedCount: number, currentItem: T) => void,
  baseProgressIndex = 0
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  let completed = 0;

  for (const item of items) {
    const p = Promise.resolve().then(() => mapper(item));
    results.push(p as any); 

    const e: Promise<void> = p.then(() => {
      executing.splice(executing.indexOf(e), 1);
      completed++;
      if (onProgress) onProgress(baseProgressIndex + completed, item);
    });
    executing.push(e);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      games: {},
      isRefreshing: false,
      refreshProgress: null,
      updateSummary: [],
      showSummaryModal: false,

      // Initialize System Metrics
      startTime: Date.now(),
      requestCount: 0,
      logs: [],
      dataThroughput: 0,

      addLog: (message: string) => set(state => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        return { logs: [...state.logs.slice(-49), `[${time}] ${message}`] };
      }),

      incrementRequestCount: () => set(state => ({ requestCount: state.requestCount + 1 })),
      
      addDataThroughput: (bytes: number) => set(state => ({ dataThroughput: state.dataThroughput + bytes })),

      addGame: async (appId) => {
        // 主动请求通知权限
        if ('Notification' in window && Notification.permission === 'default') {
             notificationService.requestPermission();
        }

        const { games, addLog, incrementRequestCount } = get();
        if (games[appId]) {
          addLog(`尝试添加已存在的游戏: ${appId}`);
          return { success: false, message: '该游戏已在监控列表中' };
        }
        
        addLog(`开始添加游戏: ${appId}`);
        incrementRequestCount();

        try {
          const [details, lastUpdate, playerCount] = await Promise.all([
            steamApi.getGameDetails(appId),
            steamApi.getLatestNews(appId),
            steamApi.getPlayerCount(appId)
          ]);

          addLog(`成功获取游戏数据: ${details.name}`);

          const newGame: Game = {
            appId,
            name: details.name,
            header_image: details.header_image,
            lastCheck: Date.now(),
            lastUpdate,
            playerCount
          };

          set((state) => ({
            games: { ...state.games, [appId]: newGame }
          }));
          return { success: true };
        } catch (error: any) {
            addLog(`添加游戏失败 ${appId}: ${error.message}`);
            // 如果是 INVALID_APP_ID，直接失败，不重试
            if (error.message === "INVALID_APP_ID" || error.isInvalidId) {
                 return { success: false, message: '无效的 AppID，请检查输入' };
            }
            // 导入时也进行简单的重试
            if (error.message && error.message.startsWith("PROXY_LIMIT")) {
                return { success: false, message: error.message };
            }
          return { success: false, message: error.message || '获取游戏数据失败' };
        }
      },

      removeGame: (appId) => {
        set((state) => {
          const newGames = { ...state.games };
          delete newGames[appId];
          return { games: newGames };
        });
      },

      refreshSingleGame: async (appId) => {
          const { games, addLog, incrementRequestCount } = get();
          const game = games[appId];
          if (!game) return;

          set({ isRefreshing: true, refreshProgress: { current: 1, total: 1, currentAppId: appId } });
          addLog(`手动刷新单体游戏: ${game.name} (${appId})`);

          // 单个刷新也采用循环重试，直到成功
          let result;
          let retryCount = 0;
          
          while (true) {
             incrementRequestCount();
             result = await fetchGameData(appId, games);
             useGameStore.getState().addDataThroughput(2048);
             if (result.success || result.isFatal) break;
             
             retryCount++;
             addLog(`刷新 ${game.name} 失败，准备第 ${retryCount} 次重试...`);
             set({ refreshProgress: { current: 1, total: 1, currentAppId: `重试中(${retryCount}): ${appId}` } });
             await new Promise(r => setTimeout(r, 1500)); // 失败后等待 1.5s 重试
          }
          
          if (result.success && result.data) {
             addLog(`刷新成功: ${result.data.name} (在线: ${result.data.playerCount})`);
             set(state => ({
                 games: { ...state.games, [appId]: result.data! },
                 isRefreshing: false,
                 refreshProgress: null
             }));
             
             if (result.hasUpdate) {
                 addLog(`发现更新! ${result.data.name}`);
                 notificationService.showNotification(`${result.data.name} 有新更新!`, {
                    body: `最新动态发布于 ${new Date(result.data.lastUpdate * 1000).toLocaleString()}`,
                    icon: result.data.header_image,
                    data: { type: 'focus_app' },
                    tag: `game-update-${appId}-${result.data.lastUpdate}`,
                    renotify: true,
                    requireInteraction: true
                 });
                 set({ updateSummary: [result.data], showSummaryModal: true });
             } 
          } else {
              set({ isRefreshing: false, refreshProgress: null });
              // 如果是致命错误（无效ID），还是需要提示一下
              if (result.isFatal) {
                  alert(`刷新失败: 游戏 ID 无效，可能已被 Steam 移除。`);
              }
          }
      },

      refreshGames: async (isAuto = false) => {
        // 如果是手动刷新，主动请求通知权限
        if (!isAuto && 'Notification' in window && Notification.permission === 'default') {
             notificationService.requestPermission();
        }

        const { games, addLog, incrementRequestCount } = get();
        let appIds = Object.keys(games);
        if (appIds.length === 0) return;

        set({ isRefreshing: true, refreshProgress: { current: 0, total: appIds.length } });
        addLog(`${isAuto ? '自动' : '手动'}全量刷新开始，共 ${appIds.length} 个游戏`);
        
        let pendingIds = [...appIds];
        let round = 1;
        const newGamesMap = { ...games };
        const updatedGames: Game[] = [];

        // 极速模式：最多重试 1 次 (共 2 轮)
        // 既然用户有 VPN，我们追求速度，不再无限死磕
        while (pendingIds.length > 0 && round <= 2) {
            // 降低并发数，避免触发代理服务 (CodeTabs) 的速率限制
            const concurrency = 5;
            
            if (round > 1) {
                console.log(`第 ${round} 轮重试，剩余 ${pendingIds.length} 个...`);
                addLog(`进入第 ${round} 轮重试，剩余 ${pendingIds.length} 个失败项目`);
            }

            const results = await pMap(pendingIds, async (appId) => {
                // 移除人为延迟，直接请求
                incrementRequestCount();
                const res = await fetchGameData(appId, games);
                // 估算流量：每个请求约 2KB
                useGameStore.getState().addDataThroughput(2048);
                return res;
            }, concurrency, (completed, currentAppId) => {
                 // 进度显示逻辑
                 if (round === 1) {
                     set({ refreshProgress: { current: completed, total: appIds.length, currentAppId: currentAppId as any } });
                 } else {
                     set({ refreshProgress: { current: appIds.length - pendingIds.length + completed, total: appIds.length, currentAppId: `重试: ${currentAppId}` } });
                 }
            }, 0);

            // 筛选出成功的
            const successItems = results.filter(r => r.success);
            successItems.forEach(res => {
                if (res.data) {
                    newGamesMap[res.appId] = res.data;
                    if (res.hasUpdate) {
                        updatedGames.push(res.data);
                        addLog(`发现更新: ${res.data.name}`);
                    }
                }
            });

            // 筛选出需要继续重试的（失败且不是致命错误）
            const failedItems = results.filter(r => !r.success && !r.isFatal);
            
            // 更新 pendingIds 为下一轮
            pendingIds = failedItems.map(r => r.appId);
            
            round++;
        }

        addLog(`刷新结束. 成功: ${appIds.length - pendingIds.length}, 失败: ${pendingIds.length}`);

        // 循环结束，意味着所有 ID 要么成功，要么是无效 ID
        
        // 汇总通知
        if (updatedGames.length > 0) {
            const gameNames = updatedGames.map(g => g.name).join('、');
            const title = `${updatedGames.length} 款游戏有新更新！`;
            const body = `更新游戏：${gameNames.length > 50 ? gameNames.substring(0, 50) + '...' : gameNames}`;
            
            console.log('Sending system notification:', title);
            
            // 无论手动还是自动，只要有更新，就强制弹出系统通知
            // 不使用 await，避免阻塞后续逻辑
            notificationService.showNotification(title, {
                body: body,
                icon: updatedGames[0].header_image, 
                data: { type: 'focus_app' },
                tag: `game-update-summary-${Date.now()}`, // 使用唯一 tag 确保不被静默合并
                renotify: true, // 强制重新通知（震动/弹窗）
                requireInteraction: true // 保持常驻直到用户点击
            }).catch(e => console.error('Failed to send notification:', e));
        }

        const shouldShowModal = isAuto ? updatedGames.length > 0 : true;

        set({
          games: newGamesMap,
          isRefreshing: false,
          refreshProgress: null,
          updateSummary: updatedGames,
          showSummaryModal: shouldShowModal
        });
      },

      closeSummaryModal: () => set({ showSummaryModal: false }),

      importGames: async (appIds, onProgress) => {
        let successCount = 0;
        const errors: string[] = [];
        
        const { games, addGame } = get();
        // 过滤掉已经在列表中的游戏
        const uniqueIds = [...new Set(appIds)].filter(id => !games[id]);
        
        if (uniqueIds.length === 0) return { successCount: 0, errors: [] };

        let pendingIds = [...uniqueIds];
        const total = uniqueIds.length;
        let processed = 0;
        let round = 1;

        // 死磕模式：只要还有 pendingIds，就一直循环，直到全部成功
        while (pendingIds.length > 0) {
             const nextPendingIds: string[] = [];
             
             // 优化并发：
             // 第一轮使用较高并发 (5)，后续轮次降级 (2) 以求稳
             // 同时减少每轮之间的等待
             const concurrency = round === 1 ? 5 : 2;

             if (round > 1) {
                 console.log(`导入重试第 ${round} 轮，剩余 ${pendingIds.length} 个...`);
             }
             
             await pMap(pendingIds, async (appId) => {
                // 动态间隔：第一轮快一点 (300ms)，后续轮次慢一点 (800ms)
                const delay = round === 1 ? 300 : 800;
                await new Promise(r => setTimeout(r, delay)); 
                
                // 更新进度条 UI (在开始处理前更新)
                if (onProgress) onProgress(processed + 1, total, appId);

                const result = await addGame(appId);
                
                if (result.success) {
                    successCount++;
                    processed++; // 只有成功或确认失败(fatal)才算处理完？不，只要这一轮跑过了就算一次尝试
                    // 但为了 UI 进度条准确，我们最好是成功一个涨一个，或者处理完一个涨一个
                    // 这里简化逻辑：processed 仅用于展示“当前正在处理第几个”
                } else {
                    // 检查错误信息是否包含 fatal 关键词
                    if (result.message?.includes("无效的 AppID")) {
                        errors.push(`AppID ${appId}: ${result.message}`);
                        processed++; // 无效 ID 也算处理完毕
                    } else {
                        // 网络错误等，加入下一轮
                        nextPendingIds.push(appId);
                    }
                }
             }, concurrency);

             pendingIds = nextPendingIds;
             round++;
             
             if (pendingIds.length > 0) {
                 // 轮次间隔休息
                 await new Promise(r => setTimeout(r, 1500));
             }
        }

        return { successCount, errors };
      },

      restoreGames: (gamesList: Game[]) => {
        set((state) => {
            const newGames = { ...state.games };
            let restoredCount = 0;
            
            gamesList.forEach(game => {
                // 直接覆盖或添加，保留原有的 lastCheck, lastUpdate 等字段
                if (game && game.appId) {
                    newGames[game.appId] = game;
                    restoredCount++;
                }
            });
            
            return { games: newGames };
        });
      }
    }),
    {
      name: 'monitored-games-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化 games 数据，忽略 isRefreshing 等临时状态
      partialize: (state) => ({ games: state.games }),
    }
  )
);
