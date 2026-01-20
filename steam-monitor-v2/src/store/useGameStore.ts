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
  
  addGame: (appId: string) => Promise<{ success: boolean; message?: string }>;
  removeGame: (appId: string) => void;
  refreshGames: (isAuto?: boolean) => Promise<void>;
  refreshSingleGame: (appId: string) => Promise<void>;
  closeSummaryModal: () => void;
  importGames: (appIds: string[]) => Promise<{ successCount: number; errors: string[] }>;
}

// 辅助函数：带错误捕获的单个游戏更新逻辑
async function fetchGameData(appId: string, currentGames: Record<string, Game>) {
    const oldGame = currentGames[appId];
    try {
        const [lastUpdate, playerCount] = await Promise.all([
            steamApi.getLatestNews(appId),
            steamApi.getPlayerCount(appId)
        ]);
        
        const hasUpdate = lastUpdate > oldGame.lastUpdate;
        
        return {
            appId,
            success: true,
            data: {
                ...oldGame,
                lastCheck: Date.now(),
                lastUpdate,
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

      addGame: async (appId) => {
        const { games } = get();
        if (games[appId]) {
          return { success: false, message: '该游戏已在监控列表中' };
        }

        try {
          const [details, lastUpdate, playerCount] = await Promise.all([
            steamApi.getGameDetails(appId),
            steamApi.getLatestNews(appId),
            steamApi.getPlayerCount(appId)
          ]);

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
          const { games } = get();
          const game = games[appId];
          if (!game) return;

          set({ isRefreshing: true, refreshProgress: { current: 1, total: 1, currentAppId: appId } });

          // 单个刷新也采用循环重试，直到成功
          let result;
          let retryCount = 0;
          
          while (true) {
             result = await fetchGameData(appId, games);
             if (result.success || result.isFatal) break;
             
             retryCount++;
             set({ refreshProgress: { current: 1, total: 1, currentAppId: `重试中(${retryCount}): ${appId}` } });
             await new Promise(r => setTimeout(r, 1500)); // 失败后等待 1.5s 重试
          }
          
          if (result.success && result.data) {
             set(state => ({
                 games: { ...state.games, [appId]: result.data! },
                 isRefreshing: false,
                 refreshProgress: null
             }));
             
             if (result.hasUpdate) {
                 notificationService.showNotification(`${result.data.name} 有新更新!`, {
                    body: `最新动态发布于 ${new Date(result.data.lastUpdate * 1000).toLocaleString()}`,
                    icon: result.data.header_image,
                    data: { type: 'focus_app' },
                    tag: `game-update-${appId}-${result.data.lastUpdate}`
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
        const { games } = get();
        let appIds = Object.keys(games);
        if (appIds.length === 0) return;

        set({ isRefreshing: true, refreshProgress: { current: 0, total: appIds.length } });
        
        let pendingIds = [...appIds];
        let round = 1;
        const newGamesMap = { ...games };
        const updatedGames: Game[] = [];

        // 死磕模式：只要还有 pendingIds，就一直循环，直到全部成功
        // 注意：fetchGameData 会标记 isFatal (无效ID)，这种会被剔除，防止死循环
        while (pendingIds.length > 0) {
            // 根据轮次动态调整并发：第一轮快一点，后面慢一点稳一点
            // 从第3轮开始，强制串行(并发1)，避免死循环
            const concurrency = round === 1 ? 8 : (round === 2 ? 3 : 1);
            
            if (round > 1) {
                console.log(`开始第 ${round} 轮重试，剩余 ${pendingIds.length} 个...`);
            }

            const results = await pMap(pendingIds, async (appId) => {
                // 重试轮次加一点随机延迟
                if (round > 1) {
                    await new Promise(r => setTimeout(r, Math.random() * 1000 + 1000));
                }
                // 串行轮次增加显著延迟
                if (round >= 3) {
                     await new Promise(r => setTimeout(r, 2000));
                }
                return fetchGameData(appId, games);
            }, concurrency, (completed, currentAppId) => {
                 // 进度显示逻辑：总是显示总进度
                 // 计算当前已完成的总数 = 总数 - 剩余未完成
                 // 这里为了 UI 简单，我们只在 Toast 显示“第 X 轮重试: 剩余 Y 个”
                 if (round === 1) {
                     set({ refreshProgress: { current: completed, total: appIds.length, currentAppId } });
                 } else {
                     set({ refreshProgress: { current: appIds.length - pendingIds.length + completed, total: appIds.length, currentAppId: `重试(轮次${round}): ${currentAppId}` } });
                 }
            });

            // 筛选出成功的
            const successItems = results.filter(r => r.success);
            successItems.forEach(res => {
                if (res.data) {
                    newGamesMap[res.appId] = res.data;
                    if (res.hasUpdate) {
                        updatedGames.push(res.data);
                    }
                }
            });

            // 筛选出需要继续重试的（失败且不是致命错误）
            const failedItems = results.filter(r => !r.success && !r.isFatal);
            
            // 更新 pendingIds 为下一轮
            pendingIds = failedItems.map(r => r.appId);
            
            round++;
            
            // 如果还有剩余，稍作休息避免封禁
            if (pendingIds.length > 0) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        // 循环结束，意味着所有 ID 要么成功，要么是无效 ID
        
        // 汇总通知
        if (updatedGames.length > 0) {
            const gameNames = updatedGames.map(g => g.name).join('、');
            const title = `${updatedGames.length} 款游戏有新更新！`;
            const body = `更新游戏：${gameNames.length > 50 ? gameNames.substring(0, 50) + '...' : gameNames}`;
            
            notificationService.showNotification(title, {
                body: body,
                icon: updatedGames[0].header_image, 
                data: { type: 'focus_app' },
                tag: 'game-update-summary'
            });
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

      importGames: async (appIds) => {
        let successCount = 0;
        const errors: string[] = [];
        
        const { games, addGame } = get();
        const uniqueIds = [...new Set(appIds)].filter(id => !games[id]);
        
        if (uniqueIds.length === 0) return { successCount: 0, errors: [] };

        // 导入也使用“死磕模式”
        // 这里 addGame 内部已经封装了 API 调用，但没有 retry 逻辑（之前是在 importGames 里做的）
        // 我们需要在 addGame 失败时判断是否 fatal
        
        let pendingIds = [...uniqueIds];
        let round = 1;

        while (pendingIds.length > 0) {
             const nextPendingIds: string[] = [];
             
             await pMap(pendingIds, async (appId) => {
                // 重试延迟
                if (round > 1) await new Promise(r => setTimeout(r, 1000));
                
                const result = await addGame(appId);
                
                if (result.success) {
                    successCount++;
                } else {
                    // 检查错误信息是否包含 fatal 关键词
                    // 我们在 addGame 里处理了 INVALID_APP_ID 返回特定 message
                    if (result.message?.includes("无效的 AppID")) {
                        errors.push(`AppID ${appId}: ${result.message}`);
                    } else {
                        // 网络错误等，加入下一轮
                        nextPendingIds.push(appId);
                    }
                }
             }, round === 1 ? 5 : 2); // 导入并发稍低

             pendingIds = nextPendingIds;
             round++;
             
             if (pendingIds.length > 0) {
                 console.log(`导入重试第 ${round} 轮，剩余 ${pendingIds.length} 个...`);
                 await new Promise(r => setTimeout(r, 2000));
             }
        }

        return { successCount, errors };
      }
    }),
    {
      name: 'monitored-games-storage',
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
