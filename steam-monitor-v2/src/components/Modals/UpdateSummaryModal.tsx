import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { X, ExternalLink } from 'lucide-react';

export const UpdateSummaryModal: React.FC = () => {
  const { showSummaryModal, updateSummary, closeSummaryModal } = useGameStore();

  if (!showSummaryModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 modal-enter">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-cyan-500 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-cyan-400">刷新摘要</h3>
          <button onClick={closeSummaryModal} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto text-gray-300 flex-1">
          {updateSummary.length === 0 ? (
            <p className="text-center text-gray-400">所有游戏都已是最新状态，没有发现新动态。</p>
          ) : (
            <ul className="space-y-3">
              {updateSummary.map((game) => (
                <li key={game.appId} className="p-3 bg-gray-700/50 rounded-md flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{game.name}</p>
                    <p className="text-sm text-cyan-400">
                      新动态于: {new Date(game.lastUpdate * 1000).toLocaleString()}
                    </p>
                  </div>
                  <a 
                    href={`https://store.steampowered.com/app/${game.appId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs bg-cyan-700 hover:bg-cyan-600 text-white py-2 px-3 rounded transition whitespace-nowrap"
                    title="前往 Steam 商店页面"
                  >
                    <ExternalLink size={14} />
                    查看
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
             <button 
                onClick={closeSummaryModal}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md transition"
             >
                关闭
             </button>
        </div>
      </div>
    </div>
  );
};
