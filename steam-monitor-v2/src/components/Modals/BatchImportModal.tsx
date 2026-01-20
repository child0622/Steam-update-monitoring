import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { X, Upload, Loader2 } from 'lucide-react';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const importGames = useGameStore(state => state.importGames);

  if (!isOpen) return null;

  const handleImport = async () => {
    setIsLoading(true);
    setStatus('正在解析 App IDs...');
    
    const ids = input.match(/\d+/g) || [];
    if (ids.length === 0) {
      setStatus('未发现有效的 App ID。');
      setIsLoading(false);
      return;
    }

    setStatus(`正在导入 ${ids.length} 个游戏...`);
    const { successCount, errors } = await importGames(ids);
    
    setStatus(`导入完成！成功导入 ${successCount} 个新游戏。`);
    if (errors.length > 0) {
        alert(`导入过程中出现错误:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
    }
    
    setIsLoading(false);
    setInput('');
    setTimeout(() => {
        setStatus('');
        onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 modal-enter">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-cyan-500 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-cyan-400">批量导入</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>
        
        <textarea 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-40 bg-gray-700 text-white placeholder-gray-500 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
          placeholder="请在此处粘贴 App ID 列表，支持逗号、空格或换行分隔..."
        />

        <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400 h-5">{status}</p>
            <div className="flex gap-4">
                <button 
                    onClick={onClose}
                    className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition"
                >
                    取消
                </button>
                <button 
                    onClick={handleImport}
                    disabled={isLoading}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    <span>开始导入</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
