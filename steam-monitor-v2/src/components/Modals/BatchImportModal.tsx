import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { X, Upload, Loader2 } from 'lucide-react';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState('');
  const { importGames } = useGameStore();

  if (!isOpen) return null;

  const handleImport = async () => {
    const ids = input.match(/\d+/g) || [];
    if (ids.length === 0) {
      setStatus('没有发现有效的 App ID。');
      return;
    }

    setIsImporting(true);
    setStatus('准备开始导入...');
    
    const { successCount, errors } = await importGames(ids, (current, total, appId) => {
        setStatus(`正在导入 ${current} / ${total}... (${appId})`);
    });

    setIsImporting(false);
    setStatus(`导入完成！成功: ${successCount} 个，失败: ${errors.length} 个。`);
    
    if (errors.length > 0) {
        alert(`部分游戏导入失败:\n${errors.join('\n')}`);
    }

    setTimeout(() => {
        if (successCount > 0) {
            onClose();
            setInput('');
            setStatus('');
        }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 modal-enter">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-cyan-500 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-cyan-400">批量导入 App IDs</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">
            <X size={24} />
          </button>
        </div>
        
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-40 bg-gray-700 text-white placeholder-gray-500 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
          placeholder="请在此处粘贴 App ID 列表，用逗号、空格或换行符分隔..."
          disabled={isImporting}
        />

        <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400 truncate flex-1 mr-4 min-h-[1.25rem]">
                {status}
            </p>
            <div className="flex gap-4">
                <button 
                    onClick={onClose}
                    disabled={isImporting}
                    className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50"
                >
                    取消
                </button>
                <button 
                    onClick={handleImport}
                    disabled={isImporting || !input.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    <span>开始导入</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
