/**
 * Bidirectional converter: ScenarioDSL <-> React Flow nodes & edges
 * Uses dagre for automatic hierarchical layout
 */
import dagre from '@dagrejs/dagre'
import { Position } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import type { ScenarioDSL, StepDSL, StepType } from '../types'
import type { TriggerNodeData } from './nodes/TriggerNode'
import type { ActionNodeData } from './nodes/ActionNode'
import type { ConditionNodeData } from './nodes/ConditionNode'
import type { DelayNodeData } from './nodes/DelayNode'

const NODE_WIDTH = 200
const NODE_HEIGHT = 60
const CONDITION_HEIGHT = 80

/* ============================================================
 *  Dagre auto-layout
 * ============================================================ */
export type LayoutDirection = 'TB' | 'LR'

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  const isHorizontal = direction === 'LR'

  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 80,
    marginx: 20,
    marginy: 20
  })

  nodes.forEach((node) => {
    const h = node.type === 'condition' ? CONDITION_HEIGHT : NODE_HEIGHT
    g.setNode(node.id, { width: NODE_WIDTH, height: h })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id)
    const h = node.type === 'condition' ? CONDITION_HEIGHT : NODE_HEIGHT
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - h / 2
      }
    }
  })

  return { nodes: layoutedNodes, edges }
}

/* ============================================================
 *  DSL -> Flow (with dagre layout)
 * ============================================================ */
export function dslToFlow(
  dsl: ScenarioDSL,
  direction: LayoutDirection = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 1. Trigger node
  const triggerId = '__trigger__'
  nodes.push({
    id: triggerId,
    type: 'trigger',
    position: { x: 0, y: 0 },
    data: {
      label: dsl.trigger?.type || 'Trigger',
      triggerType: dsl.trigger?.type || 'manual',
      event: dsl.trigger?.event || ''
    } as TriggerNodeData
  })

  // 2. Steps — build linear chain + condition branches
  let prevId = triggerId
  let prevHandle: string | undefined

  for (const step of dsl.steps || []) {
    const nodeId = step.id || `step_${nodes.length}`

    if (step.type === 'condition') {
      nodes.push(makeConditionNode(nodeId, step))
      edges.push(makeEdge(prevId, nodeId, prevHandle))
      prevId = nodeId
      prevHandle = 'true'
    } else if (step.type === 'delay') {
      nodes.push(makeDelayNode(nodeId, step))
      edges.push(makeEdge(prevId, nodeId, prevHandle))
      prevId = nodeId
      prevHandle = undefined
    } else {
      nodes.push(makeActionNode(nodeId, step))
      edges.push(makeEdge(prevId, nodeId, prevHandle))
      prevId = nodeId
      prevHandle = undefined
    }
  }

  // 3. Apply dagre layout
  return applyDagreLayout(nodes, edges, direction)
}

/* ============================================================
 *  Flow -> DSL
 * ============================================================ */
export function flowToDsl(
  nodes: Node[],
  edges: Edge[],
  baseDsl: Partial<ScenarioDSL>
): ScenarioDSL {
  const triggerNode = nodes.find((n) => n.type === 'trigger')
  const triggerData = (triggerNode?.data || {}) as TriggerNodeData

  // Adjacency list
  const adj = new Map<string, { target: string; sourceHandle?: string }[]>()
  for (const e of edges) {
    const list = adj.get(e.source) || []
    list.push({ target: e.target, sourceHandle: e.sourceHandle ?? undefined })
    adj.set(e.source, list)
  }

  // Topological walk from trigger
  const steps: StepDSL[] = []
  const visited = new Set<string>()

  function walk(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.type === 'trigger') {
      const children = adj.get(nodeId) || []
      for (const child of children) walk(child.target)
      return
    }

    const step = nodeToStep(node)
    if (step) steps.push(step)

    // Follow edges — true branch first for conditions
    const children = (adj.get(nodeId) || []).sort((a, b) => {
      if (a.sourceHandle === 'true') return -1
      if (b.sourceHandle === 'true') return 1
      return 0
    })
    for (const child of children) walk(child.target)
  }

  walk(triggerNode?.id || '__trigger__')

  return {
    id: baseDsl.id || '',
    name: baseDsl.name || '',
    enabled: baseDsl.enabled ?? true,
    trigger: {
      type: triggerData.triggerType || 'manual',
      event: triggerData.event || ''
    },
    variables: baseDsl.variables || {},
    steps
  }
}

/* ============================================================
 *  Node factories (position set by dagre later)
 * ============================================================ */
function makeActionNode(id: string, step: StepDSL): Node<ActionNodeData> {
  return {
    id,
    type: 'action',
    position: { x: 0, y: 0 },
    data: {
      label: (step.params?.label as string) || step.id,
      stepType: step.type as StepType,
      stepId: step.id,
      params: step.params || {}
    }
  }
}

function makeConditionNode(id: string, step: StepDSL): Node<ConditionNodeData> {
  return {
    id,
    type: 'condition',
    position: { x: 0, y: 0 },
    data: {
      label: (step.params?.label as string) || step.id,
      stepId: step.id,
      condition: (step.params?.condition as string) || ''
    }
  }
}

function makeDelayNode(id: string, step: StepDSL): Node<DelayNodeData> {
  return {
    id,
    type: 'delay',
    position: { x: 0, y: 0 },
    data: {
      label: (step.params?.label as string) || step.id,
      stepId: step.id,
      duration: (step.params?.duration as string) || ''
    }
  }
}

function makeEdge(source: string, target: string, sourceHandle?: string): Edge {
  const id = sourceHandle
    ? `e_${source}_${sourceHandle}_${target}`
    : `e_${source}_${target}`
  return {
    id,
    source,
    target,
    sourceHandle: sourceHandle || undefined,
    type: 'deletable',
    animated: true,
    data: {
      label:
        sourceHandle === 'true' ? 'Yes' : sourceHandle === 'false' ? 'No' : undefined
    },
    style: sourceHandle === 'false' ? { stroke: '#ff4d4f' } : undefined
  }
}

/* ============================================================
 *  Node -> StepDSL
 * ============================================================ */
function nodeToStep(node: Node): StepDSL | null {
  const data = node.data as Record<string, unknown>

  switch (node.type) {
    case 'action': {
      const ad = data as ActionNodeData
      return {
        id: ad.stepId || node.id,
        type: ad.stepType,
        params: { ...ad.params, label: ad.label }
      }
    }
    case 'condition': {
      const cd = data as ConditionNodeData
      return {
        id: cd.stepId || node.id,
        type: 'condition',
        params: { condition: cd.condition, label: cd.label }
      }
    }
    case 'delay': {
      const dd = data as DelayNodeData
      return {
        id: dd.stepId || node.id,
        type: 'delay',
        params: { duration: dd.duration, label: dd.label }
      }
    }
    default:
      return null
  }
}

/* ============================================================
 *  Utilities
 * ============================================================ */
let counter = 0
export function generateNodeId(prefix = 'step'): string {
  counter++
  return `${prefix}_${Date.now()}_${counter}`
}
