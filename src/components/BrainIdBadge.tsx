import { useState } from 'react';
import { Copy, Check, Brain, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export function BrainIdBadge({ brainId, pseudonym }: { brainId: string; pseudonym: string }) {
  const [copied, setCopied] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const maskedBrainId = brainId.length > 6 ? `•••• •••• ${brainId.slice(-6)}` : 'Brain ID скрыт';

  const copy = () => {
    navigator.clipboard.writeText(brainId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-primary uppercase font-black tracking-widest leading-none">Brain ID</p>
            <p className="text-xs font-bold text-foreground">{pseudonym}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" />
          <span className="text-[9px] font-bold uppercase">Профиль защищен</span>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-background/50 border border-border p-2 rounded-xl">
        <code className="text-[10px] font-mono text-muted-foreground truncate flex-1">
          {isRevealed ? brainId : maskedBrainId}
        </code>
        <button
          type="button"
          onClick={() => setIsRevealed(value => !value)}
          className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors"
          title={isRevealed ? 'Скрыть Brain ID' : 'Показать Brain ID'}
          aria-label={isRevealed ? 'Скрыть Brain ID' : 'Показать Brain ID'}
        >
          {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
        <button 
          type="button"
          onClick={copy}
          className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors"
          title="Копировать ID"
          aria-label="Копировать Brain ID"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Полный Brain ID скрыт на экране. Сохраняйте его только в личном менеджере паролей или другом защищенном месте.
      </p>
    </div>
  );
}
