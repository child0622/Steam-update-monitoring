import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export const AddGameInput: React.FC = () => {
  const [appId, setAppId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addGame = useGameStore(state => state.addGame);

  const handleAdd = async () => {
    const trimmedId = appId.trim();
    if (!trimmedId || !/^\d+$/.test(trimmedId)) {
      alert('请输入有效的 Steam App ID (纯数字)。');
      return;
    }

    setIsLoading(true);
    const result = await addGame(trimmedId);
    setIsLoading(false);

    if (result.success) {
      setAppId('');
    } else {
        if (result.message && result.message.startsWith("PROXY_LIMIT")) {
             if(confirm(`连接代理受限 (${result.message})。\n是否尝试在新窗口打开 CORS Anywhere 进行手动授权？\n\n授权成功后请返回此页面重试。`)) {
                 window.open('https://cors-anywhere.herokuapp.com/corsdemo', '_blank');
            }
        } else {
            alert(`添加游戏失败: ${result.message}`);
        }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg shadow-lg mb-8 border border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-white">添加新游戏进行监控</h2>
      <div className="flex flex-col sm:flex-row gap-4">
        <input 
          type="text" 
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入游戏的 Steam App ID..." 
          className="flex-grow bg-gray-700 text-white placeholder-gray-500 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
        />
        <button 
          onClick={handleAdd}
          disabled={isLoading}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
          <span>添加游戏</span>
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        如何找到 App ID？ 在 Steam 商店页面的 URL 中可以找到，例如《绝地求生》的 URL 是 store.steampowered.com/app/578080/，那么它的 App ID 就是 578080。
      </p>
    </div>
  );
};
