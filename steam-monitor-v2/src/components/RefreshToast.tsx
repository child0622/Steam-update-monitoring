import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Loader2 } from 'lucide-react';

export const RefreshToast: React.FC = () => {
  const { isRefreshing, refreshProgress } = useGameStore();

  if (!isRefreshing || !refreshProgress) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-gray-800 border border-cyan-500/30 rounded-lg shadow-xl p-4 flex items-center gap-4 min-w-[300px]">
        <div className="relative">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white">正在刷新...</h4>
          <p className="text-sm text-cyan-300">
            正在检查第 {Math.max(1, refreshProgress.current)} 个，共 {refreshProgress.total} 个
          </p>
          {refreshProgress.currentAppId && (
             <p className="text-xs text-gray-400 mt-1 font-mono">
               {refreshProgress.currentAppId.startsWith('重试') ? refreshProgress.currentAppId : `ID: ${refreshProgress.currentAppId}`}
             </p>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-gray-700 w-full rounded-b-lg overflow-hidden">
            <div 
                className="h-full bg-cyan-500 transition-all duration-300 ease-out"
                style={{ width: `${Math.min((refreshProgress.current / refreshProgress.total) * 100, 100)}%` }}
            />
        </div>
      </div>
    </div>
  );
};
