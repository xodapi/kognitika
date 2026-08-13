import { AnalyticsModuleDefinition } from './analytics-module-definition.ts';

/** Schulte tables (Schulte and Gorbov variations) */
export class SchulteAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'schulte';
  supports(gameType: string): boolean {
    return ['SCHULTE', 'SCHULTE_GORBOV'].includes(gameType);
  }
}

/** Stroop effect test */
export class StroopAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'stroop';
  supports(gameType: string): boolean {
    return gameType === 'STROOP';
  }
}

/** N-back working memory test */
export class NBackAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'nback';
  supports(gameType: string): boolean {
    return gameType === 'N_BACK';
  }
}

/** Numerical analysis test */
export class NumericalAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'numerical';
  supports(gameType: string): boolean {
    return gameType === 'NUMERICAL_ANALYSIS';
  }
}

/** Logical sequence pattern matching */
export class LogicalSequenceAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'logical-sequence';
  supports(gameType: string): boolean {
    return gameType === 'LOGICAL_SEQUENCE';
  }
}

/** Mental math calculations */
export class MentalMathAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'mental-math';
  supports(gameType: string): boolean {
    return gameType === 'MENTAL_MATH';
  }
}

/** Situational judgment test */
export class SituationalAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'situational';
  supports(gameType: string): boolean {
    return gameType === 'SITUATIONAL_JUDGMENT';
  }
}

/** Spatial concealment test */
export class SpatialAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'spatial';
  supports(gameType: string): boolean {
    return gameType === 'SPATIAL_CONCEALMENT';
  }
}

/** Stroop alphabet variation */
export class StroopAlphabetAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'stroop-alphabet';
  supports(gameType: string): boolean {
    return gameType === 'STROOP_ALPHABET';
  }
}

/** Schulte 90-degree rotation */
export class Schulte90AnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'schulte-90';
  supports(gameType: string): boolean {
    return gameType === 'SCHULTE_90';
  }
}

/** Alphabet table navigation */
export class AlphabetTableAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'alphabet-table';
  supports(gameType: string): boolean {
    return gameType === 'ALPHABET_TABLE';
  }
}

/** Collision detector test */
export class CollisionAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'collision';
  supports(gameType: string): boolean {
    return gameType === 'COLLISION_DETECTOR';
  }
}

/** Async dispatcher task management */
export class DispatcherAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'dispatcher';
  supports(gameType: string): boolean {
    return gameType === 'ASYNC_DISPATCHER';
  }
}

/** Topology memory test */
export class TopologyAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'topology';
  supports(gameType: string): boolean {
    return gameType === 'TOPOLOGY_MEMORY';
  }
}

/** Speed typing test */
export class TypingAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'typing';
  supports(gameType: string): boolean {
    return gameType === 'SPEED_TYPING';
  }
}

/** Inhibitory control under distracting stimuli */
export class NoiseReductionAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'noise-reduction';
  supports(gameType: string): boolean {
    return gameType === 'NOISE_REDUCTION';
  }
}

/** Fact selection under semantic distortion */
export class DecryptorAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'decryptor';
  supports(gameType: string): boolean {
    return gameType === 'DECRYPTOR';
  }
}

/** Semantic hallucination classification */
export class RealityCheckAnalyticsModule implements AnalyticsModuleDefinition {
  readonly moduleId = 'reality-check';
  supports(gameType: string): boolean {
    return gameType === 'REALITY_CHECK';
  }
}
