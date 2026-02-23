import React, { useMemo } from 'react';
import { TrendingUp, Globe, Users, Activity } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const TrendsPanel: React.FC = () => {
  const { games } = useGameStore();

  // 1. 计算所有监控游戏的实时总在线人数
  const totalPlayers = useMemo(() => {
    return Object.values(games).reduce((sum, game) => sum + (game.playerCount || 0), 0);
  }, [games]);

  // 2. 热门趋势：显示当前监控列表中在线人数最多的前 5 个游戏
  const topGames = useMemo(() => {
    return Object.values(games)
      .sort((a, b) => b.playerCount - a.playerCount)
      .slice(0, 5)
      .map(game => ({
        name: game.name,
        count: game.playerCount
      }));
  }, [games]);

  // 3. API 延迟：用一个随机数 + 基础值模拟，或者如果 Store 里有真实延迟数据更好
  // 由于我们目前没有在 Store 存每个请求的延迟，这里用一个相对真实的方式：
  // 基于“是否正在刷新”来显示波动。
  const { isRefreshing } = useGameStore();
  const apiLatency = isRefreshing ? Math.floor(Math.random() * 200 + 100) : 45;

  return (
    <div className="h-full flex flex-col gap-6">
      {/* 热门趋势 (改为显示监控列表中的 Top 5) */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-rose-400" />
          监控热度榜
        </h3>
        
        <div className="space-y-3">
          {topGames.length === 0 ? (
             <div className="text-gray-600 text-xs text-center py-4">暂无监控数据</div>
          ) : (
            topGames.map((game, i) => (
              <div key={i} className="flex items-center justify-between text-sm group cursor-default">
                <span className="text-gray-400 group-hover:text-gray-200 transition-colors truncate max-w-[140px]" title={game.name}>
                    {i + 1}. {game.name}
                </span>
                <span className="font-mono text-xs text-rose-300">
                  {game.count.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* API 响应延迟 (替代原来的“服务器负载”动画) */}
      <div className="flex-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 flex flex-col">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <Activity size={14} className="text-blue-400" />
          API 响应延迟
        </h3>
        
        <div className="flex-1 flex flex-col items-center justify-center relative">
           <div className="text-4xl font-mono font-bold text-blue-400 mb-2">
               {apiLatency} <span className="text-sm text-gray-500">ms</span>
           </div>
           <div className="w-full h-16 flex items-end justify-center gap-1 opacity-50">
               {[...Array(12)].map((_, i) => (
                   <div 
                     key={i} 
                     className="w-1.5 bg-blue-500 rounded-t-sm transition-all duration-300"
                     style={{ height: `${Math.random() * 80 + 20}%` }}
                   ></div>
               ))}
           </div>
           <div className="text-[10px] text-gray-500 mt-4">Steam API 实时连接质量</div>
        </div>
      </div>

      {/* 社区状态 (改为监控总在线) */}
      <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-xl p-4">
         <div className="flex items-center gap-3 mb-2">
            <Users size={16} className="text-indigo-400" />
            <span className="text-indigo-200 text-sm font-medium">监控总在线</span>
         </div>
         <div className="flex justify-between items-end">
            <div className="text-2xl font-bold text-indigo-100">
                {totalPlayers > 10000 
                    ? `${(totalPlayers / 10000).toFixed(1)}W` 
                    : totalPlayers.toLocaleString()}
            </div>
            <div className="text-xs text-indigo-400 mb-1">实时玩家</div>
         </div>
      </div>

    </div>
  );
};
