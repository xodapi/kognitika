import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NEXT_MODULE, MODULE_TITLES, categoryForPracticeModule, type DailyPracticeCategory } from '../lib/practice-recommendations';

type ModuleNodeData = Record<string, unknown> & { moduleId: string; label: string; compact: boolean };
type GraphLayout = {
  columns: number;
  gapX: number;
  gapY: number;
  nodeWidth: number;
  nodeHeight: number;
};

const CATEGORY_COLORS: Record<DailyPracticeCategory, { bg: string; border: string; text: string }> = {
  cognitive: { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgb(99, 102, 241)', text: '#e0e7ff' },
  somatic: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgb(16, 185, 129)', text: '#d1fae5' },
  safety: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgb(245, 158, 11)', text: '#fef3c7' },
};

const MODULE_ICONS: Record<string, string> = {
  schulte: 'S', stroop: 'St', nback: 'N', numerical: '#', logical: 'L',
  spatial: 'Sp', topology: 'Tp', collision: 'C', dispatcher: 'D',
  noise: 'Nz', scanner: 'Sc', decryptor: 'Dc', reality: 'R',
  objective: 'O', profiling: 'P', typing: 'Ty', situational: 'Si',
  dialogue: 'Di', reframing: 'Rf', rejection: 'Rj', storytelling: 'St',
  focus: 'F', silence: 'Si', filter: 'Fl', hype: 'H',
};

const MAIN_CHAIN = ['schulte', 'stroop', 'nback', 'numerical', 'logical', 'spatial', 'topology', 'collision', 'dispatcher', 'noise', 'scanner', 'decryptor', 'reality', 'objective', 'profiling', 'typing'] as const;
const SIDE_CHAIN = ['situational', 'dialogue', 'reframing', 'rejection', 'storytelling', 'focus'] as const;
const AUXILIARY_MODULES = ['silence', 'filter', 'hype', 'mental-math', 'schulte-90', 'alphabet-table', 'stroop-alphabet'] as const;
const WIDE_LAYOUT: GraphLayout = { columns: 4, gapX: 185, gapY: 82, nodeWidth: 170, nodeHeight: 68 };
const COMPACT_LAYOUT: GraphLayout = { columns: 3, gapX: 145, gapY: 84, nodeWidth: 130, nodeHeight: 72 };
const WIDE_FIT_VIEW_OPTIONS = { padding: 0.1, minZoom: 0.35 };
const COMPACT_FIT_VIEW_OPTIONS = { padding: 0.08, minZoom: 0.45 };

function gridPosition(index: number, firstRowY: number, layout: GraphLayout): { x: number; y: number } {
  const row = Math.floor(index / layout.columns);
  const column = row % 2 === 0
    ? index % layout.columns
    : layout.columns - 1 - (index % layout.columns);

  return {
    x: column * layout.gapX,
    y: firstRowY + row * layout.gapY,
  };
}

export function modulePosition(moduleId: string, fallbackIndex = 0, compact = false): { x: number; y: number } {
  const layout = compact ? COMPACT_LAYOUT : WIDE_LAYOUT;
  const mainRows = Math.ceil(MAIN_CHAIN.length / layout.columns);
  const sideRows = Math.ceil(SIDE_CHAIN.length / layout.columns);
  const auxiliaryRows = Math.ceil(AUXILIARY_MODULES.length / layout.columns);
  const sideRowY = mainRows * layout.gapY + 36;
  const auxiliaryRowY = sideRowY + sideRows * layout.gapY;
  const mainIdx = MAIN_CHAIN.indexOf(moduleId as typeof MAIN_CHAIN[number]);
  if (mainIdx !== -1) {
    return gridPosition(mainIdx, 0, layout);
  }

  const sideIdx = SIDE_CHAIN.indexOf(moduleId as typeof SIDE_CHAIN[number]);
  if (sideIdx !== -1) {
    return gridPosition(sideIdx, sideRowY, layout);
  }

  const auxiliaryIdx = AUXILIARY_MODULES.indexOf(moduleId as typeof AUXILIARY_MODULES[number]);
  if (auxiliaryIdx !== -1) {
    return gridPosition(auxiliaryIdx, auxiliaryRowY, layout);
  }

  return gridPosition(fallbackIndex, auxiliaryRowY + auxiliaryRows * layout.gapY, layout);
}

function ModuleNode({ data }: { data: ModuleNodeData }) {
  const cat = categoryForPracticeModule(data.moduleId);
  const colors = CATEGORY_COLORS[cat];
  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        color: colors.text,
        borderRadius: '14px',
        padding: data.compact ? '8px' : '10px 14px',
        width: data.compact ? COMPACT_LAYOUT.nodeWidth : WIDE_LAYOUT.nodeWidth,
        minHeight: data.compact ? COMPACT_LAYOUT.nodeHeight : WIDE_LAYOUT.nodeHeight,
        boxSizing: 'border-box',
        cursor: 'pointer',
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: colors.border }} />
      <div style={{ fontSize: data.compact ? 14 : 16, fontWeight: 900, fontFamily: 'monospace', marginBottom: 2 }}>
        {MODULE_ICONS[data.moduleId] || '?'}
      </div>
      <div style={{ fontSize: data.compact ? 11 : 10, fontWeight: 700, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: colors.border }} />
    </div>
  );
}

const nodeTypes = { moduleNode: ModuleNode };

export function CognitiveModuleGraph({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [compact, setCompact] = useState(() => (
    typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 640px)').matches
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 640px)');
    const updateLayout = (event: MediaQueryListEvent) => setCompact(event.matches);
    media.addEventListener('change', updateLayout);

    return () => media.removeEventListener('change', updateLayout);
  }, []);

  const moduleIds = useMemo(() => {
    const keys = Object.keys(NEXT_MODULE) as string[];
    const vals = Object.values(NEXT_MODULE) as string[];
    return [...new Set([...keys, ...vals])];
  }, []);

  const { nodes, edges } = useMemo(() => {
    const n: Node<ModuleNodeData>[] = moduleIds.map((mid, index) => ({
      id: mid,
      type: 'moduleNode',
      position: modulePosition(mid, index, compact),
      data: { moduleId: mid, label: MODULE_TITLES[mid] || mid, compact },
    }));

    const seen = new Set<string>();
    const e: Edge[] = [];
    for (const [from, to] of Object.entries(NEXT_MODULE)) {
      const key = `${from}->${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      e.push({
        id: key,
        source: from,
        target: to,
        type: 'smoothstep',
        style: { stroke: 'rgba(148, 163, 184, 0.8)', strokeWidth: 2 },
      });
    }

    return { nodes: n, edges: e };
  }, [compact, moduleIds]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    navigate(`/${node.id}`);
  }, [navigate]);

  return (
    <div className={className} style={{ height: 720, minWidth: 0 }}>
      <ReactFlow
        key={compact ? 'compact' : 'wide'}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={compact ? COMPACT_FIT_VIEW_OPTIONS : WIDE_FIT_VIEW_OPTIONS}
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
