/**
 * Module: Архитектура контекста (Топологическая память)
 * Тренирует удержание в рабочей памяти многомерных графовых структур.
 * Паттерн: useEngine + EventBus (EDA-стандарт платформы)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { emitEvent } from './useEventBus';

export type NodeState = 'idle' | 'active' | 'error' | 'success' | 'warning';
export type NodeId = string;

export interface TopologyNode {
  id: NodeId;
  label: string;
  state: NodeState;
  x: number; // 0-100 normalized
  y: number; // 0-100 normalized
}

export interface TopologyEdge {
  from: NodeId;
  to: NodeId;
}

export interface ChangeEvent {
  type: 'STATE_CHANGE' | 'SIGNAL_SENT' | 'COLLISION';
  nodeId: NodeId;
  newState?: NodeState;
  description: string;
}

type Phase = 'memorize' | 'events' | 'answer' | 'result';

export interface TopologyState {
  phase: Phase;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  events: ChangeEvent[];
  currentEventIdx: number;
  userAnswers: Record<NodeId, NodeState>;
  timeMs: number;
  score: number;
  maxScore: number;
  level: number;
  memorizeTimeLeft: number; // seconds
  isFinished: boolean;
}

// --- Scenario generator ---
const NODE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const STATES: NodeState[] = ['idle', 'active', 'error', 'success', 'warning'];

function generateScenario(level: number): { nodes: TopologyNode[]; edges: TopologyEdge[]; events: ChangeEvent[] } {
  const nodeCount = Math.min(5 + level, 9);
  const nodes: TopologyNode[] = [];

  // Place nodes in a circle-ish layout
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * 2 * Math.PI;
    nodes.push({
      id: NODE_LABELS[i],
      label: NODE_LABELS[i],
      state: 'idle',
      x: 50 + 38 * Math.cos(angle),
      y: 50 + 38 * Math.sin(angle),
    });
  }

  // Edges: ~1.5 per node
  const edges: TopologyEdge[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const target = (i + 1) % nodeCount;
    edges.push({ from: NODE_LABELS[i], to: NODE_LABELS[target] });
  }
  if (level > 1 && nodeCount > 4) {
    edges.push({ from: NODE_LABELS[0], to: NODE_LABELS[Math.floor(nodeCount / 2)] });
  }

  // Events: 2 + level changes
  const eventCount = Math.min(2 + level, 5);
  const events: ChangeEvent[] = [];
  const workingNodes = [...nodes];

  for (let e = 0; e < eventCount; e++) {
    const targetIdx = e % workingNodes.length;
    const node = workingNodes[targetIdx];
    const newState = STATES[1 + (e % (STATES.length - 1))]; // skip 'idle'
    const prevState = node.state;
    node.state = newState;

    const descriptions: Record<NodeState, string> = {
      active: `Узел ${node.label} получил сигнал и стал активным`,
      error: `Узел ${node.label} зафиксировал критическую ошибку`,
      success: `Узел ${node.label} завершил обработку успешно`,
      warning: `Узел ${node.label} перешёл в режим предупреждения`,
      idle: `Узел ${node.label} сброшен в исходное состояние`,
    };

    events.push({
      type: prevState === 'active' && newState === 'error' ? 'COLLISION' : 'STATE_CHANGE',
      nodeId: node.label,
      newState,
      description: descriptions[newState],
    });
  }

  return { nodes: nodes.map(n => ({ ...n, state: 'idle' })), edges, events };
}

const MEMORIZE_SECONDS = 5;

export function useTopologyEngine() {
  const [state, setState] = useState<TopologyState>({
    phase: 'memorize',
    nodes: [],
    edges: [],
    events: [],
    currentEventIdx: 0,
    userAnswers: {},
    timeMs: 0,
    score: 0,
    maxScore: 0,
    level: 1,
    memorizeTimeLeft: MEMORIZE_SECONDS,
    isFinished: false,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memorizeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (memorizeRef.current) clearInterval(memorizeRef.current);
  }, []);

  const startGame = useCallback((level: number = 1) => {
    const scenario = generateScenario(level);
    startTimeRef.current = Date.now();

    // Apply final states to compute correct answers upfront
    const finalNodes = scenario.nodes.map(n => ({ ...n }));
    scenario.events.forEach(ev => {
      const node = finalNodes.find(n => n.id === ev.nodeId);
      if (node && ev.newState) node.state = ev.newState;
    });

    setState({
      phase: 'memorize',
      nodes: finalNodes, // show final states during memorize? No — show initial
      edges: scenario.edges,
      events: scenario.events,
      currentEventIdx: 0,
      userAnswers: {},
      timeMs: 0,
      score: 0,
      maxScore: scenario.nodes.length,
      level,
      memorizeTimeLeft: MEMORIZE_SECONDS,
      isFinished: false,
    });

    // Reset nodes to initial state for display during memorize
    setState(prev => ({ ...prev, nodes: scenario.nodes }));

    // Countdown memorize phase
    let timeLeft = MEMORIZE_SECONDS;
    memorizeRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearInterval(memorizeRef.current!);
        // Start events phase
        setState(prev => ({
          ...prev,
          memorizeTimeLeft: 0,
          phase: 'events',
          currentEventIdx: 0,
        }));
        startTimeRef.current = Date.now();
        // Start main timer
        timerRef.current = setInterval(() => {
          setState(prev => ({ ...prev, timeMs: Date.now() - startTimeRef.current }));
        }, 100);
      } else {
        setState(prev => ({ ...prev, memorizeTimeLeft: timeLeft }));
      }
    }, 1000);
  }, []);

  const nextEvent = useCallback(() => {
    setState(prev => {
      if (prev.currentEventIdx >= prev.events.length - 1) {
        // Move to answer phase — show nodes with blank states
        const answerNodes = prev.nodes.map(n => ({ ...n, state: 'idle' as NodeState }));
        return { ...prev, phase: 'answer', nodes: answerNodes };
      }
      return { ...prev, currentEventIdx: prev.currentEventIdx + 1 };
    });
  }, []);

  const setNodeAnswer = useCallback((nodeId: NodeId, state: NodeState) => {
    setState(prev => ({
      ...prev,
      userAnswers: { ...prev.userAnswers, [nodeId]: state },
    }));
  }, []);

  const submitAnswers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    setState(prev => {
      // Rebuild final state
      const finalStates: Record<NodeId, NodeState> = {};
      prev.nodes.forEach(n => { finalStates[n.id] = 'idle'; });
      prev.events.forEach(ev => {
        if (ev.newState) finalStates[ev.nodeId] = ev.newState;
      });

      let correct = 0;
      Object.entries(finalStates).forEach(([id, correctState]) => {
        if (prev.userAnswers[id] === correctState) correct++;
      });

      const timeMs = Date.now() - startTimeRef.current;
      emitEvent('TRAINING_COMPLETE', {
        type: 'SCHULTE', // reuse schema type for now
        timeMs,
        score: correct,
        level: prev.level,
        metadata: { module: 'topology', correct, total: prev.maxScore },
      });

      return {
        ...prev,
        phase: 'result',
        score: correct,
        timeMs,
        isFinished: true,
      };
    });
  }, []);

  const nextLevel = useCallback(() => {
    setState(prev => {
      const nl = prev.level + 1;
      startGame(nl);
      return prev; // startGame will reset
    });
  }, [startGame]);

  return { state, startGame, nextEvent, setNodeAnswer, submitAnswers, nextLevel };
}
