import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Cpu } from 'lucide-react';

export const StatusPanel: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 模拟日志生成
  useEffect(() => {
    const messages = [
      "正在连接 Steam API...",
      "验证代理服务器状态...",
      "同步游戏数据...",
      "检测到新的更新...",
      "正在计算在线人数...",
      "API 响应延迟正常...",
      "正在刷新缓存...",
      "连接到 corsproxy.io...",
      "更新完成.",
      "系统待机中...",
      "心跳包发送成功..."
    ];

    const addLog = () => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      setLogs(prev => [...prev.slice(-15), `[${time}] ${msg}`]);
    };

    const timer = setInterval(addLog, 2500);
    addLog();
    return () => clearInterval(timer);
  }, []);

  // 自动滚动到底部 (仅限容器内部)
  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col gap-6">
      {/* 系统状态卡片 */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <Cpu size={14} className="text-cyan-400" />
          系统状态
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">API 配额</span>
              <span className="text-cyan-400">45%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 w-[45%] rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">内存占用</span>
              <span className="text-purple-400">128 MB</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-[30%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 滚动日志终端 */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-4 flex flex-col min-h-[300px]">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
          <Terminal size={14} className="text-green-400" />
          控制台输出
        </h3>
        <div className="flex-1 overflow-hidden relative font-mono text-xs">
          <div 
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-y-auto space-y-1 scrollbar-hide"
          >
            {logs.map((log, i) => (
              <div key={i} className="text-gray-500 border-l-2 border-transparent hover:border-gray-600 pl-2 transition-colors">
                <span className="text-gray-600 mr-2">{log.split(']')[0]}]</span>
                <span className="text-gray-300">{log.split(']')[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 装饰性数据块 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">运行时间</div>
            <div className="text-lg font-mono text-gray-200">02:14:59</div>
        </div>
        <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">请求总数</div>
            <div className="text-lg font-mono text-cyan-200">1,240</div>
        </div>
      </div>
    </div>
  );
};
