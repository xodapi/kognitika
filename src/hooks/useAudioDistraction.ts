import { useState, useEffect } from 'react';

export function useAudioDistraction(distractionType: 'none' | 'audio' | 'visual' | 'chaos', isActive: boolean) {
  useEffect(() => {
    if (!isActive || (distractionType !== 'audio' && distractionType !== 'chaos')) return;

    // Use Speech Synthesis as distraction
    const synth = window.speechSynthesis;
    let interval: NodeJS.Timeout;

    const speak = () => {
      const texts = ['отвлекись', 'посмотри сюда', 'где цифра?', 'ты ошибешься', 'медленно', 'время идет'];
      const text = texts[Math.floor(Math.random() * texts.length)];
      const utterThis = new SpeechSynthesisUtterance(text);
      utterThis.lang = 'ru-RU';
      utterThis.rate = 1.2;
      synth.speak(utterThis);
    };

    interval = setInterval(speak, 3000);

    return () => {
       clearInterval(interval);
       synth.cancel();
    };
  }, [isActive, distractionType]);
}
