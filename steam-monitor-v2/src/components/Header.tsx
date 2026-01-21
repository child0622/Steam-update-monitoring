import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { notificationService } from '../services/notificationService';
import { RefreshCw, Download, Bell, BellOff, Upload, Gamepad2, FlaskConical, Save, FolderOpen } from 'lucide-react';

interface HeaderProps {
  onOpenImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport }) => {
  const { games, refreshGames, isRefreshing, importGames } = useGameStore();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRefresh = async () => {
    await refreshGames();
  };

  const handleNotificationToggle = async () => {
    if (notificationPermission === 'granted') {
      alert("通知功能已开启。");
      return;
    }
    const permission = await notificationService.requestPermission();
    setNotificationPermission(permission);
  };

  const handleTestNotification = () => {
    if (notificationPermission !== 'granted') {
      alert("请先开启通知权限。");
      return;
    }
    notificationService.showNotification("测试通知", {
      body: "这是一条测试通知，如果您看到它，说明系统级通知功能正常。",
      icon: "https://store.steampowered.com/favicon.ico"
    });
  };

  // 导出为 CSV
  const handleExportCsv = () => {
    const gameList = Object.values(games);
    if (gameList.length === 0) return;

    const csvContent = [
      ['AppID', '游戏名称', '上次检测时间', '最新更新时间', '在线人数', '商店链接'],
      ...gameList.map(g => [
        g.appId,
        `"${g.name.replace(/"/g, '""')}"`,
        new Date(g.lastCheck).toLocaleString(),
        new Date(g.lastUpdate * 1000).toLocaleString(),
        g.playerCount,
        `https://store.steampowered.com/app/${g.appId}/`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Steam监控导出_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 备份数据 (导出 JSON)
  const handleBackupData = () => {
    const gameList = Object.values(games);
    if (gameList.length === 0) {
        alert("暂无数据可备份");
        return;
    }
    const dataStr = JSON.stringify(gameList, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SteamMonitor_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 恢复数据 (导入 JSON)
  const handleRestoreData = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target?.result as string;
            const importedGames = JSON.parse(content);
            
            if (!Array.isArray(importedGames)) {
                throw new Error("无效的备份文件格式");
            }

            // 提取 AppID 并导入
            // 鉴于用户说"识别数量不一致"且希望保留旧数据，我们直接恢复完整状态
            if (importedGames.length === 0) {
                alert("备份文件中未找到有效的游戏数据");
                return;
            }

            restoreGames(importedGames);
            alert(`数据恢复完成! 共恢复 ${importedGames.length} 个游戏。`);
            
        } catch (error) {
            alert("无法解析备份文件，请确保选择的是正确的 JSON 文件。");
            console.error(error);
        } finally {
             // 清空 input 防止重复选择同一文件不触发 onChange
             if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  return (
    <header className="mb-8 flex flex-col gap-6">
      <div className="text-center flex flex-col items-center">
        <div className="flex items-center gap-4 mb-2">
            <Gamepad2 className="w-12 h-12 text-cyan-400" />
            <h1 className="text-4xl font-bold text-cyan-400">Steam 游戏更新监控</h1>
        </div>
        <p className="text-gray-400">实时追踪您关注游戏的更新动态与在线人数。</p>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4">
        {/* 左侧：通知相关 */}
        <div className="flex gap-2">
          <button 
            onClick={handleNotificationToggle}
            className={`flex items-center gap-2 font-bold py-2 px-4 rounded-md transition duration-300 ${
              notificationPermission === 'granted' 
                ? 'bg-green-700 cursor-default' 
                : 'bg-gray-700 hover:bg-gray-600 text-cyan-300'
            }`}
            disabled={notificationPermission === 'granted'}
          >
            {notificationPermission === 'granted' ? <Bell size={18} /> : <BellOff size={18} />}
            <span>{notificationPermission === 'granted' ? '通知已开启' : '开启通知'}</span>
          </button>
          
          <button 
            onClick={handleTestNotification}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded-md transition duration-300"
            title="测试系统通知"
          >
             <FlaskConical size={18} />
             <span>测试通知</span>
          </button>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? '正在刷新...' : '刷新全部'}</span>
          </button>
          
          <button 
            onClick={onOpenImport}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded-md transition duration-300"
          >
            <Upload size={18} />
            <span>批量导入</span>
          </button>

           {/* 备份与恢复 */}
           <div className="flex gap-2 border-l border-gray-600 pl-2 ml-2">
                <button 
                    onClick={handleBackupData}
                    disabled={Object.keys(games).length === 0}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
                    title="备份数据 (JSON)"
                >
                    <Save size={18} />
                    <span>备份</span>
                </button>
                <button 
                    onClick={handleRestoreData}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded-md transition duration-300"
                    title="恢复数据 (JSON)"
                >
                    <FolderOpen size={18} />
                    <span>恢复</span>
                </button>
                <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                />
           </div>

          <button 
            onClick={handleExportCsv}
            disabled={Object.keys(games).length === 0}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>导出 Excel</span>
          </button>
        </div>
      </div>
    </header>
  );
};
