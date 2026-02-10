import React, { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { TriggerType } from '../../types'

export type TriggerNodeData = {
  label: string
  triggerType: TriggerType
  event: string
}

type TriggerNodeType = Node<TriggerNodeData, 'trigger'>

const TRIGGER_ICONS: Record<TriggerType, string> = {
  webhook_event: '⚡',
  bot_command: '🤖',
  button_click: '👆',
  schedule: '⏰',
  manual: '▶️'
}

const TriggerNode: React.FC<NodeProps<TriggerNodeType>> = ({ data, selected }) => {
  return (
    <div className={`scenario-node trigger ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <span>{TRIGGER_ICONS[data.triggerType] || '⚡'}</span>
        <span>Trigger</span>
      </div>
      <div className="node-body">
        <div className="node-label">{data.label || data.triggerType}</div>
        {data.event && <div className="node-detail">{data.event}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(TriggerNode)
