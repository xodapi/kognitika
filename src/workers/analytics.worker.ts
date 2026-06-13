interface ClickEvent {
  cellId: number;
  reactionTimeMs: number;
}

// JS analytics kernel used behind a WASM-ready worker boundary.
const analyticsKernel = {
  suggest_next_difficulty: (avgTime: number, stability: number) => {
    const stable = stability < Math.max(250, avgTime * 0.2);
    return {
      next_grid_size: stable ? 5 : 4,
      noise_level: stable ? 0.1 : 0,
      rotation_enabled: stable,
      message: stable ? 'Можно немного усложнить режим' : 'Стабильный режим'
    };
  },
  analyze_session_data: (events: ClickEvent[]) => {
    const reactionTimes = events
      .map((event) => Number(event.reactionTimeMs))
      .filter((time) => Number.isFinite(time) && time >= 0);
    const average = reactionTimes.length
      ? reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length
      : 0;
    const variance = reactionTimes.length
      ? reactionTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / reactionTimes.length
      : 0;
    const stability = Math.sqrt(variance);
    const first = reactionTimes[0] ?? 0;
    const last = reactionTimes[reactionTimes.length - 1] ?? first;

    return {
      average_time: average,
      stability_index: stability,
      fatigability: last - first,
      reaction_consistency: average > 0 ? Math.max(0, 100 - (stability / average) * 100) : 100
    };
  }
};

self.onmessage = async (e) => {
  const { type, data } = e.data;
  
  if (type === 'SUGGEST_DIFFICULTY') {
    const { avgTime, stability } = data;
    const suggestion = analyticsKernel.suggest_next_difficulty(avgTime, stability);
    self.postMessage({ type: 'DIFFICULTY_SUGGESTION', payload: suggestion });
  }
  
  if (type === 'ANALYZE_SESSION') {
    const { events } = data;
    const clickEvents: ClickEvent[] = events.map((event: ClickEvent) => ({
      cellId: Number(event.cellId),
      reactionTimeMs: Number(event.reactionTimeMs)
    }));
    const analysis = analyticsKernel.analyze_session_data(clickEvents);
    self.postMessage({ type: 'SESSION_ANALYSIS', payload: analysis });
  }
};
