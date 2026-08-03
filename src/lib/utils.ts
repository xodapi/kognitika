type ClassValue = string | number | boolean | null | undefined | ClassValue[] | Record<string, boolean | null | undefined>;

/**
 * Joins conditional class values without a runtime dependency.
 *
 * The production bundle threw inside the shared `cn` helper for Card/Button
 * consumers. Keeping this small implementation local makes class composition
 * deterministic while a dependency upgrade is evaluated with regression tests.
 */
export function cn(...inputs: ClassValue[]) {
  const classes: string[] = [];

  const append = (value: ClassValue): void => {
    if (typeof value === 'string' || typeof value === 'number') {
      classes.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(append);
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([className, enabled]) => {
        if (enabled) classes.push(className);
      });
    }
  };

  inputs.forEach(append);
  return classes.join(' ');
}
