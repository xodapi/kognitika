import { useMemo } from 'react';
import { ReactFlow, Background, BackgroundVariant, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export interface PhaseDef {
  id: string;
  label: string;
}

export function SessionFlowIndicator({ phases, currentPhase, className }: {
  phases: PhaseDef[];
  currentPhase: string;
  className?: string;
}) {
  const currentIdx = phases.findIndex((p) => p.id === currentPhase);

  const { nodes, edges } = useMemo(() => {
    const n: Node[] = phases.map((p, i) => ({
      id: p.id,
      type: 'default',
      position: { x: i * 140, y: 0 },
      data: { label: p.label },
      style: {
        background: i === currentIdx
          ? 'rgb(99 102 241 / 0.2)'
          : i < currentIdx
            ? 'rgb(16 185 129 / 0.15)'
            : 'rgb(148 163 184 / 0.1)',
        border: `1px solid ${
          i === currentIdx
            ? 'rgb(99 102 241)'
            : i < currentIdx
              ? 'rgb(16 185 129)'
              : 'rgb(148 163 184 / 0.3)'
        }`,
        color: i <= currentIdx ? '#fff' : 'rgb(148 163 184)',
        borderRadius: '12px',
        padding: '8px 16px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      },
    }));

    const e: Edge[] = [];
    for (let i = 0; i < phases.length - 1; i++) {
      e.push({
        id: `${phases[i].id}->${phases[i + 1].id}`,
        source: phases[i].id,
        target: phases[i + 1].id,
        type: 'smoothstep',
        style: {
          stroke: i < currentIdx ? 'rgb(16 185 129)' : 'rgb(148 163 184 / 0.4)',
          strokeWidth: i < currentIdx ? 2 : 1,
        },
        animated: i === currentIdx,
      });
    }

    return { nodes: n, edges: e };
  }, [phases, currentIdx]);

  return (
    <div className={className} style={{ height: 100 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
