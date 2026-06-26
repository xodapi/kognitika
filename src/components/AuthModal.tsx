import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { X, Copy, Check, Brain, Key } from 'lucide-react';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [brainIdInput, setBrainIdInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successBrainId, setSuccessBrainId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { login } = useAuth();

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBrainInit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/brain', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to init');
      
      setSuccessBrainId(data.brainId);
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brainId: brainIdInput.trim() })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Ошибка авторизации');
        return;
      }
      
      login(data.token, data.user);
      onClose();
    } catch (err) {
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  };

  if (successBrainId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
        <div className="relative bg-card w-full max-w-sm p-8 rounded-[2rem] border border-primary/20 shadow-2xl text-center">
          <div className="w-20 h-20 bg-primary/10 border border-primary/30 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Brain className="w-10 h-10" />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight mb-2 uppercase">Сессия создана</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Это ваш уникальный Brain ID. Сохраните его, чтобы восстановить прогресс. Мы не храним ваши персональные данные.
          </p>
          
          <div className="bg-secondary/50 p-4 rounded-2xl border border-border flex items-center justify-between gap-3 mb-8 group transition-all hover:border-primary/50">
            <code className="text-xs font-mono text-primary break-all select-all">{successBrainId}</code>
        <button 
          onClick={() => copyToClipboard(successBrainId)}
          aria-label="Копировать Brain ID"
          className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
          >
            Начать тренировку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative bg-card w-full max-w-sm p-6 rounded-[2rem] border border-border shadow-2xl animate-in zoom-in-95 duration-200">
        
        <button 
          onClick={onClose} 
          aria-label="Закрыть"
          className="absolute top-6 right-6 p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-inner">
            <Brain className="w-7 h-7" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 bg-secondary/30 p-3 rounded-xl mb-8 text-primary border border-primary/10">
          <Key className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Brain ID доступ</span>
        </div>
        
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold tracking-tight uppercase">Анонимный доступ</h3>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Тренируйтесь без пароля и email. Весь прогресс привязан к Brain ID.
            </p>
          </div>

          <button 
            onClick={handleBrainInit}
            disabled={loading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Начать новую сессию'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
            <div className="relative flex justify-center text-[9px] uppercase tracking-tighter"><span className="bg-card px-2 text-muted-foreground">Или восстановить</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="text" 
              value={brainIdInput} 
              onChange={e => setBrainIdInput(e.target.value)} 
              required 
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-primary transition-all text-center"
              placeholder="Введите ваш Brain ID"
              autoComplete="off"
            />
            <button 
              type="submit" 
              disabled={loading || !brainIdInput.trim()}
              className="w-full py-3 bg-secondary text-foreground rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-secondary/80 transition-all disabled:opacity-50"
            >
              Возобновить прогресс
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-4 text-destructive text-[10px] uppercase tracking-wide text-center bg-destructive/10 p-3 rounded-xl border border-destructive/20 animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <p className="mt-8 text-[9px] text-center text-muted-foreground uppercase tracking-tighter leading-relaxed">
          Используя сервис, вы соглашаетесь с тем, что мы <span className="text-primary">не собираем</span> ваши персональные данные в соответствии со 152-ФЗ.
        </p>
      </div>
    </div>
  );
}
