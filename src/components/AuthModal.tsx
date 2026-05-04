import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { X } from 'lucide-react';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login' ? { email, password } : { email, password, name };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Ошибка авторизации');
        setLoading(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative bg-card w-full max-w-sm p-6 rounded-3xl border border-border shadow-2xl animate-in zoom-in-95 duration-200">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-primary/20 border border-primary/50 text-primary rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary rotate-45"></div>
          </div>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-center text-foreground mb-6 uppercase">
          {mode === 'login' ? 'Вход в Когнитику' : 'Регистрация'}
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 tracking-widest">Имя или Никнейм</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="ivan_neuro"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] text-muted-foreground uppercase mb-1 tracking-widest">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground uppercase mb-1 tracking-widest">Пароль</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {error && <div className="text-destructive text-[11px] uppercase tracking-wide text-center bg-destructive/10 p-2 rounded-lg border border-destructive/20">{error}</div>}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 px-4 py-4 bg-primary text-primary-foreground text-xs uppercase tracking-widest rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Загрузка...' : (mode === 'login' ? 'Войти в профиль' : 'Создать аккаунт')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-border pt-4">
          <button 
            type="button" 
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}
