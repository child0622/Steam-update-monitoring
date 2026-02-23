import { useEffect, useState } from 'react';
import { AddGameInput } from './components/AddGameInput';
import { GameList } from './components/GameList';
import { Header } from './components/Header';
import { UpdateSummaryModal } from './components/Modals/UpdateSummaryModal';
import { BatchImportModal } from './components/Modals/BatchImportModal';
import { RefreshToast } from './components/RefreshToast';
import { NetworkDashboard } from './components/NetworkDashboard';
import { DynamicBackground } from './components/DynamicBackground';
import { StatusPanel } from './components/SidePanels/StatusPanel';
import { TrendsPanel } from './components/SidePanels/TrendsPanel';
import { useGameStore } from './store/useGameStore';
import { notificationService } from './services/notificationService';

const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

function App() {
  const { refreshGames } = useGameStore();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    // 强制重置僵尸状态：每次页面加载时，无论之前存了什么，都强制设为“空闲”
    useGameStore.setState({ isRefreshing: false, refreshProgress: null });

    // Initial Service Worker Registration check
    notificationService.registerServiceWorker();

    // Auto Refresh Timer using Web Worker (prevents throttling in background)
    const worker = new Worker(new URL('./workers/timerWorker.js', import.meta.url));
    
    worker.onmessage = (e) => {
      if (e.data === 'tick') {
        console.log('Auto-refreshing games (triggered by Worker)...');
        refreshGames(true);
      }
    };
    
    worker.postMessage('start');

    return () => {
      worker.postMessage('stop');
      worker.terminate();
    };
  }, [refreshGames]);

  return (
    <div className="min-h-screen text-gray-100 relative">
      <DynamicBackground />
      
      <div className="w-full max-w-[1800px] mx-auto p-4 sm:p-6 relative z-10">
        <Header onOpenImport={() => setIsImportModalOpen(true)} />
        
        <div className="grid grid-cols-1 xl:flex gap-6 items-start mt-6">
          
          {/* 左侧面板：仅在大屏显示 */}
          <div className="hidden xl:block sticky top-6 w-[280px]">
             <StatusPanel />
          </div>

          {/* 中间主要内容区域 */}
          <div className="flex flex-col gap-6 min-w-0 flex-1">
            <NetworkDashboard />
            <AddGameInput />
            <GameList />
          </div>

          {/* 右侧面板：仅在大屏显示 */}
          <div className="hidden xl:block sticky top-6 w-[280px]">
             <TrendsPanel />
          </div>

        </div>
      </div>

      <UpdateSummaryModal />
      <BatchImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <RefreshToast />
    </div>
  );
}

export default App;
