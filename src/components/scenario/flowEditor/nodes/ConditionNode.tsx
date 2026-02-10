import React, { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

export type ConditionNodeData = {
  label: string
  stepId: string
  condition: string
  execState?: 'running' | 'success' | 'failed'
}

type ConditionNodeType = Node<ConditionNodeData, 'condition'>

const ConditionNode: React.FC<NodeProps<ConditionNodeType>> = ({ data, selected }) => {
  const execCls = data.execState ? `exec-${data.execState}` : ''
  const condPreview =
    data.condition && data.condition.length > 30
      ? data.condition.slice(0, 30) + '…'
      : data.condition || 'No condition'

  return (
    <div className={`n8n-node condition-node ${selected ? 'selected' : ''} ${execCls}`}>
      <div className="node-accent accent-condition" />
      <Handle type="target" position={Position.Top} />
      <div className="node-content">
        <div className="node-icon icon-bg-condition">🔀</div>
        <div className="node-info">
          <div className="node-title">{data.label || 'Condition'}</div>
          <div className="node-subtitle" title={data.condition}>
            {condPreview}
          </div>
        </div>
        {data.execState && <div className="node-status" />}
      </div>
      <div className="node-outputs">
        <div className="node-output-label yes">✓ Yes</div>
        <div className="node-output-label no">✗ No</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="handle-yes"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="handle-no"
        style={{ left: '70%' }}
      />
    </div>
  )
}

export default memo(ConditionNode)
