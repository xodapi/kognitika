import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsModuleRegistry, type AnalyticsModuleDefinition } from '../server/services/game-save/analytics-module-definition.ts';
import {
  SchulteAnalyticsModule,
  StroopAnalyticsModule,
  NBackAnalyticsModule,
} from '../server/services/game-save/analytics-modules.ts';
import { getAnalyticsModuleRegistry, resetAnalyticsModuleRegistry } from '../server/services/game-save/analytics-registry-factory.ts';

describe('AnalyticsModuleRegistry', () => {
  let registry: AnalyticsModuleRegistry;

  beforeEach(() => {
    registry = new AnalyticsModuleRegistry();
  });

  describe('register', () => {
    it('registers a new module', () => {
      const module = new SchulteAnalyticsModule();
      registry.register(module);
      
      expect(registry.findByModuleId('schulte')).toBe(module);
    });

    it('throws when registering duplicate moduleId', () => {
      registry.register(new SchulteAnalyticsModule());
      
      expect(() => registry.register(new SchulteAnalyticsModule()))
        .toThrow("Analytics module 'schulte' is already registered");
    });
  });

  describe('findByModuleId', () => {
    it('returns module when found', () => {
      const module = new StroopAnalyticsModule();
      registry.register(module);
      
      expect(registry.findByModuleId('stroop')).toBe(module);
    });

    it('returns undefined when not found', () => {
      expect(registry.findByModuleId('nonexistent')).toBeUndefined();
    });
  });

  describe('findByGameType', () => {
    beforeEach(() => {
      registry.register(new SchulteAnalyticsModule());
      registry.register(new StroopAnalyticsModule());
      registry.register(new NBackAnalyticsModule());
    });

    it('finds module by exact game type', () => {
      const module = registry.findByGameType('STROOP');
      expect(module?.moduleId).toBe('stroop');
    });

    it('finds module for Schulte variations', () => {
      expect(registry.findByGameType('SCHULTE')?.moduleId).toBe('schulte');
      expect(registry.findByGameType('SCHULTE_GORBOV')?.moduleId).toBe('schulte');
    });

    it('returns undefined for unsupported game type', () => {
      expect(registry.findByGameType('UNKNOWN_GAME')).toBeUndefined();
    });

    it('returns first matching module when multiple could match', () => {
      // This shouldn't happen in practice, but tests the behavior
      const customModule: AnalyticsModuleDefinition = {
        moduleId: 'custom',
        supports: () => true,
      };
      registry.register(customModule);
      
      const found = registry.findByGameType('STROOP');
      expect(found).toBeDefined();
    });
  });

  describe('getModuleIds', () => {
    it('returns empty array for empty registry', () => {
      expect(registry.getModuleIds()).toEqual([]);
    });

    it('returns all registered module IDs', () => {
      registry.register(new SchulteAnalyticsModule());
      registry.register(new StroopAnalyticsModule());
      registry.register(new NBackAnalyticsModule());
      
      const ids = registry.getModuleIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('schulte');
      expect(ids).toContain('stroop');
      expect(ids).toContain('nback');
    });
  });
});

describe('Analytics module implementations', () => {
  describe('SchulteAnalyticsModule', () => {
    it('supports SCHULTE and SCHULTE_GORBOV', () => {
      const module = new SchulteAnalyticsModule();
      expect(module.supports('SCHULTE')).toBe(true);
      expect(module.supports('SCHULTE_GORBOV')).toBe(true);
      expect(module.supports('STROOP')).toBe(false);
    });
  });

  describe('StroopAnalyticsModule', () => {
    it('supports only STROOP', () => {
      const module = new StroopAnalyticsModule();
      expect(module.supports('STROOP')).toBe(true);
      expect(module.supports('SCHULTE')).toBe(false);
    });
  });

  describe('NBackAnalyticsModule', () => {
    it('supports only N_BACK', () => {
      const module = new NBackAnalyticsModule();
      expect(module.supports('N_BACK')).toBe(true);
      expect(module.supports('STROOP')).toBe(false);
    });
  });
});

describe('getAnalyticsModuleRegistry', () => {
  beforeEach(() => {
    resetAnalyticsModuleRegistry();
  });

  it('returns a singleton registry', () => {
    const registry1 = getAnalyticsModuleRegistry();
    const registry2 = getAnalyticsModuleRegistry();
    
    expect(registry1).toBe(registry2);
  });

  it('registers all 15 core modules on first call', () => {
    const registry = getAnalyticsModuleRegistry();
    const moduleIds = registry.getModuleIds();
    
    expect(moduleIds).toHaveLength(15);
    expect(moduleIds).toContain('schulte');
    expect(moduleIds).toContain('stroop');
    expect(moduleIds).toContain('nback');
    expect(moduleIds).toContain('numerical');
    expect(moduleIds).toContain('logical-sequence');
    expect(moduleIds).toContain('mental-math');
    expect(moduleIds).toContain('situational');
    expect(moduleIds).toContain('spatial');
    expect(moduleIds).toContain('stroop-alphabet');
    expect(moduleIds).toContain('schulte-90');
    expect(moduleIds).toContain('alphabet-table');
    expect(moduleIds).toContain('collision');
    expect(moduleIds).toContain('dispatcher');
    expect(moduleIds).toContain('topology');
    expect(moduleIds).toContain('typing');
  });

  it('supports lookup by all registered game types', () => {
    const registry = getAnalyticsModuleRegistry();
    
    expect(registry.findByGameType('SCHULTE')).toBeDefined();
    expect(registry.findByGameType('SCHULTE_GORBOV')).toBeDefined();
    expect(registry.findByGameType('STROOP')).toBeDefined();
    expect(registry.findByGameType('N_BACK')).toBeDefined();
    expect(registry.findByGameType('NUMERICAL_ANALYSIS')).toBeDefined();
    expect(registry.findByGameType('LOGICAL_SEQUENCE')).toBeDefined();
    expect(registry.findByGameType('MENTAL_MATH')).toBeDefined();
    expect(registry.findByGameType('SITUATIONAL_JUDGMENT')).toBeDefined();
    expect(registry.findByGameType('SPATIAL_CONCEALMENT')).toBeDefined();
    expect(registry.findByGameType('STROOP_ALPHABET')).toBeDefined();
    expect(registry.findByGameType('SCHULTE_90')).toBeDefined();
    expect(registry.findByGameType('ALPHABET_TABLE')).toBeDefined();
    expect(registry.findByGameType('COLLISION_DETECTOR')).toBeDefined();
    expect(registry.findByGameType('ASYNC_DISPATCHER')).toBeDefined();
    expect(registry.findByGameType('TOPOLOGY_MEMORY')).toBeDefined();
    expect(registry.findByGameType('SPEED_TYPING')).toBeDefined();
  });

  it('resets the singleton when resetAnalyticsModuleRegistry is called', () => {
    const registry1 = getAnalyticsModuleRegistry();
    resetAnalyticsModuleRegistry();
    const registry2 = getAnalyticsModuleRegistry();
    
    expect(registry1).not.toBe(registry2);
  });
});
