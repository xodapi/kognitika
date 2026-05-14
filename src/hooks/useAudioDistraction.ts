import { useState, useEffect } from 'react';

export function useAudioDistraction(distractionType: 'none' | 'audio' | 'visual' | 'chaos', isActive: boolean, currentTarget?: number) {
  useEffect(() => {
    if (!isActive || (distractionType !== 'audio' && distractionType !== 'chaos')) return;

    const synth = window.speechSynthesis;
    let interval: NodeJS.Timeout;

    const speak = () => {
      const texts = [
        'отвлекись', 
        'посмотри сюда', 
        'где цифра?', 
        'ты ошибешься', 
        'медленно', 
        'время идет',
        'не туда!',
        'внимательнее',
        'сосредоточься',
        'ищи красную',
        'следующая черная'
      ];
      
      const rand = Math.random();
      let text = '';
      
      if (rand > 0.6) {
        // Misleading number (NOT the current target)
        let falseNum = Math.floor(Math.random() * 25 + 1);
        while (falseNum === currentTarget) {
          falseNum = Math.floor(Math.random() * 25 + 1);
        }
        
        const variations = [
          `Нажми ${falseNum}`,
          `Где ${falseNum}?`,
          `Не нажимай ${falseNum}`,
          `${falseNum}! ${falseNum}!`,
          `Следующая ${falseNum}`
        ];
        text = variations[Math.floor(Math.random() * variations.length)];
      } else if (rand > 0.3) {
        // Random number to confuse
        text = Math.floor(Math.random() * 49 + 1).toString();
      } else {
        // Psychological pressure
        text = texts[Math.floor(Math.random() * texts.length)];
      }
      
      const utterThis = new SpeechSynthesisUtterance(text);
      utterThis.lang = 'ru-RU';
      utterThis.rate = 1.5; // Slightly faster to be more annoying
      utterThis.pitch = 0.6 + Math.random() * 0.8;
      
      const voices = synth.getVoices();
      const ruVoices = voices.filter(v => v.lang.startsWith('ru'));
      if (ruVoices.length > 0) {
        utterThis.voice = ruVoices[Math.floor(Math.random() * ruVoices.length)];
      }

      synth.speak(utterThis);
    };

    interval = setInterval(speak, 3000); // More frequent distractions

    return () => {
       clearInterval(interval);
       synth.cancel();
    };
  }, [isActive, distractionType, currentTarget]);
}
