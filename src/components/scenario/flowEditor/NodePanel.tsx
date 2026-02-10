import React from 'react'
import { Input, Select, Form, Space, Button, Divider, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { Node } from '@xyflow/react'
import {
  TRIGGER_TYPES,
  WEBHOOK_EVENTS,
  STEP_TYPES,
  UNIBEE_API_ACTIONS,
  type StepType
} from '../types'

const { TextArea } = Input
const { Text } = Typography

interface NodePanelProps {
  node: Node
  onChange: (nodeId: string, data: Record<string, unknown>) => void
  onDelete: (nodeId: string) => void
}

/** Unified config panel for all node types */
const NodePanel: React.FC<NodePanelProps> = ({ node, onChange, onDelete }) => {
  const data = node.data as Record<string, unknown>
  const nodeType = node.type || ''

  const updateData = (key: string, value: unknown) => {
    onChange(node.id, { ...data, [key]: value })
  }

  const updateParam = (key: string, value: unknown) => {
    const params = (data.params as Record<string, unknown>) || {}
    onChange(node.id, { ...data, params: { ...params, [key]: value } })
  }

  const params = (data.params as Record<string, unknown>) || {}

  return (
    <div style={{ padding: '12px 0' }}>
      <div className="flex justify-between items-center mb-3">
        <Text strong style={{ fontSize: 14 }}>
          {nodeType === 'trigger' ? 'Trigger' : (data.stepType as string) || nodeType}
        </Text>
        {nodeType !== 'trigger' && (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(node.id)}
          />
        )}
      </div>

      {/* Common label */}
      <Form layout="vertical" size="small">
        <Form.Item label="Label">
          <Input
            value={(data.label as string) || ''}
            onChange={(e) => updateData('label', e.target.value)}
            placeholder="Step label"
          />
        </Form.Item>

        {nodeType === 'trigger' && <TriggerFields data={data} updateData={updateData} />}
        {nodeType === 'action' && (
          <ActionFields
            stepType={data.stepType as StepType}
            params={params}
            updateParam={updateParam}
            updateData={updateData}
          />
        )}
        {nodeType === 'condition' && <ConditionFields data={data} updateData={updateData} />}
        {nodeType === 'delay' && <DelayFields params={params} updateParam={updateParam} />}
      </Form>
    </div>
  )
}

