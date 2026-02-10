import React, { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

export type ConditionNodeData = {
  label: string
  stepId: string
  condition: string
}

type ConditionNodeType = Node<ConditionNodeData, 'condition'>

const ConditionNode: React.FC<NodeProps<ConditionNodeType>> = ({ data, selected }) => {
  return (
    <div className={`scenario-node condition ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span>🔀</span>
        <span>Condition</span>
      </div>
      <div className="node-body">
        <div className="node-label">{data.label || data.stepId}</div>
        {data.condition && (
          <div className="node-detail" title={data.condition}>
            {data.condition.length > 50 ? data.condition.slice(0, 50) + '…' : data.condition}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%', background: '#52c41a' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%', background: '#ff4d4f' }}
      />
    </div>
  )
}

export default memo(ConditionNode)
