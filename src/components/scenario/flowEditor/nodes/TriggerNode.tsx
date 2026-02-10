import React, { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { TriggerType } from '../../types'

export type TriggerNodeData = {
  label: string
  triggerType: TriggerType
  event: string
  execState?: 'running' | 'success' | 'failed'
}

type TriggerNodeType = Node<TriggerNodeData, 'trigger'>

const TRIGGER_ICONS: Record<TriggerType, string> = {
  webhook_event: '⚡',
  bot_command: '🤖',
  button_click: '👆',
  schedule: '⏰',
  manual: '▶️'
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  webhook_event: 'Webhook',
  bot_command: 'Bot Command',
  button_click: 'Button Click',
  schedule: 'Schedule',
  manual: 'Manual'
}

const TriggerNode: React.FC<NodeProps<TriggerNodeType>> = ({ data, selected }) => {
  const execCls = data.execState ? `exec-${data.execState}` : ''

  return (
    <div className={`n8n-node ${selected ? 'selected' : ''} ${execCls}`}>
      <div className="node-accent accent-trigger" />
      <div className="node-content">
        <div className="node-icon icon-bg-trigger">
          {TRIGGER_ICONS[data.triggerType] || '⚡'}
        </div>
        <div className="node-info">
          <div className="node-title">
            {data.label || TRIGGER_LABELS[data.triggerType] || 'Trigger'}
          </div>
          <div className="node-subtitle">{data.event || data.triggerType}</div>
        </div>
        {data.execState && <div className="node-status" />}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(TriggerNode)
