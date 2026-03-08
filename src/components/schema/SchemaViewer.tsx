import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type FitViewOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { parseDDL, type ParsedSchema } from "@/lib/schema-parser";
import { TableNode, type TableNodeData } from "./TableNode";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_WIDTH = 240;
const NODE_BASE_HEIGHT = 40; // header
const NODE_ROW_HEIGHT = 28; // per column
const FIT_VIEW_OPTIONS: FitViewOptions = { padding: 0.15, maxZoom: 1.2 };

const nodeTypes = { table: TableNode };

const EDGE_STYLE = { stroke: "var(--color-muted-foreground)", strokeWidth: 1.5 };
const EDGE_LABEL_STYLE = { fontSize: 10, fill: "var(--color-muted-foreground)" };
const EDGE_LABEL_BG_STYLE = { fill: "var(--color-card)", fillOpacity: 0.85 };

// ---------------------------------------------------------------------------
// Layout helper — dagre auto-layout (top-to-bottom)
// ---------------------------------------------------------------------------

function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  for (const node of nodes) {
    const colCount = (node.data as TableNodeData).columns?.length ?? 1;
    const height = NODE_BASE_HEIGHT + colCount * NODE_ROW_HEIGHT;
    g.setNode(node.id, { width: NODE_WIDTH, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const laidOutNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const colCount = (node.data as TableNodeData).columns?.length ?? 1;
    const height = NODE_BASE_HEIGHT + colCount * NODE_ROW_HEIGHT;
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - height / 2,
      },
    };
  });

  return { nodes: laidOutNodes, edges };
}

// ---------------------------------------------------------------------------
// Build React Flow elements from parsed schema
// ---------------------------------------------------------------------------

function buildElements(schema: ParsedSchema): { nodes: Node[]; edges: Edge[] } {
  // Pre-compute FK columns per table for icon display
  const fkMap = new Map<string, Set<string>>();
  for (const rel of schema.relationships) {
    if (!fkMap.has(rel.from)) fkMap.set(rel.from, new Set());
    fkMap.get(rel.from)!.add(rel.fromColumn);
  }

  const nodes: Node[] = schema.tables.map((table) => ({
    id: table.name,
    type: "table",
    position: { x: 0, y: 0 }, // will be set by dagre
    data: {
      label: table.name,
      columns: table.columns,
      fkColumns: fkMap.get(table.name) ?? new Set<string>(),
    } satisfies TableNodeData,
  }));

  const edges: Edge[] = schema.relationships.map((rel, idx) => ({
    id: `e-${idx}-${rel.from}-${rel.fromColumn}-${rel.to}-${rel.toColumn}`,
    source: rel.from,
    target: rel.to,
    sourceHandle: null,
    targetHandle: null,
    animated: false,
    label: `${rel.fromColumn} -> ${rel.toColumn}`,
    style: EDGE_STYLE,
    labelStyle: EDGE_LABEL_STYLE,
    labelBgStyle: EDGE_LABEL_BG_STYLE,
  }));

  return applyDagreLayout(nodes, edges);
}

// ---------------------------------------------------------------------------
// Inner component (needs ReactFlowProvider above it)
// ---------------------------------------------------------------------------

function SchemaViewerInner({ schemaContent }: { schemaContent: string }) {
  const schema = useMemo(() => parseDDL(schemaContent), [schemaContent]);
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildElements(schema),
    [schema],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();
  const isFirstRender = useRef(true);

  // Re-layout when DDL changes (skip first run — useMemo already computed initial values)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const { nodes: n, edges: e } = buildElements(schema);
    setNodes(n);
    setEdges(e);
    // Give React Flow a tick to render before fitting
    requestAnimationFrame(() => fitView(FIT_VIEW_OPTIONS));
  }, [schema, setNodes, setEdges, fitView]);

  const onInit = useCallback(() => {
    fitView(FIT_VIEW_OPTIONS);
  }, [fitView]);

  if (schema.tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No tables found. Paste BigQuery CREATE TABLE statements to visualize your
        schema.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onInit={onInit}
      fitView
      fitViewOptions={FIT_VIEW_OPTIONS}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="bg-background"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1}
        color="var(--color-border)"
      />
      <Controls
        className="!border-border !bg-card !text-card-foreground [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-card-foreground [&>button:hover]:!bg-accent"
      />
      <MiniMap
        nodeStrokeColor="var(--color-border)"
        nodeColor="var(--color-card)"
        maskColor="var(--color-background)"
        className="!border-border !bg-card"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

// ---------------------------------------------------------------------------
// Public component (wraps with provider)
// ---------------------------------------------------------------------------

export function SchemaViewer({ schemaContent }: { schemaContent: string }) {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <SchemaViewerInner schemaContent={schemaContent} />
      </ReactFlowProvider>
    </div>
  );
}
