import { useEffect, useState } from 'react';
import { AddGameInput } from './components/AddGameInput';
import { GameList } from './components/GameList';
import { Header } from './components/Header';
import { UpdateSummaryModal } from './components/Modals/UpdateSummaryModal';
import { BatchImportModal } from './components/Modals/BatchImportModal';
import { RefreshToast } from './components/RefreshToast';
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

    // Auto Refresh Timer
    const timer = setInterval(() => {
      console.log('Auto-refreshing games...');
      refreshGames(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, [refreshGames]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-cyan-900/50 p-4 sm:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <Header onOpenImport={() => setIsImportModalOpen(true)} />
        <AddGameInput />
        <GameList />
      </div>

      <UpdateSummaryModal />
      <BatchImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <RefreshToast />
    </div>
  );
}

export default App;
