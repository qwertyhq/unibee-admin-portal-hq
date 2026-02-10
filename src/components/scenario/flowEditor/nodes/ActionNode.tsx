import React, { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { StepType } from '../../types'

export type ActionNodeData = {
  label: string
  stepType: StepType
  stepId: string
  params: Record<string, unknown>
}

type ActionNodeType = Node<ActionNodeData, 'action'>

const ACTION_META: Record<string, { icon: string; name: string }> = {
  send_telegram: { icon: '✈️', name: 'Send Telegram' },
  http_request: { icon: '🌐', name: 'HTTP Request' },
  unibee_api: { icon: '🔗', name: 'UniBee API' },
  send_email: { icon: '📧', name: 'Send Email' },
  set_variable: { icon: '📝', name: 'Set Variable' },
  log: { icon: '📋', name: 'Log' }
}

function getDetail(data: ActionNodeData): string {
  const p = data.params || {}
  switch (data.stepType) {
    case 'send_telegram': {
      const text = String(p.text || '')
      return text.length > 40 ? text.slice(0, 40) + '…' : text
    }
    case 'http_request':
      return `${(p.method as string) || 'GET'} ${(p.url as string) || ''}`
    case 'unibee_api':
      return String(p.action || '')
    case 'send_email':
      return String(p.subject || '')
    case 'set_variable':
      return `${p.name || '?'} = ${p.value || '?'}`
    case 'log':
      return String(p.message || '').slice(0, 40)
    default:
      return ''
  }
}

const ActionNode: React.FC<NodeProps<ActionNodeType>> = ({ data, selected }) => {
  const meta = ACTION_META[data.stepType] || { icon: '⚙️', name: data.stepType }
  const detail = getDetail(data)

  return (
    <div className={`scenario-node ${data.stepType} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span>{meta.icon}</span>
        <span>{meta.name}</span>
      </div>
      <div className="node-body">
        <div className="node-label">{data.label || data.stepId}</div>
        {detail && <div className="node-detail">{detail}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(ActionNode)
