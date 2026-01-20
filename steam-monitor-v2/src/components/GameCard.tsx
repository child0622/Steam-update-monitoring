import React, { useState } from 'react';
import { Game, useGameStore } from '../store/useGameStore';
import { ExternalLink, Trash2, RefreshCw } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onRemove: (appId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onRemove }) => {
  const refreshSingleGame = useGameStore(state => state.refreshSingleGame);
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = async () => {
    setIsSpinning(true);
    await refreshSingleGame(game.appId);
    setIsSpinning(false);
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm p-5 rounded-lg shadow-lg transition transform hover:-translate-y-1 border border-gray-700 card-glow relative group">
      <div className="flex items-center gap-4 mb-4">
        <img 
          src={game.header_image} 
          alt={game.name} 
          className="w-28 h-12 object-cover rounded-md shadow-md"
        />
        <h3 className="text-lg font-bold text-white flex-1 truncate" title={game.name}>
          {game.name}
        </h3>
        <button 
           onClick={handleRefresh}
           disabled={isSpinning}
           className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-cyan-400 transition disabled:opacity-50"
           title="单独刷新此游戏"
        >
            <RefreshCw size={18} className={isSpinning ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <div className="space-y-2 text-sm text-gray-400">
        <p><strong>App ID:</strong> <span className="text-cyan-400">{game.appId}</span></p>
        <p><strong>上次检测:</strong> <span className="text-cyan-400">{new Date(game.lastCheck).toLocaleString()}</span></p>
        <p><strong>最新动态:</strong> <span className="text-cyan-400">{new Date(game.lastUpdate * 1000).toLocaleString()}</span></p>
        <p><strong>在线人数:</strong> <span className="text-green-400 font-bold">{game.playerCount.toLocaleString()}</span></p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-2 items-center">
        <a 
          href={`https://store.steampowered.com/app/${game.appId}/`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-center gap-2 text-xs bg-cyan-700 hover:bg-cyan-600 text-white py-2 px-3 rounded-md transition"
        >
          <ExternalLink size={14} />
          商店页面
        </a>
        <button 
          onClick={() => onRemove(game.appId)} 
          className="flex items-center justify-center gap-2 text-xs bg-red-800 hover:bg-red-700 text-white py-2 px-3 rounded-md transition"
        >
          <Trash2 size={14} />
          删除监控
        </button>
      </div>
    </div>
  );
};
