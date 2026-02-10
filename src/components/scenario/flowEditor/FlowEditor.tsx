import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type OnConnect,
  type Node,
  type Edge,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './flowEditor.css'

import { TriggerNode, ActionNode, ConditionNode, DelayNode } from './nodes'
import NodePanel from './NodePanel'
import { dslToFlow, flowToDsl, generateNodeId } from './converter'
import { STEP_TYPES, type ScenarioDSL, type StepType } from '../types'

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode
}

/* Palette items that can be dragged onto the canvas */
const PALETTE_ITEMS: { type: string; stepType?: StepType; label: string; icon: string }[] = [
  { type: 'action', stepType: 'send_telegram', label: 'Send Telegram', icon: '✈️' },
  { type: 'action', stepType: 'http_request', label: 'HTTP Request', icon: '🌐' },
  { type: 'action', stepType: 'unibee_api', label: 'UniBee API', icon: '🔗' },
  { type: 'action', stepType: 'send_email', label: 'Send Email', icon: '📧' },
  { type: 'action', stepType: 'set_variable', label: 'Set Variable', icon: '📝' },
  { type: 'action', stepType: 'log', label: 'Log', icon: '📋' },
  { type: 'condition', label: 'Condition', icon: '🔀' },
  { type: 'delay', label: 'Delay', icon: '⏳' }
]

interface FlowEditorInnerProps {
  dsl: ScenarioDSL
  onChange: (dsl: ScenarioDSL) => void
}

const FlowEditorInner: React.FC<FlowEditorInnerProps> = ({ dsl, onChange }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  // Convert DSL to nodes/edges on mount
  const initial = useMemo(() => dslToFlow(dsl), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Sync changes back to DSL
  const syncToDsl = useCallback(
    (n: Node[], e: Edge[]) => {
      const newDsl = flowToDsl(n, e, {
        id: dsl.id,
        name: dsl.name,
        enabled: dsl.enabled,
        variables: dsl.variables
      })
      onChange(newDsl)
    },
    [dsl.id, dsl.name, dsl.enabled, dsl.variables, onChange]
  )

  // Debounced sync
  const syncRef = useRef<ReturnType<typeof setTimeout>>()
  const scheduleSync = useCallback(
    (n: Node[], e: Edge[]) => {
      if (syncRef.current) clearTimeout(syncRef.current)
      syncRef.current = setTimeout(() => syncToDsl(n, e), 300)
    },
    [syncToDsl]
  )

  // On nodes/edges change, schedule sync
  useEffect(() => {
    scheduleSync(nodes, edges)
  }, [nodes, edges])

  // Connect edges
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds)),
    [setEdges]
  )

  // Node click -> select for panel
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // Update node data from panel
  const handleNodeDataChange = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
      )
    },
    [setNodes]
  )

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      setSelectedNodeId(null)
    },
    [setNodes, setEdges]
  )

  // Drag & Drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData('application/scenario-node')
      if (!raw) return

      const { type, stepType } = JSON.parse(raw)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      })

      const newId = generateNodeId(stepType || type)

      let newNode: Node
      if (type === 'condition') {
        newNode = {
          id: newId,
          type: 'condition',
          position,
          data: { label: 'Condition', stepId: newId, condition: '' }
        }
      } else if (type === 'delay') {
        newNode = {
          id: newId,
          type: 'delay',
          position,
          data: { label: 'Delay', stepId: newId, duration: '' }
        }
      } else {
        newNode = {
          id: newId,
          type: 'action',
          position,
          data: {
            label: STEP_TYPES.find((s) => s.value === stepType)?.label || stepType,
            stepType: stepType as StepType,
            stepId: newId,
            params: {}
          }
        }
      }

      setNodes((nds) => nds.concat(newNode))
      setSelectedNodeId(newId)
    },
    [screenToFlowPosition, setNodes]
  )

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  return (
    <div className="flow-editor">
      {/* Palette */}
      <div className="flow-palette">
        <h4>Drag to add</h4>
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.stepType || item.type}
            className="flow-palette-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                'application/scenario-node',
                JSON.stringify({ type: item.type, stepType: item.stepType })
              )
              e.dataTransfer.effectAllowed = 'move'
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="reactflow-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={16} />
          <MiniMap zoomable pannable />
        </ReactFlow>
      </div>

      {/* Right Panel */}
      {selectedNode && (
        <div
          style={{
            width: 280,
            borderLeft: '1px solid #e8e8e8',
            background: '#fff',
            padding: '12px',
            overflowY: 'auto'
          }}
        >
          <NodePanel
            node={selectedNode}
            onChange={handleNodeDataChange}
            onDelete={handleDeleteNode}
          />
        </div>
      )}
    </div>
  )
}

/* ============================================================
 *  Wrapper with ReactFlowProvider
 * ============================================================ */
interface FlowEditorProps {
  dsl: ScenarioDSL
  onChange: (dsl: ScenarioDSL) => void
}

const FlowEditor: React.FC<FlowEditorProps> = ({ dsl, onChange }) => {
  return (
    <ReactFlowProvider>
      <FlowEditorInner dsl={dsl} onChange={onChange} />
    </ReactFlowProvider>
  )
}

export default FlowEditor
