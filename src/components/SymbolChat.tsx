import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Hash, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { io, Socket } from 'socket.io-client';

const SYMBOLS = ['Σ', 'Δ', 'Ω', 'Ψ', 'Φ', 'Γ', 'Θ', 'Ξ', 'Π', 'ℝ', 'ℂ', 'ℚ', 'ℕ', 'ℤ', '∮', '∇', '∃', '∀', '∈', '∉'];

interface Message {
  id?: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: string | Date;
  isSymbol?: boolean;
}

export function SymbolChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showSymbols, setShowSymbols] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io();
    socketRef.current.emit('joinRoom', 'global');

    socketRef.current.on('newMessage', (msg: Message) => {
      setMessages(prev => [...prev.slice(-49), {
        ...msg,
        isSymbol: SYMBOLS.some(s => msg.content.includes(s))
      }]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    socketRef.current?.emit('sendMessage', {
      content: input,
      userId: user?.id || 'anon',
      userName: user?.name || 'Гость',
      room: 'global'
    });

    setInput('');
  };

  const addSymbol = (symbol: string) => {
    setInput(prev => prev + symbol);
    setShowSymbols(false);
  };

  return (
    <div className="flex flex-col h-full bg-card/20 backdrop-blur-md border border-border rounded-3xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Когнитивный Поток</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Общий</span>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex flex-col ${msg.userId === (user?.id || 'anon') ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[8px] font-black uppercase text-muted-foreground">{msg.userName || 'Гость'}</span>
                <span className="text-[8px] text-muted-foreground/50">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-[90%] break-words shadow-sm border ${
                msg.userId === (user?.id || 'anon') 
                  ? 'bg-primary text-white border-primary shadow-primary/20 rounded-tr-none text-right' 
                  : 'bg-secondary text-foreground border-border rounded-tl-none text-left'
              } ${msg.isSymbol ? 'font-mono text-sm tracking-widest' : ''}`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-secondary/20 border-t border-border">
        <div className="relative mb-2">
          <AnimatePresence>
            {showSymbols && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-card border border-border rounded-xl shadow-2xl grid grid-cols-5 gap-1 z-50"
              >
                {SYMBOLS.map(s => (
                  <button 
                    key={s} 
                    onClick={() => addSymbol(s)}
                    className="aspect-square flex items-center justify-center text-sm hover:bg-primary/20 hover:text-primary rounded-lg transition-colors font-mono"
                  >
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowSymbols(!showSymbols)}
            className={`p-2 rounded-xl transition-all ${showSymbols ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'}`}
          >
            <Hash className="w-4 h-4" />
          </button>
          
          <div className="flex-1 relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Введите сообщение..."
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
