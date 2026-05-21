// import * as wasm from '../../../packages/analytics-kernel/pkg/analytics_kernel';

// Mock implementation because Docker context doesn't have access to monorepo packages
const wasm = {
  suggest_next_difficulty: (avgTime: number, stability: number) => {
    console.log('Mocked suggest_next_difficulty called');
    return 1; // Default difficulty
  },
  analyze_session_data: (events: any[]) => {
    console.log('Mocked analyze_session_data called');
    return {
      score: 100,
      focus_level: 1.0,
      stability: 1.0,
      recommendation: "Продолжайте в том же духе (Mock)"
    };
  }
};

self.onmessage = async (e) => {
  const { type, data } = e.data;
  
  if (type === 'SUGGEST_DIFFICULTY') {
    const { avgTime, stability } = data;
    const suggestion = wasm.suggest_next_difficulty(avgTime, stability);
    self.postMessage({ type: 'DIFFICULTY_SUGGESTION', payload: suggestion });
  }
  
  if (type === 'ANALYZE_SESSION') {
    const { events } = data;
    const wasmEvents = events.map(e => ({
      cell: e.cellId,
      reaction_time: e.reactionTimeMs
    }));
    const analysis = wasm.analyze_session_data(wasmEvents);
    self.postMessage({ type: 'SESSION_ANALYSIS', payload: analysis });
  }
};
