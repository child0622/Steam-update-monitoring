import React from 'react';
import { TrendingUp, Globe, Users } from 'lucide-react';

export const TrendsPanel: React.FC = () => {
  const trendingGames = [
    { name: "Palworld", change: "+12%" },
    { name: "Counter-Strike 2", change: "+5%" },
    { name: "Dota 2", change: "-2%" },
    { name: "PUBG", change: "+1.5%" },
    { name: "Apex Legends", change: "+0.8%" }
  ];

  return (
    <div className="h-full flex flex-col gap-6">
      {/* 热门趋势 */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-rose-400" />
          全球趋势
        </h3>
        
        <div className="space-y-3">
          {trendingGames.map((game, i) => (
            <div key={i} className="flex items-center justify-between text-sm group cursor-default">
              <span className="text-gray-400 group-hover:text-gray-200 transition-colors">{game.name}</span>
              <span className={`font-mono text-xs ${game.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                {game.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 模拟全球热力图/服务器状态 */}
      <div className="flex-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 flex flex-col">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <Globe size={14} className="text-blue-400" />
          服务器负载
        </h3>
        
        <div className="flex-1 relative min-h-[200px] flex items-center justify-center">
          {/* 简单的雷达扫描动画效果 */}
          <div className="absolute w-32 h-32 border border-blue-500/30 rounded-full flex items-center justify-center">
             <div className="w-24 h-24 border border-blue-500/20 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 border border-blue-500/10 rounded-full"></div>
             </div>
          </div>
          <div className="absolute w-32 h-32 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(59,130,246,0.3)_360deg)] rounded-full animate-spin [animation-duration:4s]"></div>
          
          {/* 随机点 */}
          <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_rgba(74,222,128,0.8)] animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_5px_rgba(250,204,21,0.8)] animate-pulse [animation-delay:1s]"></div>
          <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_5px_rgba(96,165,250,0.8)] animate-pulse [animation-delay:2s]"></div>

          <div className="absolute bottom-2 left-0 right-0 text-center">
             <span className="text-[10px] text-blue-400/70 font-mono">正在扫描区域...</span>
          </div>
        </div>
      </div>

      {/* 社区状态 */}
      <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-xl p-4">
         <div className="flex items-center gap-3 mb-2">
            <Users size={16} className="text-indigo-400" />
            <span className="text-indigo-200 text-sm font-medium">社区状态</span>
         </div>
         <div className="flex justify-between items-end">
            <div className="text-2xl font-bold text-indigo-100">24.5M</div>
            <div className="text-xs text-indigo-400 mb-1">在线中</div>
         </div>
      </div>

    </div>
  );
};
