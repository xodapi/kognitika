import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Position,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MODULE_TITLES } from '../lib/practice-recommendations';

type DomainId = 'attention' | 'memory' | 'logic' | 'speed' | 'resilience';

const DOMAIN_LABELS: Record<DomainId, string> = {
  attention: 'Внимание',
  memory: 'Память',
  logic: 'Логика',
  speed: 'Скорость',
  resilience: 'Устойчивость',
};

const DOMAIN_COLORS: Record<DomainId, string> = {
  attention: '#818cf8',
  memory: '#34d399',
  logic: '#fbbf24',
  speed: '#f472b6',
  resilience: '#fb923c',
};

const MODULE_DOMAIN_MAP: Record<string, DomainId[]> = {
  schulte: ['attention', 'speed'],
  stroop: ['attention'],
  nback: ['attention', 'memory'],
  numerical: ['logic'],
  logical: ['logic'],
  spatial: ['memory'],
  topology: ['memory'],
  collision: ['speed', 'resilience'],
  dispatcher: ['resilience'],
  noise: ['attention', 'resilience'],
  typing: ['attention', 'speed'],
  scanner: ['logic'],
  decryptor: ['logic'],
  reality: ['logic'],
  objective: ['logic'],
  profiling: ['logic'],
  situational: ['logic'],
  dialogue: ['logic'],
  reframing: ['logic'],
  rejection: ['resilience'],
  storytelling: ['memory'],
  focus: ['attention'],
  silence: ['resilience'],
  filter: ['logic'],
  hype: ['logic'],
  'mental-math': ['logic'],
  'schulte-90': ['attention'],
  'alphabet-table': ['attention'],
  'stroop-alphabet': ['attention'],
};

const MODULE_CATEGORY: Record<string, 'cognitive' | 'somatic' | 'safety'> = {
  silence: 'somatic',
  scanner: 'safety', decryptor: 'safety', reality: 'safety',
  filter: 'safety', hype: 'safety', reframing: 'safety', rejection: 'safety',
};

const CATEGORY_ORDER: Record<string, number> = { cognitive: 0, safety: 1, somatic: 2 };
const CATEGORY_COLORS: Record<string, string> = {
  cognitive: 'rgb(99, 102, 241)',
  safety: 'rgb(245, 158, 11)',
  somatic: 'rgb(16, 185, 129)',
};

export const allModuleIds = Object.keys(MODULE_DOMAIN_MAP).sort((a, b) => {
  const ca = CATEGORY_ORDER[MODULE_CATEGORY[a] || 'cognitive'] ?? 0;
  const cb = CATEGORY_ORDER[MODULE_CATEGORY[b] || 'cognitive'] ?? 0;
  return ca !== cb ? ca - cb : a.localeCompare(b);
});

const domainIds = Object.keys(DOMAIN_LABELS) as DomainId[];
const MODULE_COLUMNS = 3;
const MODULE_GAP_X = 220;
const MODULE_GAP_Y = 58;
const DOMAIN_X = MODULE_COLUMNS * MODULE_GAP_X + 120;
const COGNITIVE_MAP_FIT_VIEW_OPTIONS = { padding: 0.15, minZoom: 0.25 };

export function cognitiveMapModulePosition(index: number) {
  return {
    x: (index % MODULE_COLUMNS) * MODULE_GAP_X,
    y: Math.floor(index / MODULE_COLUMNS) * MODULE_GAP_Y,
  };
}

export function CognitiveMap({ className }: { className?: string }) {
  const { nodes, edges } = useMemo(() => {
    const moduleNodes: Node[] = allModuleIds.map((mid, i) => {
      const cat = MODULE_CATEGORY[mid] || 'cognitive';
      return {
        id: `mod-${mid}`,
        type: 'default',
        position: cognitiveMapModulePosition(i),
        sourcePosition: Position.Right,
        data: { label: MODULE_TITLES[mid] || mid },
        style: {
          background: `${CATEGORY_COLORS[cat]}18`,
          border: `1px solid ${CATEGORY_COLORS[cat]}`,
          color: '#fff',
          borderRadius: '10px',
          width: 190,
          minHeight: 42,
          boxSizing: 'border-box',
          padding: '6px 10px',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          whiteSpace: 'normal' as const,
          overflowWrap: 'anywhere' as const,
        },
      };
    });

    const domainNodes: Node[] = domainIds.map((did, i) => ({
      id: `dom-${did}`,
      type: 'default',
      position: { x: DOMAIN_X, y: i * 110 + 30 },
      targetPosition: Position.Left,
      data: { label: DOMAIN_LABELS[did] },
      style: {
        background: `${DOMAIN_COLORS[did]}20`,
        border: `2px solid ${DOMAIN_COLORS[did]}`,
        color: DOMAIN_COLORS[did],
        borderRadius: '50%',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
      },
    }));

    const flowEdges: Edge[] = [];
    for (const [mid, domains] of Object.entries(MODULE_DOMAIN_MAP)) {
      for (const did of domains) {
        flowEdges.push({
          id: `${mid}->${did}`,
          source: `mod-${mid}`,
          target: `dom-${did}`,
          type: 'smoothstep',
          style: { stroke: `${DOMAIN_COLORS[did]}40`, strokeWidth: 1 },
        });
      }
    }

    return { nodes: [...moduleNodes, ...domainNodes], edges: flowEdges };
  }, []);

  return (
    <div className={className} style={{ height: 620, minWidth: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={COGNITIVE_MAP_FIT_VIEW_OPTIONS}
        nodesDraggable={false}
        panOnDrag
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
