import { motion, AnimatePresence } from 'motion/react';
import { useTopologyEngine, NodeState, NodeId } from '../hooks/useTopologyEngine';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import { GitBranch, ChevronRight, CheckCircle } from 'lucide-react';
import { CompletionRecommendation } from './CompletionRecommendation';

const STATE_COLORS: Record<NodeState, string> = {
  idle:    'bg-secondary border-border text-muted-foreground',
  active:  'bg-blue-500/20 border-blue-500 text-blue-400',
  error:   'bg-red-500/20 border-red-500 text-red-400',
  success: 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
  warning: 'bg-amber-500/20 border-amber-500 text-amber-400',
};

const STATE_LABELS: Record<NodeState, string> = {
  idle:    'Ожидание',
  active:  'Активен',
  error:   'Ошибка',
  success: 'Успех',
  warning: 'Предупреждение',
};

const STATE_DOT: Record<NodeState, string> = {
  idle:    'bg-muted-foreground',
  active:  'bg-blue-400',
  error:   'bg-red-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
};

function NodeButton({ nodeId, currentState, onClick }: {
  nodeId: NodeId;
  currentState: NodeState;
  onClick: (state: NodeState) => void;
}) {
  const states: NodeState[] = ['idle', 'active', 'error', 'success', 'warning'];
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-mono font-bold text-muted-foreground uppercase">Узел {nodeId}</div>
      <div className="flex flex-wrap gap-1.5">
        {states.map(s => (
          <button
            key={s}
            onClick={() => onClick(s)}
            className={`px-2 py-1 text-[10px] font-bold border rounded-lg transition-all ${
              currentState === s
                ? STATE_COLORS[s] + ' ring-1 ring-current'
                : 'bg-card/40 border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {STATE_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

// SVG graph rendering
function GraphView({ nodes, edges, interactive, userAnswers, onSetAnswer }: {
  nodes: any[];
  edges: any[];
  interactive: boolean;
  userAnswers?: Record<NodeId, NodeState>;
  onSetAnswer?: (id: NodeId, s: NodeState) => void;
}) {
  const states: NodeState[] = ['idle', 'active', 'error', 'success', 'warning'];

  return (
    <div className="relative w-full" style={{ paddingBottom: '60%' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodes.find(n => n.id === e.from);
          const to = nodes.find(n => n.id === e.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke="rgba(148,163,184,0.3)"
              strokeWidth="0.8"
              markerEnd="url(#arrow)"
            />
          );
        })}
        <defs>
          <marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <path d="M0,0 L0,4 L4,2 z" fill="rgba(148,163,184,0.5)" />
          </marker>
        </defs>
        {/* Nodes */}
        {nodes.map(node => {
          const displayState: NodeState = interactive && userAnswers ? (userAnswers[node.id] || 'idle') : (node.state || 'idle');
          const dotClass = STATE_DOT[displayState];
          return (
            <g key={node.id}>
              <circle
                cx={node.x} cy={node.y} r="6.5"
                className="transition-all"
                fill={`rgba(${
                  displayState === 'active' ? '99,102,241' :
                  displayState === 'error' ? '239,68,68' :
                  displayState === 'success' ? '16,185,129' :
                  displayState === 'warning' ? '245,158,11' : '100,116,139'
                },0.15)`}
                stroke={`rgb(${
                  displayState === 'active' ? '99,102,241' :
                  displayState === 'error' ? '239,68,68' :
                  displayState === 'success' ? '16,185,129' :
                  displayState === 'warning' ? '245,158,11' : '100,116,139'
                })`}
                strokeWidth="1"
              />
              <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="4.5" fontWeight="bold" fill="white" fontFamily="monospace">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function TopologyMemory() {
  const { state, startGame, nextEvent, setNodeAnswer, submitAnswers, nextLevel } = useTopologyEngine();
  const { token } = useAuth();

  useEffect(() => {
    if (state.isFinished && token) {
      fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameType: 'TOPOLOGY_MEMORY',
          timeMs: state.timeMs,
          metadata: { score: state.score, maxScore: state.maxScore, level: state.level },
        }),
      }).catch(() => {});
    }
  }, [state.isFinished, token]);

  // Intro screen
  if (state.nodes.length === 0) {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-3 lg:col-span-8 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mb-6">
            <GitBranch className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Архитектура контекста</h2>
          <p className="text-sm text-muted-foreground mb-2 max-w-md">
            Запомни топологию графа. Система покажет цепочку изменений состояний — восстанови финальный вид.
          </p>
          <p className="text-xs text-indigo-400 font-mono mb-8">Тренирует: топологическая память · удержание контекста · графовое мышление</p>
          <button
            onClick={() => startGame(1)}
            className="px-8 py-3 bg-indigo-600 text-white text-xs uppercase font-bold rounded-xl hover:bg-indigo-500 transition-colors"
          >
            Начать уровень 1
          </button>
        </div>
      </div>
    );
  }

  // Memorize phase
  if (state.phase === 'memorize') {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-3 lg:col-span-8 bg-card/20 border border-border rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Фаза 1 — Запоминание</span>
            <motion.div
              key={state.memorizeTimeLeft}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-3xl font-mono font-black text-indigo-400"
            >
              {state.memorizeTimeLeft}с
            </motion.div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Запомни начальное состояние каждого узла и связи между ними.</p>
          <GraphView nodes={state.nodes} edges={state.edges} interactive={false} />
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(STATE_LABELS).map(([s, label]) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${STATE_DOT[s as NodeState]}`} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Events phase
  if (state.phase === 'events') {
    const ev = state.events[state.currentEventIdx];
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-3 lg:col-span-8 bg-card/20 border border-border rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Фаза 2 — События</span>
            <span className="text-xs text-muted-foreground font-mono">{state.currentEventIdx + 1} / {state.events.length}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={ev.nodeId + state.currentEventIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-background/80 border border-indigo-500/30 rounded-2xl p-6 mb-6 text-center"
            >
              <div className="text-[10px] uppercase tracking-widest text-indigo-400 mb-3 font-bold">
                {ev.type === 'COLLISION' ? '⚡ Коллизия' : '→ Событие'}
              </div>
              <p className="text-lg font-medium">{ev.description}</p>
            </motion.div>
          </AnimatePresence>
          <button
            onClick={nextEvent}
            className="flex items-center gap-2 self-center px-6 py-3 bg-indigo-600 text-white text-xs uppercase font-bold rounded-xl hover:bg-indigo-500 transition-colors"
          >
            {state.currentEventIdx < state.events.length - 1 ? 'Следующее событие' : 'Восстановить граф'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Answer phase
  if (state.phase === 'answer') {
    return (
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <div className="lg:col-start-2 lg:col-span-10 bg-card/20 border border-border rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Фаза 3 — Восстановление</span>
            <span className="text-xs text-muted-foreground">Расставь финальные состояния узлов</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.nodes.map(node => (
              <NodeButton
                key={node.id}
                nodeId={node.id}
                currentState={state.userAnswers[node.id] || 'idle'}
                onClick={(s) => setNodeAnswer(node.id, s)}
              />
            ))}
          </div>
          <button
            onClick={submitAnswers}
            className="flex items-center gap-2 self-center px-8 py-3 bg-emerald-600 text-white text-xs uppercase font-bold rounded-xl hover:bg-emerald-500 transition-colors mt-2"
          >
            <CheckCircle className="w-4 h-4" /> Подтвердить
          </button>
        </div>
      </div>
    );
  }

  // Result phase
  const pct = Math.round((state.score / state.maxScore) * 100);
  const grade = pct >= 90 ? 'Превосходно' : pct >= 70 ? 'Хорошо' : pct >= 50 ? 'Удовлетворительно' : 'Требует практики';

  return (
    <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
      <div className="lg:col-start-3 lg:col-span-8 bg-card/20 border border-border rounded-3xl p-8 flex flex-col items-center text-center">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4 font-bold">Результат</div>
        <div className="text-6xl font-black font-mono tabular-nums mb-2 text-indigo-400">
          {state.score}<span className="text-3xl text-muted-foreground">/{state.maxScore}</span>
        </div>
        <div className="text-sm font-bold mb-1">{grade}</div>
        <div className="text-xs text-muted-foreground mb-2">Точность: {pct}%</div>
        <div className="text-xs font-mono text-muted-foreground mb-8">Время: {(state.timeMs / 1000).toFixed(1)}с · Уровень {state.level}</div>
        <CompletionRecommendation
          sourceModuleId="topology"
          score={state.score}
          maxScore={state.maxScore}
          durationMs={state.timeMs}
          onRepeat={() => startGame(state.level)}
          className="max-w-3xl"
        />
        <div className="mt-4 flex gap-3">
          {pct >= 70 && (
            <button onClick={nextLevel} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors">
              Уровень {state.level + 1} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
