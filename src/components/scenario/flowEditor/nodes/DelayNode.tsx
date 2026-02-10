import React, { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

export type DelayNodeData = {
  label: string
  stepId: string
  duration: string
  execState?: 'running' | 'success' | 'failed'
}

type DelayNodeType = Node<DelayNodeData, 'delay'>

const DelayNode: React.FC<NodeProps<DelayNodeType>> = ({ data, selected }) => {
  const execCls = data.execState ? `exec-${data.execState}` : ''

  return (
    <div className={`n8n-node ${selected ? 'selected' : ''} ${execCls}`}>
      <div className="node-accent accent-delay" />
      <Handle type="target" position={Position.Top} />
      <div className="node-content">
        <div className="node-icon icon-bg-delay">⏳</div>
        <div className="node-info">
          <div className="node-title">{data.label || 'Delay'}</div>
          <div className="node-subtitle">
            {data.duration ? `Wait ${data.duration}` : 'Configure duration'}
          </div>
        </div>
        {data.execState && <div className="node-status" />}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(DelayNode)
