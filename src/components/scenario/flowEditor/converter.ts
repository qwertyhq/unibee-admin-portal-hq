/**
 * Bidirectional converter: ScenarioDSL <-> React Flow nodes & edges
 */
import type { Node, Edge } from '@xyflow/react'
import type { ScenarioDSL, StepDSL, StepType } from '../types'
import type { TriggerNodeData } from './nodes/TriggerNode'
import type { ActionNodeData } from './nodes/ActionNode'
import type { ConditionNodeData } from './nodes/ConditionNode'
import type { DelayNodeData } from './nodes/DelayNode'

const NODE_Y_GAP = 120
const NODE_X = 300
const BRANCH_X_OFFSET = 200

/* ============================================================
 *  DSL -> Flow
 * ============================================================ */
export function dslToFlow(dsl: ScenarioDSL): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 1. Trigger node
  const triggerId = '__trigger__'
  const triggerNode: Node<TriggerNodeData> = {
    id: triggerId,
    type: 'trigger',
    position: { x: NODE_X, y: 0 },
    data: {
      label: dsl.trigger?.type || 'Trigger',
      triggerType: dsl.trigger?.type || 'manual',
      event: dsl.trigger?.event || ''
    }
  }
  nodes.push(triggerNode)

  // 2. Steps — linear layout with condition branches
  let y = NODE_Y_GAP
  let prevId = triggerId
  let prevHandle: string | undefined

  for (const step of dsl.steps || []) {
    const nodeId = step.id || `step_${nodes.length}`

    if (step.type === 'condition') {
      const cNode = makeConditionNode(nodeId, step, NODE_X, y)
      nodes.push(cNode)
      edges.push(makeEdge(prevId, nodeId, prevHandle))
      prevId = nodeId
      prevHandle = 'true' // continue from "true" branch by default

      // If there are on_true / on_false sub-steps, we note them but
      // keep the main flow going through the "true" branch.
      // The visual shows two handles; the user connects branches manually.
      y += NODE_Y_GAP
    } else if (step.type === 'delay') {
      const dNode = makeDelayNode(nodeId, step, NODE_X, y)
      nodes.push(dNode)
      edges.push(makeEdge(prevId, nodeId, prevHandle))
      prevId = nodeId
      prevHandle = undefined
      y += NODE_Y_GAP
    } else {
      const aNode = makeActionNode(nodeId, step, NODE_X, y)
      nodes.push(aNode)
      edges.push(makeEdge(prevId, nodeId, prevHandle))
      prevId = nodeId
      prevHandle = undefined
      y += NODE_Y_GAP
    }
  }

  return { nodes, edges }
}

/* ============================================================
 *  Flow -> DSL
 * ============================================================ */
export function flowToDsl(
  nodes: Node[],
  edges: Edge[],
  baseDsl: Partial<ScenarioDSL>
): ScenarioDSL {
  // Find trigger node
  const triggerNode = nodes.find((n) => n.type === 'trigger')
  const triggerData = (triggerNode?.data || {}) as TriggerNodeData

  // Build adjacency from edges
  const adj = new Map<string, { target: string; sourceHandle?: string }[]>()
  for (const e of edges) {
    const list = adj.get(e.source) || []
    list.push({ target: e.target, sourceHandle: e.sourceHandle ?? undefined })
    adj.set(e.source, list)
  }

  // Walk the graph from trigger in topological order (DFS)
  const steps: StepDSL[] = []
  const visited = new Set<string>()

  function walk(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.type === 'trigger') {
      // skip trigger, just follow edges
      const children = adj.get(nodeId) || []
      for (const child of children) walk(child.target)
      return
    }

    const step = nodeToStep(node)
    if (step) steps.push(step)

    // Follow edges — for conditions, true branch first
    const children = (adj.get(nodeId) || []).sort((a, b) => {
      if (a.sourceHandle === 'true') return -1
      if (b.sourceHandle === 'true') return 1
      return 0
    })
    for (const child of children) walk(child.target)
  }

  const triggerId = triggerNode?.id || '__trigger__'
  walk(triggerId)

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
 *  Helpers — Node factories
 * ============================================================ */
function makeActionNode(id: string, step: StepDSL, x: number, y: number): Node<ActionNodeData> {
  return {
    id,
    type: 'action',
    position: { x, y },
    data: {
      label: step.params?.label as string || step.id,
      stepType: step.type as StepType,
      stepId: step.id,
      params: step.params || {}
    }
  }
}

function makeConditionNode(
  id: string,
  step: StepDSL,
  x: number,
  y: number
): Node<ConditionNodeData> {
  return {
    id,
    type: 'condition',
    position: { x, y },
    data: {
      label: (step.params?.label as string) || step.id,
      stepId: step.id,
      condition: (step.params?.condition as string) || ''
    }
  }
}

function makeDelayNode(id: string, step: StepDSL, x: number, y: number): Node<DelayNodeData> {
  return {
    id,
    type: 'delay',
    position: { x, y },
    data: {
      label: (step.params?.label as string) || step.id,
      stepId: step.id,
      duration: (step.params?.duration as string) || ''
    }
  }
}

function makeEdge(
  source: string,
  target: string,
  sourceHandle?: string
): Edge {
  const id = sourceHandle
    ? `e_${source}_${sourceHandle}_${target}`
    : `e_${source}_${target}`
  return {
    id,
    source,
    target,
    sourceHandle: sourceHandle || undefined,
    type: 'smoothstep',
    animated: true,
    label: sourceHandle === 'true' ? 'Yes' : sourceHandle === 'false' ? 'No' : undefined,
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
        params: ad.params || {}
      }
    }
    case 'condition': {
      const cd = data as ConditionNodeData
      return {
        id: cd.stepId || node.id,
        type: 'condition',
        params: { condition: cd.condition }
      }
    }
    case 'delay': {
      const dd = data as DelayNodeData
      return {
        id: dd.stepId || node.id,
        type: 'delay',
        params: { duration: dd.duration }
      }
    }
    default:
      return null
  }
}

/* ============================================================
 *  Utility — generate unique IDs
 * ============================================================ */
let counter = 0
export function generateNodeId(prefix = 'step'): string {
  counter++
  return `${prefix}_${Date.now()}_${counter}`
}
