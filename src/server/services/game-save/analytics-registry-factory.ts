import { AnalyticsModuleRegistry } from './analytics-module-definition.ts';
import {
  SchulteAnalyticsModule,
  StroopAnalyticsModule,
  NBackAnalyticsModule,
  NumericalAnalyticsModule,
  LogicalSequenceAnalyticsModule,
  MentalMathAnalyticsModule,
  SituationalAnalyticsModule,
  SpatialAnalyticsModule,
  StroopAlphabetAnalyticsModule,
  Schulte90AnalyticsModule,
  AlphabetTableAnalyticsModule,
  CollisionAnalyticsModule,
  DispatcherAnalyticsModule,
  TopologyAnalyticsModule,
  TypingAnalyticsModule,
  NoiseReductionAnalyticsModule,
  DecryptorAnalyticsModule,
  RealityCheckAnalyticsModule,
  LanguageScannerAnalyticsModule,
} from './analytics-modules.ts';

export const CANONICAL_ANALYTICS_MODULE_IDS = [
  'schulte',
  'stroop',
  'nback',
  'numerical',
  'logical-sequence',
  'mental-math',
  'situational',
  'spatial',
  'stroop-alphabet',
  'schulte-90',
  'alphabet-table',
  'collision',
  'dispatcher',
  'topology',
  'typing',
  'noise-reduction',
  'decryptor',
  'reality-check',
  'language-scanner',
] as const;

let _registry: AnalyticsModuleRegistry | null = null;

/**
 * Returns the global analytics module registry, creating it on first call.
 * All collector-backed trainers are registered by default.
 */
export function getAnalyticsModuleRegistry(): AnalyticsModuleRegistry {
  if (!_registry) {
    _registry = new AnalyticsModuleRegistry();
    
    // Register all core modules
    _registry.register(new SchulteAnalyticsModule());
    _registry.register(new StroopAnalyticsModule());
    _registry.register(new NBackAnalyticsModule());
    _registry.register(new NumericalAnalyticsModule());
    _registry.register(new LogicalSequenceAnalyticsModule());
    _registry.register(new MentalMathAnalyticsModule());
    _registry.register(new SituationalAnalyticsModule());
    _registry.register(new SpatialAnalyticsModule());
    _registry.register(new StroopAlphabetAnalyticsModule());
    _registry.register(new Schulte90AnalyticsModule());
    _registry.register(new AlphabetTableAnalyticsModule());
    _registry.register(new CollisionAnalyticsModule());
    _registry.register(new DispatcherAnalyticsModule());
    _registry.register(new TopologyAnalyticsModule());
    _registry.register(new TypingAnalyticsModule());
    _registry.register(new NoiseReductionAnalyticsModule());
    _registry.register(new DecryptorAnalyticsModule());
    _registry.register(new RealityCheckAnalyticsModule());
    _registry.register(new LanguageScannerAnalyticsModule());
  }
  
  return _registry;
}

/**
 * Resets the global registry (used in tests).
 */
export function resetAnalyticsModuleRegistry(): void {
  _registry = null;
}
