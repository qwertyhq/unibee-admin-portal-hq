import React, { useCallback } from 'react'
import { useReactFlow, type Node } from '@xyflow/react'
import { generateNodeId } from './converter'

interface ContextMenuProps {
  nodeId: string
  top?: number | false
  left?: number | false
  right?: number | false
  bottom?: number | false
  onClose: () => void
}

/** Right-click context menu for nodes */
const ContextMenu: React.FC<ContextMenuProps> = ({
  nodeId,
  top,
  left,
  right,
  bottom,
  onClose
}) => {
  const { getNode, setNodes, setEdges, getEdges } = useReactFlow()

  const handleDuplicate = useCallback(() => {
    const node = getNode(nodeId)
    if (!node) return

    const newId = generateNodeId('dup')
    const newNode: Node = {
      ...node,
      id: newId,
      position: {
        x: node.position.x + 40,
        y: node.position.y + 60
      },
      selected: false,
      data: {
        ...node.data,
        stepId: newId,
        label: `${(node.data as Record<string, unknown>).label || ''} (copy)`
      }
    }

    setNodes((nds) => nds.concat(newNode))
    onClose()
  }, [nodeId, getNode, setNodes, onClose])

  const handleDelete = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    onClose()
  }, [nodeId, setNodes, setEdges, onClose])

  const handleDisconnect = useCallback(() => {
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    onClose()
  }, [nodeId, setEdges, onClose])

  const style: React.CSSProperties = {
    ...(top !== false && top !== undefined ? { top } : {}),
    ...(left !== false && left !== undefined ? { left } : {}),
    ...(right !== false && right !== undefined ? { right } : {}),
    ...(bottom !== false && bottom !== undefined ? { bottom } : {})
  }

  // Don't allow deleting the trigger node
  const node = getNode(nodeId)
  const isTrigger = node?.type === 'trigger'

  return (
    <div className="flow-context-menu" style={style} onMouseLeave={onClose}>
      <div className="flow-context-menu-item" onClick={handleDuplicate}>
        📋 Duplicate
      </div>
      <div className="flow-context-menu-item" onClick={handleDisconnect}>
        🔌 Disconnect
      </div>
      {!isTrigger && (
        <>
          <div className="flow-context-menu-divider" />
          <div className="flow-context-menu-item danger" onClick={handleDelete}>
            🗑 Delete
          </div>
        </>
      )}
    </div>
  )
}

export default ContextMenu
