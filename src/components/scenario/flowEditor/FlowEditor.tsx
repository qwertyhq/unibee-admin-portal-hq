import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionLineType,
  type OnConnect,
  type Node,
  type Edge,
  type IsValidConnection,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './flowEditor.css'

import { TriggerNode, ActionNode, ConditionNode, DelayNode } from './nodes'
import CustomEdge from './CustomEdge'
import ContextMenu from './ContextMenu'
import NodePanel from './NodePanel'
import { dslToFlow, flowToDsl, applyDagreLayout, generateNodeId } from './converter'
import { STEP_TYPES, type ScenarioDSL, type StepType } from '../types'

/* ---- Node & Edge type registries ---- */
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode
}

const edgeTypes = {
  deletable: CustomEdge
}

/* ---- Palette items ---- */
const PALETTE_ACTIONS = [
  { type: 'action', stepType: 'send_telegram' as StepType, label: 'Telegram', icon: '✈️', bg: '#e6f4ff' },
  { type: 'action', stepType: 'http_request' as StepType, label: 'HTTP Request', icon: '🌐', bg: '#f9f0ff' },
  { type: 'action', stepType: 'unibee_api' as StepType, label: 'UniBee API', icon: '🔗', bg: '#fff7e6' },
  { type: 'action', stepType: 'send_email' as StepType, label: 'Email', icon: '📧', bg: '#fff0f6' },
  { type: 'action', stepType: 'set_variable' as StepType, label: 'Set Variable', icon: '📝', bg: '#e6fffb' },
  { type: 'action', stepType: 'log' as StepType, label: 'Log', icon: '📋', bg: '#fafafa' }
]

const PALETTE_FLOW = [
  { type: 'condition', label: 'Condition', icon: '🔀', bg: '#fffbe6' },
  { type: 'delay', label: 'Delay', icon: '⏳', bg: '#fff2e8' }
]

/* ---- Context menu state ---- */
type MenuState = {
  nodeId: string
  top?: number | false
  left?: number | false
  right?: number | false
  bottom?: number | false
} | null

/* ============================================================
 *  Inner component (requires ReactFlowProvider)
 * ============================================================ */
interface FlowEditorInnerProps {
  dsl: ScenarioDSL
  onChange: (dsl: ScenarioDSL) => void
}

const FlowEditorInner: React.FC<FlowEditorInnerProps> = ({ dsl, onChange }) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView } = useReactFlow()

  const initial = useMemo(() => dslToFlow(dsl), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState>(null)

  // Sync to DSL (debounced)
  const syncRef = useRef<ReturnType<typeof setTimeout>>()
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

  useEffect(() => {
    if (syncRef.current) clearTimeout(syncRef.current)
    syncRef.current = setTimeout(() => syncToDsl(nodes, edges), 300)
    return () => {
      if (syncRef.current) clearTimeout(syncRef.current)
    }
  }, [nodes, edges, syncToDsl])

  // Connect
  const onConnect: OnConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge(
          { ...connection, type: 'deletable', animated: true },
          eds
        )
      ),
    [setEdges]
  )

  // Connection validation: no self-loops, no connecting to trigger
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      if (connection.source === connection.target) return false
      const targetNode = nodes.find((n) => n.id === connection.target)
      if (targetNode?.type === 'trigger') return false
      return true
    },
    [nodes]
  )

  // Node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
    setMenu(null)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setMenu(null)
  }, [])

  // Context menu
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      if (!wrapperRef.current) return
      const pane = wrapperRef.current.getBoundingClientRect()
      setMenu({
        nodeId: node.id,
        top: event.clientY < pane.height - 200 && event.clientY - pane.top,
        left: event.clientX < pane.width - 200 && event.clientX - pane.left,
        right:
          event.clientX >= pane.width - 200 && pane.width - (event.clientX - pane.left),
        bottom:
          event.clientY >= pane.height - 200 && pane.height - (event.clientY - pane.top)
      })
    },
    []
  )

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

  // Auto-layout
  const handleAutoLayout = useCallback(
    (direction: 'TB' | 'LR' = 'TB') => {
      const { nodes: ln, edges: le } = applyDagreLayout(nodes, edges, direction)
      setNodes([...ln])
      setEdges([...le])
      setTimeout(() => fitView({ padding: 0.2 }), 50)
    },
    [nodes, edges, setNodes, setEdges, fitView]
  )

  // Drag & Drop
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

  // MiniMap color by node type
  const nodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'trigger': return '#389e0d'
      case 'condition': return '#faad14'
      case 'delay': return '#fa541c'
      default: {
        const st = (node.data as Record<string, unknown>).stepType as string
        const colors: Record<string, string> = {
          send_telegram: '#1677ff',
          http_request: '#722ed1',
          unibee_api: '#fa8c16',
          send_email: '#eb2f96',
          set_variable: '#13c2c2',
          log: '#8c8c8c'
        }
        return colors[st] || '#d9d9d9'
      }
    }
  }, [])

  return (
    <div className="flow-editor-container">
      {/* Palette */}
      <div className="flow-palette">
        <div className="flow-palette-section">
          <h4>Actions</h4>
          {PALETTE_ACTIONS.map((item) => (
            <div
              key={item.stepType}
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
              <div className="palette-icon" style={{ background: item.bg }}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="flow-palette-section">
          <h4>Flow Control</h4>
          {PALETTE_FLOW.map((item) => (
            <div
              key={item.type}
              className="flow-palette-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/scenario-node',
                  JSON.stringify({ type: item.type })
                )
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              <div className="palette-icon" style={{ background: item.bg }}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="reactflow-wrapper" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={{ type: 'deletable', animated: true }}
          fitView
          deleteKeyCode={['Delete', 'Backspace']}
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
          <MiniMap
            zoomable
            pannable
            nodeColor={nodeColor}
            style={{ height: 100, width: 140 }}
          />
          <Panel position="top-right">
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="xy-theme__button"
                onClick={() => handleAutoLayout('TB')}
                title="Auto-layout (vertical)"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                ↕ Arrange
              </button>
              <button
                className="xy-theme__button"
                onClick={() => handleAutoLayout('LR')}
                title="Auto-layout (horizontal)"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                ↔ Arrange
              </button>
            </div>
          </Panel>
          {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
        </ReactFlow>
      </div>

      {/* Config Panel */}
      {selectedNode && (
        <div className="flow-config-panel">
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
 *  Wrapper
 * ============================================================ */
interface FlowEditorProps {
  dsl: ScenarioDSL
  onChange: (dsl: ScenarioDSL) => void
}

const FlowEditor: React.FC<FlowEditorProps> = ({ dsl, onChange }) => (
  <ReactFlowProvider>
    <FlowEditorInner dsl={dsl} onChange={onChange} />
  </ReactFlowProvider>
)

export default FlowEditor
