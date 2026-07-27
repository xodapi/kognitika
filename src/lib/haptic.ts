// Haptic feedback helpers for mobile interaction
export const haptic = {
  light: () => { if (navigator.vibrate) navigator.vibrate(10); },
  medium: () => { if (navigator.vibrate) navigator.vibrate(15); },
  error: () => { if (navigator.vibrate) navigator.vibrate([30, 30, 30]); },
  success: () => { if (navigator.vibrate) navigator.vibrate(15); },
};
