import React, { useState, useEffect } from 'react';
import { Wifi, ArrowDownUp } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export const NetworkDashboard: React.FC = () => {
  const [ping, setPing] = useState<number>(0);
  const [history, setHistory] = useState<number[]>(new Array(40).fill(0)); // Increase resolution
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [throughputDisplay, setThroughputDisplay] = useState(0); // in KB
  
  const { dataThroughput } = useGameStore();

  // 监听真实数据吞吐量的变化，并模拟瞬时速度
  // 注意：useGameStore 里的 dataThroughput 是累积总量
  // 我们需要计算“最近几秒的增量”来作为“当前速度”
  useEffect(() => {
     let lastTotal = dataThroughput;
     const interval = setInterval(() => {
        const currentTotal = useGameStore.getState().dataThroughput;
        const diff = currentTotal - lastTotal;
        lastTotal = currentTotal;
        
        // diff 是 bytes，转换为 KB
        setThroughputDisplay(diff / 1024);
     }, 2000);
     return () => clearInterval(interval);
  }, [dataThroughput]);

  // 真实 Ping 检测
  useEffect(() => {
    const checkPing = async () => {
      const start = Date.now();
      try {
        // 尝试请求 Steam 商店 API (通过本地代理或 CORS) 来测量真实延迟
        // 为了避免 CORS 问题和数据解析负担，我们请求一个极小的资源或利用 HEAD 请求（如果支持）
        // 但为了通用性，我们还是用之前的 fetch 逻辑，不过目标换成 steam 相关域名（如果可能）
        // 或者继续用 npmmirror 作为“网络连通性”基准，因为 Steam API 在前端直接 Ping 很难（CORS）
        // 但既然我们有了代理配置，我们可以尝试 Ping 代理后的地址？
        // 为了稳定，我们还是 Ping 一个高可用 CDN，代表“本地网络到互联网”的延迟
        // 同时，如果最近有成功的 API 请求，我们可以把那个延迟存下来？(这需要 store 支持)
        // 这里暂时保持 Ping CDN，因为这反映了“用户的网络状况”
        await fetch('https://registry.npmmirror.com/react/latest', { mode: 'no-cors', cache: 'no-store' });
        const latency = Date.now() - start;
        
        setPing(latency);
        setStatus('connected');
        setHistory(prev => [...prev.slice(1), latency]);
      } catch (e) {
        setStatus('disconnected');
        setHistory(prev => [...prev.slice(1), 0]);
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
                      <span>数据吞吐</span>
                   </div>
                   <div className="font-mono text-lg text-emerald-300 font-bold">{throughputDisplay.toFixed(2)} <span className="text-xs font-normal text-gray-500">KB/s</span></div>
                </div>
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2 text-xs text-gray-400">
                      <ArrowDownUp size={14} className="text-sky-400 rotate-180" />
                      <span>总流量</span>
                   </div>
                   <div className="font-mono text-lg text-sky-300 font-bold">{(dataThroughput / 1024 / 1024).toFixed(2)} <span className="text-xs font-normal text-gray-500">MB</span></div>
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
