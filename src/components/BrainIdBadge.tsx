import { useState } from 'react';
import { Copy, Check, Brain, ShieldCheck } from 'lucide-react';

export function BrainIdBadge({ brainId, pseudonym }: { brainId: string; pseudonym: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(brainId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-primary uppercase font-black tracking-widest leading-none">Brain ID</p>
            <p className="text-xs font-bold text-foreground">{pseudonym}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">
          <ShieldCheck className="w-3 h-3" />
          <span className="text-[9px] font-bold uppercase">152-ФЗ OK</span>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-background/50 border border-border p-2 rounded-xl relative z-10">
        <code className="text-[10px] font-mono text-muted-foreground truncate flex-1">{brainId}</code>
        <button 
          onClick={copy}
          className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors"
          title="Копировать ID"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
