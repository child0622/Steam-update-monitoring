import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { GameCard } from './GameCard';

export const GameList: React.FC = () => {
  const { games, removeGame } = useGameStore();
  const gameList = Object.values(games);

  if (gameList.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg">
        <h3 className="mt-2 text-lg font-medium text-white">暂无监控中的游戏</h3>
        <p className="mt-1 text-sm text-gray-400">请在上方输入框中添加一个游戏 App ID 开始监控。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {gameList.map((game) => (
        <GameCard key={game.appId} game={game} onRemove={removeGame} />
      ))}
    </div>
  );
};
