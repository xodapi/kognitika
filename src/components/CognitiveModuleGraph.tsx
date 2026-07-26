import { useMemo, useCallback } from 'react';
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

type ModuleNodeData = Record<string, unknown> & { moduleId: string; label: string };

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
const MAIN_COLUMNS = 4;
const NODE_GAP_X = 210;
const NODE_GAP_Y = 100;
const SIDE_ROW_Y = 4 * NODE_GAP_Y + 40;
const AUXILIARY_ROW_Y = SIDE_ROW_Y + NODE_GAP_Y;

export function modulePosition(moduleId: string, fallbackIndex = 0): { x: number; y: number } {
  const mainIdx = MAIN_CHAIN.indexOf(moduleId as typeof MAIN_CHAIN[number]);
  if (mainIdx !== -1) {
    return {
      x: (mainIdx % MAIN_COLUMNS) * NODE_GAP_X,
      y: Math.floor(mainIdx / MAIN_COLUMNS) * NODE_GAP_Y,
    };
  }

  const sideIdx = SIDE_CHAIN.indexOf(moduleId as typeof SIDE_CHAIN[number]);
  if (sideIdx !== -1) {
    return { x: sideIdx * NODE_GAP_X, y: SIDE_ROW_Y };
  }

  const auxiliaryIdx = AUXILIARY_MODULES.indexOf(moduleId as typeof AUXILIARY_MODULES[number]);
  if (auxiliaryIdx !== -1) {
    return { x: auxiliaryIdx * NODE_GAP_X, y: AUXILIARY_ROW_Y };
  }

  return {
    x: (fallbackIndex % MAIN_COLUMNS) * NODE_GAP_X,
    y: AUXILIARY_ROW_Y + Math.floor(fallbackIndex / MAIN_COLUMNS) * NODE_GAP_Y,
  };
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
        padding: '10px 14px',
        width: 170,
        minHeight: 68,
        boxSizing: 'border-box',
        cursor: 'pointer',
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: colors.border }} />
      <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', marginBottom: 2 }}>
        {MODULE_ICONS[data.moduleId] || '?'}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: colors.border }} />
    </div>
  );
}

const nodeTypes = { moduleNode: ModuleNode };

export function CognitiveModuleGraph({ className }: { className?: string }) {
  const navigate = useNavigate();

  const moduleIds = useMemo(() => {
    const keys = Object.keys(NEXT_MODULE) as string[];
    const vals = Object.values(NEXT_MODULE) as string[];
    return [...new Set([...keys, ...vals])];
  }, []);

  const { nodes, edges } = useMemo(() => {
    const n: Node<ModuleNodeData>[] = moduleIds.map((mid, index) => ({
      id: mid,
      type: 'moduleNode',
      position: modulePosition(mid, index),
      data: { moduleId: mid, label: MODULE_TITLES[mid] || mid },
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
  }, [moduleIds]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    navigate(`/${node.id}`);
  }, [navigate]);

  return (
    <div className={className} style={{ height: 560, minWidth: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15, minZoom: 0.2 }}
        nodesDraggable={false}
        panOnDrag
        zoomOnScroll={false}
        zoomOnPinch={false}
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
