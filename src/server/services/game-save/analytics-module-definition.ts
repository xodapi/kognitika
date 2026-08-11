/**
 * Defines the contract for an analytics module.
 * Each module represents a trainer or group of trainers that share analytics logic.
 */
export interface AnalyticsModuleDefinition {
  /** Unique module identifier (e.g., 'schulte', 'stroop') */
  readonly moduleId: string;

  /**
   * Returns true if this module handles analytics for the given game type.
   * @param gameType - The game type to check (e.g., 'SCHULTE', 'STROOP')
   */
  supports(gameType: string): boolean;
}

/**
 * Registry for analytics modules.
 * Provides lookup by moduleId or gameType.
 */
export class AnalyticsModuleRegistry {
  private modules = new Map<string, AnalyticsModuleDefinition>();

  /**
   * Registers a new analytics module.
   * @throws Error if moduleId is already registered
   */
  register(module: AnalyticsModuleDefinition): void {
    if (this.modules.has(module.moduleId)) {
      throw new Error(`Analytics module '${module.moduleId}' is already registered`);
    }
    this.modules.set(module.moduleId, module);
  }

  /**
   * Finds a module by its moduleId.
   * @returns The module definition or undefined if not found
   */
  findByModuleId(moduleId: string): AnalyticsModuleDefinition | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Finds a module that supports the given game type.
   * @returns The first matching module or undefined if none found
   */
  findByGameType(gameType: string): AnalyticsModuleDefinition | undefined {
    for (const module of this.modules.values()) {
      if (module.supports(gameType)) {
        return module;
      }
    }
    return undefined;
  }

  /**
   * Returns all registered module IDs.
   */
  getModuleIds(): string[] {
    return Array.from(this.modules.keys());
  }
}
