import React, { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { StepType } from '../../types'

export type ActionNodeData = {
  label: string
  stepType: StepType
  stepId: string
  params: Record<string, unknown>
  execState?: 'running' | 'success' | 'failed'
}

type ActionNodeType = Node<ActionNodeData, 'action'>

const ACTION_META: Record<string, { icon: string; name: string }> = {
  send_telegram: { icon: '✈️', name: 'Telegram' },
  http_request: { icon: '🌐', name: 'HTTP Request' },
  unibee_api: { icon: '🔗', name: 'UniBee API' },
  send_email: { icon: '📧', name: 'Email' },
  set_variable: { icon: '📝', name: 'Set Variable' },
  log: { icon: '📋', name: 'Log' }
}

/** Extract compact subtitle from params */
function getSubtitle(data: ActionNodeData): string {
  const p = data.params || {}
  switch (data.stepType) {
    case 'send_telegram': {
      const t = String(p.text || p.message || '')
      return t.length > 35 ? t.slice(0, 35) + '…' : t || 'Send message'
    }
    case 'http_request':
      return `${(p.method as string) || 'GET'} ${(p.url as string) || ''}`.slice(0, 40)
    case 'unibee_api':
      return String(p.action || 'API call')
    case 'send_email':
      return String(p.subject || 'Send email')
    case 'set_variable':
      return `${p.name || '?'} = ${p.value || '?'}`
    case 'log':
      return String(p.message || 'Log entry').slice(0, 35)
    default:
      return data.stepId
  }
}

const ActionNode: React.FC<NodeProps<ActionNodeType>> = ({ data, selected }) => {
  const meta = ACTION_META[data.stepType] || { icon: '⚙️', name: data.stepType }
  const subtitle = getSubtitle(data)
  const execCls = data.execState ? `exec-${data.execState}` : ''

  return (
    <div className={`n8n-node ${selected ? 'selected' : ''} ${execCls}`}>
      <div className={`node-accent accent-${data.stepType}`} />
      <Handle type="target" position={Position.Top} />
      <div className="node-content">
        <div className={`node-icon icon-bg-${data.stepType}`}>{meta.icon}</div>
        <div className="node-info">
          <div className="node-title">{data.label || meta.name}</div>
          <div className="node-subtitle">{subtitle}</div>
        </div>
        {data.execState && <div className="node-status" />}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(ActionNode)