/* ---- Trigger ---- */
const TriggerFields: React.FC<{
  data: Record<string, unknown>
  updateData: (k: string, v: unknown) => void
}> = ({ data, updateData }) => (
  <>
    <Form.Item label="Trigger Type">
      <Select
        value={data.triggerType as string}
        onChange={(v) => updateData('triggerType', v)}
        options={TRIGGER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
      />
    </Form.Item>
    <Form.Item label="Event / Command">
      {data.triggerType === 'webhook_event' ? (
        <Select
          value={(data.event as string) || undefined}
          onChange={(v) => updateData('event', v)}
          options={WEBHOOK_EVENTS.map((e) => ({ value: e, label: e }))}
          placeholder="Select event"
        />
      ) : (
        <Input
          value={(data.event as string) || ''}
          onChange={(e) => updateData('event', e.target.value)}
          placeholder={data.triggerType === 'bot_command' ? '/command' : 'event'}
        />
      )}
    </Form.Item>
  </>
)

/* ---- Action ---- */
const ActionFields: React.FC<{
  stepType: StepType
  params: Record<string, unknown>
  updateParam: (k: string, v: unknown) => void
  updateData: (k: string, v: unknown) => void
}> = ({ stepType, params, updateParam, updateData }) => {
  // Step ID
  const stepIdField = (
    <Form.Item label="Step ID">
      <Input
        value={(params.__stepId as string) || ''}
        onChange={(e) => updateData('stepId', e.target.value)}
        placeholder="unique_step_id"
      />
    </Form.Item>
  )

  switch (stepType) {
    case 'send_telegram':
      return (
        <>
          {stepIdField}
          <Form.Item label="Chat ID">
            <Input
              value={(params.chat_id as string) || ''}
              onChange={(e) => updateParam('chat_id', e.target.value)}
              placeholder="{{trigger.chat_id}} or numeric"
            />
          </Form.Item>
          <Form.Item label="Message Text">
            <TextArea
              value={(params.text as string) || ''}
              onChange={(e) => updateParam('text', e.target.value)}
              rows={3}
              placeholder="Supports {{variables}}"
            />
          </Form.Item>
          <ButtonsEditor
            buttons={(params.buttons as { text: string; action: string }[]) || []}
            onChange={(v) => updateParam('buttons', v)}
          />
        </>
      )

    case 'http_request':
      return (
        <>
          {stepIdField}
          <Form.Item label="Method">
            <Select
              value={(params.method as string) || 'GET'}
              onChange={(v) => updateParam('method', v)}
              options={['GET', 'POST', 'PUT', 'DELETE'].map((m) => ({ value: m, label: m }))}
            />
          </Form.Item>
          <Form.Item label="URL">
            <Input
              value={(params.url as string) || ''}
              onChange={(e) => updateParam('url', e.target.value)}
              placeholder="https://..."
            />
          </Form.Item>
          <Form.Item label="Body (JSON)">
            <TextArea
              value={(params.body as string) || ''}
              onChange={(e) => updateParam('body', e.target.value)}
              rows={3}
              placeholder='{"key": "value"}'
            />
          </Form.Item>
        </>
      )

    case 'unibee_api':
      return (
        <>
          {stepIdField}
          <Form.Item label="API Action">
            <Select
              value={(params.action as string) || undefined}
              onChange={(v) => updateParam('action', v)}
              options={UNIBEE_API_ACTIONS}
              placeholder="Select action"
            />
          </Form.Item>
          <Form.Item label="Subscription ID">
            <Input
              value={(params.subscription_id as string) || ''}
              onChange={(e) => updateParam('subscription_id', e.target.value)}
              placeholder="{{trigger.subscriptionId}}"
            />
          </Form.Item>
          <Form.Item label="User ID">
            <Input
              value={(params.user_id as string) || ''}
              onChange={(e) => updateParam('user_id', e.target.value)}
              placeholder="{{trigger.userId}}"
            />
          </Form.Item>
        </>
      )

    case 'send_email':
      return (
        <>
          {stepIdField}
          <Form.Item label="To">
            <Input
              value={(params.to as string) || ''}
              onChange={(e) => updateParam('to', e.target.value)}
              placeholder="{{trigger.email}}"
            />
          </Form.Item>
          <Form.Item label="Subject">
            <Input
              value={(params.subject as string) || ''}
              onChange={(e) => updateParam('subject', e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Body">
            <TextArea
              value={(params.body as string) || ''}
              onChange={(e) => updateParam('body', e.target.value)}
              rows={4}
            />
          </Form.Item>
        </>
      )

    case 'set_variable':
      return (
        <>
          {stepIdField}
          <Form.Item label="Variable Name">
            <Input
              value={(params.name as string) || ''}
              onChange={(e) => updateParam('name', e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Value">
            <Input
              value={(params.value as string) || ''}
              onChange={(e) => updateParam('value', e.target.value)}
              placeholder="{{trigger.someField}}"
            />
          </Form.Item>
        </>
      )

    case 'log':
      return (
        <>
          {stepIdField}
          <Form.Item label="Message">
            <TextArea
              value={(params.message as string) || ''}
              onChange={(e) => updateParam('message', e.target.value)}
              rows={2}
              placeholder="Log message with {{variables}}"
            />
          </Form.Item>
        </>
      )

    default:
      return stepIdField
  }
}

/* ---- Condition ---- */
const ConditionFields: React.FC<{
  data: Record<string, unknown>
  updateData: (k: string, v: unknown) => void
}> = ({ data, updateData }) => (
  <>
    <Form.Item label="Step ID">
      <Input
        value={(data.stepId as string) || ''}
        onChange={(e) => updateData('stepId', e.target.value)}
        placeholder="unique_step_id"
      />
    </Form.Item>
    <Form.Item label="Condition Expression">
      <TextArea
        value={(data.condition as string) || ''}
        onChange={(e) => updateData('condition', e.target.value)}
        rows={2}
        placeholder="{{trigger.amount}} > 1000"
      />
    </Form.Item>
    <Text type="secondary" style={{ fontSize: 11 }}>
      Green handle = true, Red handle = false
    </Text>
  </>
)

/* ---- Delay ---- */
const DelayFields: React.FC<{
  params: Record<string, unknown>
  updateParam: (k: string, v: unknown) => void
}> = ({ params, updateParam }) => (
  <Form.Item label="Duration">
    <Input
      value={(params.duration as string) || ''}
      onChange={(e) => updateParam('duration', e.target.value)}
      placeholder="5m, 1h, 24h"
    />
  </Form.Item>
)

/* ---- Inline Buttons Editor ---- */
const ButtonsEditor: React.FC<{
  buttons: { text: string; action: string }[]
  onChange: (buttons: { text: string; action: string }[]) => void
}> = ({ buttons, onChange }) => {
  const add = () => onChange([...buttons, { text: '', action: '' }])
  const remove = (i: number) => onChange(buttons.filter((_, idx) => idx !== i))
  const update = (i: number, key: 'text' | 'action', v: string) =>
    onChange(buttons.map((b, idx) => (idx === i ? { ...b, [key]: v } : b)))

  return (
    <>
      <Divider plain style={{ margin: '8px 0', fontSize: 11 }}>
        Inline Buttons
      </Divider>
      {buttons.map((btn, i) => (
        <Space key={i} size={4} style={{ marginBottom: 4, display: 'flex' }}>
          <Input
            size="small"
            value={btn.text}
            onChange={(e) => update(i, 'text', e.target.value)}
            placeholder="Button text"
            style={{ width: 100 }}
          />
          <Input
            size="small"
            value={btn.action}
            onChange={(e) => update(i, 'action', e.target.value)}
            placeholder="action_id"
            style={{ width: 100 }}
          />
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => remove(i)}
          />
        </Space>
      ))}
      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={add} block>
        Add Button
      </Button>
    </>
  )
}

export default NodePanel
