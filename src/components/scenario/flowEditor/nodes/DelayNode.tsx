import React, { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

export type DelayNodeData = {
  label: string
  stepId: string
  duration: string
}

type DelayNodeType = Node<DelayNodeData, 'delay'>

const DelayNode: React.FC<NodeProps<DelayNodeType>> = ({ data, selected }) => {
  return (
    <div className={`scenario-node delay ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span>⏳</span>
        <span>Delay</span>
      </div>
      <div className="node-body">
        <div className="node-label">{data.label || data.stepId}</div>
        {data.duration && <div className="node-detail">Wait {data.duration}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(DelayNode)
