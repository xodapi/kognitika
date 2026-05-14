import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion } from 'motion/react';

interface ClickData {
  num: number;
  reactionTimeMs: number;
  color: string;
}

interface ConcentrationCurveProps {
  data: ClickData[];
}

export function ConcentrationCurve({ data }: ConcentrationCurveProps) {
  // Format data for Recharts
  const chartData = data.map((d, index) => ({
    name: d.num,
    index: index + 1,
    time: d.reactionTimeMs / 1000, // convert to seconds
    color: d.color
  }));

  const avgTime = chartData.reduce((acc, d) => acc + d.time, 0) / chartData.length;

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="flex justify-between items-end px-2">
        <div>
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Кривая концентрации</h4>
          <p className="text-xs text-foreground font-bold italic opacity-70">Динамика скорости поиска (сек/число)</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-primary font-black uppercase tracking-tighter">Avg: {avgTime.toFixed(2)}s</span>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--primary-rgb), 0.1)" />
            <XAxis 
              dataKey="index" 
              hide={true}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} 
              axisLine={false}
              tickLine={false}
              unit="s"
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border p-3 rounded-xl shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Число {d.name}</p>
                      <p className="text-sm font-mono font-bold text-primary">{d.time.toFixed(2)}s</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="time" 
              stroke="var(--primary)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorTime)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between px-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-primary" />
           <span className="text-[8px] text-muted-foreground uppercase font-black">Скорость реакции</span>
        </div>
        <p className="text-[8px] text-muted-foreground uppercase font-medium italic">Ось X: Последовательность поиска</p>
      </div>
    </div>
  );
}
