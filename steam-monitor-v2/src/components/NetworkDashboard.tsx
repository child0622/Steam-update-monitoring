import React, { useState, useEffect, useRef } from 'react';
import { Activity, Wifi, ArrowDownUp } from 'lucide-react';

export const NetworkDashboard: React.FC = () => {
  const [ping, setPing] = useState<number>(0);
  const [history, setHistory] = useState<number[]>(new Array(40).fill(0)); // Increase resolution
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  
  // 模拟 Ping 和 流量检测
  useEffect(() => {
    const checkPing = async () => {
      const start = Date.now();
      try {
        await fetch('https://corsproxy.io/?https://store.steampowered.com/favicon.ico', { method: 'HEAD', cache: 'no-store' });
        const latency = Date.now() - start;
        
        setPing(latency);
        setStatus('connected');
        setHistory(prev => [...prev.slice(1), latency]);
        
        // 模拟流量波动 (基于 latency 制造一些随机性)
        setDownloadSpeed(Math.random() * 5 + 2); // 2-7 MB/s
        setUploadSpeed(Math.random() * 2 + 0.5); // 0.5-2.5 MB/s
      } catch (e) {
        setStatus('disconnected');
        setHistory(prev => [...prev.slice(1), 0]);
        setDownloadSpeed(0);
        setUploadSpeed(0);
      }
    };

    const timer = setInterval(checkPing, 2000); // Faster update for smoother feel
    checkPing();

    return () => clearInterval(timer);
  }, []);

  // 生成 SVG Path
  const generatePath = (type: 'area' | 'line') => {
    // 强制使用 viewBox 坐标系：0-300, 0-60
    const width = 300; 
    const height = 60;
    const maxLatency = 500;
    
    // 如果没有数据点，画一条平线
    if (history.length === 0) {
       return type === 'area' 
         ? `M0,${height} L${width},${height} L${width},${height} L0,${height} Z`
         : `M0,${height} L${width},${height}`;
    }

    let d = '';
    
    // 1. 构建顶部曲线路径
    // 起点
    const startY = height - (Math.min(history[0] / maxLatency, 1) * height * 0.9);
    d += `M0,${startY}`;

    for (let i = 0; i < history.length - 1; i++) {
        const x1 = (i / (history.length - 1)) * width;
        const y1 = height - (Math.min(history[i] / maxLatency, 1) * height * 0.9);
        
        const x2 = ((i + 1) / (history.length - 1)) * width;
        const y2 = height - (Math.min(history[i+1] / maxLatency, 1) * height * 0.9);

        // 控制点
        const cp1x = x1 + (x2 - x1) / 2;
        const cp1y = y1;
        const cp2x = x1 + (x2 - x1) / 2;
        const cp2y = y2;
        
        d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
    }

    // 2. 根据类型闭合路径
    if (type === 'area') {
        // 区域图：向下连到右下角，再连到左下角，最后闭合
        d += ` L${width},${height} L0,${height} Z`;
    }

    return d;
  };

  const getStatusColor = () => {
    if (status === 'connected') return ping < 200 ? 'text-green-400' : 'text-yellow-400';
    if (status === 'connecting') return 'text-blue-400';
    return 'text-red-500';
  };

  return (
    <div className="w-full bg-gray-900/80 backdrop-blur-md border border-gray-700/50 rounded-xl mb-8 overflow-hidden relative group shadow-lg">
      {/* 背景动态网格线 */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent_24%,rgba(6,182,212,0.1)_25%,rgba(6,182,212,0.1)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.1)_75%,rgba(6,182,212,0.1)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(6,182,212,0.1)_25%,rgba(6,182,212,0.1)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.1)_75%,rgba(6,182,212,0.1)_76%,transparent_77%,transparent)] bg-[length:30px_30px]" />

      <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between relative z-10 gap-6">
        
        {/* 左侧：核心指标 */}
        <div className="flex gap-8 items-center min-w-max">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full bg-gray-800 border border-gray-700 ${getStatusColor()} shadow-[0_0_15px_rgba(0,0,0,0.3)]`}>
                    <Wifi size={24} className={status === 'disconnected' ? 'animate-pulse' : ''} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Steam 延迟</p>
                    <p className={`text-2xl font-mono font-bold ${getStatusColor()} drop-shadow-md`}>
                        {status === 'disconnected' ? '离线' : `${ping} ms`}
                    </p>
                </div>
            </div>

            <div className="hidden sm:flex items-center gap-4 border-l border-gray-700 pl-8">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2 text-xs text-gray-400">
                      <ArrowDownUp size={14} className="text-emerald-400" />
                      <span>下载</span>
                   </div>
                   <div className="font-mono text-lg text-emerald-300 font-bold">{downloadSpeed.toFixed(2)} <span className="text-xs font-normal text-gray-500">MB/s</span></div>
                </div>
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2 text-xs text-gray-400">
                      <ArrowDownUp size={14} className="text-sky-400 rotate-180" />
                      <span>上传</span>
                   </div>
                   <div className="font-mono text-lg text-sky-300 font-bold">{uploadSpeed.toFixed(2)} <span className="text-xs font-normal text-gray-500">MB/s</span></div>
                </div>
            </div>
        </div>

        {/* 右侧：高级波浪图 (全填充样式) */}
        <div className="flex-1 w-full h-16 relative hidden md:block bg-[#1b2838] rounded-lg overflow-hidden border border-gray-800/50">
            {/* 纵向网格线 (模仿 Steam 图表) */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0 flex justify-between px-2">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-full border-r border-gray-700/20 w-px"></div>
                ))}
            </div>
            
            {/* 阈值文字 */}
            <div className="absolute right-1 top-1 text-[9px] text-gray-500 font-mono z-20">500ms</div>
            
            <svg 
                className="w-full h-full overflow-visible z-10 relative" 
                viewBox="0 0 300 60" 
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2196f3" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#2196f3" stopOpacity="0.1" />
                    </linearGradient>
                </defs>
                
                {/* 填充区域 */}
                <path 
                    d={generatePath('area')} 
                    fill="url(#areaGradient)" 
                    vectorEffect="non-scaling-stroke"
                    className="transition-all duration-300 ease-linear"
                />
                
                {/* 顶部亮线 */}
                <path 
                    d={generatePath('line')} 
                    fill="none"
                    stroke="#66c0f4" 
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                    className="transition-all duration-300 ease-linear"
                />
            </svg>
        </div>

      </div>
    </div>
  );
};
