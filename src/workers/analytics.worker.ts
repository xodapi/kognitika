import * as wasm from '../../../../packages/analytics-kernel/pkg/analytics_kernel';

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
