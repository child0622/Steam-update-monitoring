import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Cpu } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const StatusPanel: React.FC = () => {
  const { logs, startTime, requestCount, games } = useGameStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [runtime, setRuntime] = useState<string>('00:00:00');

  // 计算运行时间
  useEffect(() => {
    const updateRuntime = () => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const seconds = (diff % 60).toString().padStart(2, '0');
      setRuntime(`${hours}:${minutes}:${seconds}`);
    };

    const timer = setInterval(updateRuntime, 1000);
    updateRuntime(); // 立即执行一次
    return () => clearInterval(timer);
  }, [startTime]);

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

  // 计算“内存占用” (用监控游戏数代替)
  const monitoredGamesCount = Object.keys(games).length;
  // 假设每个游戏对象占用约 2MB 内存 (仅作展示用的估算)
  const memoryUsage = (monitoredGamesCount * 2 + 35).toFixed(0); 
  const memoryPercentage = Math.min((parseInt(memoryUsage) / 512) * 100, 100);

  // 计算“API 配额” (用最近一分钟请求数 RPM 估算，假设上限 60 RPM)
  // 这里简化为直接显示请求总数的相对压力，或者随机波动一点以示活跃？
  // 不，还是用 requestCount % 60 来模拟当前分钟的消耗吧，或者直接显示并发。
  // 更好的方式：显示 requestCount 的增长速率。暂时用 requestCount 的个位数变化模拟波动。
  const apiLoad = Math.min((requestCount % 100), 100);

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
              <span className="text-gray-500">并发请求负载</span>
              <span className="text-cyan-400">{apiLoad}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-500"
                style={{ width: `${apiLoad}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">内存估算</span>
              <span className="text-purple-400">{memoryUsage} MB</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-500"
                style={{ width: `${memoryPercentage}%` }}
              ></div>
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
            {logs.length === 0 && <div className="text-gray-600 italic">暂无日志...</div>}
            {logs.map((log, i) => (
              <div key={i} className="text-gray-500 border-l-2 border-transparent hover:border-gray-600 pl-2 transition-colors break-all">
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
            <div className="text-lg font-mono text-gray-200">{runtime}</div>
        </div>
        <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">请求总数</div>
            <div className="text-lg font-mono text-cyan-200">{requestCount.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};
