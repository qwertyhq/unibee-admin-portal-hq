import {
  createScenarioReq,
  getScenarioDetailReq,
  testRunScenarioReq,
  updateScenarioReq,
  validateScenarioReq
} from '@/requests'
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CodeOutlined,
  ApartmentOutlined
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  message,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Scenario,
  ScenarioDSL,
  STEP_TYPES,
  TRIGGER_TYPES,
  WEBHOOK_EVENTS,
  UNIBEE_API_ACTIONS
} from './types'
import { FlowEditor } from './flowEditor'

const { TextArea } = Input
const { Text } = Typography

const DEFAULT_DSL: ScenarioDSL = {
  id: '',
  name: '',
  enabled: true,
  trigger: { type: 'webhook_event', event: '' },
  variables: {},
  steps: [
    {
      id: 'step_1',
      type: 'send_telegram',
      params: { message: 'Hello {{user_email}}!' }
    }
  ]
}

export const ScenarioDetail = () => {
  const navigate = useNavigate()
  const { scenarioId } = useParams()
  const isNew = !scenarioId || scenarioId === 'new'

  const [loading, setLoading] = useState(false)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [jsonText, setJsonText] = useState(
    JSON.stringify(DEFAULT_DSL, null, 2)
  )
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [form] = Form.useForm()
  const [viewMode, setViewMode] = useState<'json' | 'visual'>('json')
  const dslRef = useRef<ScenarioDSL>(DEFAULT_DSL)

  const goBack = () => navigate('/scenario/list')

  const fetchData = useCallback(async () => {
    if (isNew) return
    setLoading(true)
    const [res, err] = await getScenarioDetailReq(Number(scenarioId))
    setLoading(false)
    if (err) {
      message.error((err as Error).message)
      return
    }
    const sc = res?.scenario as Scenario
    if (!sc) {
      message.error('Scenario not found')
      goBack()
      return
    }
    setScenario(sc)
    form.setFieldsValue({ name: sc.name, description: sc.description })
    try {
      const parsed = JSON.parse(sc.scenarioJson)
      setJsonText(JSON.stringify(parsed, null, 2))
    } catch {
      setJsonText(sc.scenarioJson)
    }
  }, [scenarioId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleJsonChange = (value: string) => {
    setJsonText(value)
    setValidationErrors([])
    try {
      JSON.parse(value)
      setJsonError(null)
    } catch (e) {
      setJsonError((e as Error).message)
    }
  }

  const handleValidate = async () => {
    if (jsonError) {
      message.error('Fix JSON syntax errors first')
      return
    }
    const [res, err] = await validateScenarioReq(jsonText)
    if (err) {
      message.error((err as Error).message)
      return
    }
    const errors = res?.errors as string[]
    if (errors && errors.length > 0) {
      setValidationErrors(errors)
      message.warning(`Found ${errors.length} issue(s)`)
    } else {
      setValidationErrors([])
      message.success('Scenario is valid!')
    }
  }

  const handleSave = async () => {
    // If in visual mode, sync DSL back to JSON first
    const currentJson =
      viewMode === 'visual'
        ? JSON.stringify(dslRef.current, null, 2)
        : jsonText
    if (viewMode === 'visual') {
      setJsonText(currentJson)
      setJsonError(null)
    }
    if (jsonError && viewMode === 'json') {
      message.error('Fix JSON syntax errors first')
      return
    }
    try {
      await form.validateFields()
    } catch {
      return
    }

    const { name, description } = form.getFieldsValue()
    setLoading(true)

    if (isNew) {
      const [res, err] = await createScenarioReq({
        name,
        description,
        scenarioJson: currentJson
      })
      setLoading(false)
      if (err) {
        message.error((err as Error).message)
        return
      }
      message.success('Scenario created')
      const newId = res?.scenario?.id
      if (newId) {
        navigate(`/scenario/${newId}`, { replace: true })
      } else {
        goBack()
      }
    } else {
      const [, err] = await updateScenarioReq({
        scenarioId: Number(scenarioId),
        name,
        description,
        scenarioJson: currentJson
      })
      setLoading(false)
      if (err) {
        message.error((err as Error).message)
        return
      }
      message.success('Scenario updated')
      fetchData()
    }
  }

  const handleTestRun = async () => {
    if (isNew) {
      message.warning('Save the scenario first')
      return
    }
    const [, err] = await testRunScenarioReq(Number(scenarioId))
    if (err) {
      message.error((err as Error).message)
      return
    }
    message.success('Test run started! Check executions for results.')
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonText(JSON.stringify(parsed, null, 2))
      setJsonError(null)
    } catch {
      message.error('Cannot format — fix JSON errors first')
    }
  }

  // Sync DSL ref from JSON
  useEffect(() => {
    try {
      dslRef.current = JSON.parse(jsonText) as ScenarioDSL
    } catch {
      // keep old ref
    }
  }, [jsonText])

  // Switch between JSON and Visual mode
  const handleViewModeChange = (mode: string | number) => {
    const newMode = mode as 'json' | 'visual'
    if (newMode === 'visual') {
      // Parse current JSON into DSL for the visual editor
      try {
        dslRef.current = JSON.parse(jsonText) as ScenarioDSL
      } catch {
        message.error('Fix JSON errors before switching to visual editor')
        return
      }
    } else {
      // Sync visual changes back to JSON
      setJsonText(JSON.stringify(dslRef.current, null, 2))
      setJsonError(null)
    }
    setViewMode(newMode)
  }

  // Flow editor onChange callback
  const handleFlowChange = useCallback((newDsl: ScenarioDSL) => {
    dslRef.current = newDsl
  }, [])

  // Try to extract summary from JSON
  let dslSummary: ScenarioDSL | null = null
  try {
    dslSummary = JSON.parse(jsonText) as ScenarioDSL
  } catch {
    // ignore
  }

  return (
    <div>
      <Spin spinning={loading} fullscreen />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={goBack} type="text" />
          <h2 className="text-lg font-semibold m-0">
            {isNew ? 'New Scenario' : `Edit: ${scenario?.name ?? ''}`}
          </h2>
          <Segmented
            value={viewMode}
            onChange={handleViewModeChange}
            options={[
              { label: 'JSON', value: 'json', icon: <CodeOutlined /> },
              { label: 'Visual', value: 'visual', icon: <ApartmentOutlined /> }
            ]}
          />
        </Space>
        <Space>
          {!isNew && (
            <Button icon={<PlayCircleOutlined />} onClick={handleTestRun}>
              Test Run
            </Button>
          )}
          <Button onClick={handleValidate}>Validate</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            Save
          </Button>
        </Space>
      </div>

      {viewMode === 'visual' ? (
        <Row gutter={16}>
          <Col span={16}>
            <Card title="Visual Flow Editor" size="small">
              <FlowEditor dsl={dslRef.current} onChange={handleFlowChange} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Scenario Info" size="small" className="mb-4">
              <Form
                form={form}
                layout="vertical"
                initialValues={{ name: '', description: '' }}
              >
                <Form.Item
                  name="name"
                  label="Name"
                  rules={[{ required: true, message: 'Name is required' }]}
                >
                  <Input placeholder="My Scenario" />
                </Form.Item>
                <Form.Item name="description" label="Description">
                  <TextArea rows={2} placeholder="Brief description..." />
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      ) : (
      <Row gutter={16}>
        {/* Left: JSON Editor */}
        <Col span={16}>
          <Card
            title="Scenario JSON"
            size="small"
            extra={
              <Space>
                <Button size="small" onClick={handleFormat}>
                  Format
                </Button>
                {jsonError ? (
                  <Tag icon={<WarningOutlined />} color="error">
                    Invalid JSON
                  </Tag>
                ) : (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    Valid JSON
                  </Tag>
                )}
              </Space>
            }
          >
            <TextArea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              autoSize={{ minRows: 20, maxRows: 50 }}
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.5
              }}
              status={jsonError ? 'error' : undefined}
            />
            {jsonError && (
              <Alert
                className="mt-2"
                type="error"
                message={jsonError}
                showIcon
                closable
              />
            )}
            {validationErrors.length > 0 && (
              <Alert
                className="mt-2"
                type="warning"
                message="Validation issues"
                description={
                  <ul className="m-0 pl-4">
                    {validationErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                }
                showIcon
                closable
              />
            )}
          </Card>
        </Col>

        {/* Right: Meta + Preview */}
        <Col span={8}>
          <Card title="Scenario Info" size="small" className="mb-4">
            <Form form={form} layout="vertical" initialValues={{ name: '', description: '' }}>
              <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: 'Name is required' }]}
              >
                <Input placeholder="My Scenario" />
              </Form.Item>
              <Form.Item name="description" label="Description">
                <TextArea rows={2} placeholder="Brief description..." />
              </Form.Item>
            </Form>
          </Card>

          {dslSummary && (
            <Card title="Preview" size="small" className="mb-4">
              <div className="space-y-3">
                <div>
                  <Text type="secondary" className="text-xs block">
                    Trigger
                  </Text>
                  <Tag color="blue">
                    {TRIGGER_TYPES.find((t) => t.value === dslSummary!.trigger.type)?.label ??
                      dslSummary.trigger.type}
                  </Tag>
                  <Text code>{dslSummary.trigger.event}</Text>
                </div>

                <Divider className="my-2" />

                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    Steps ({dslSummary.steps.length})
                  </Text>
                  {dslSummary.steps.map((step, i) => {
                    const meta = STEP_TYPES.find((s) => s.value === step.type)
                    return (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 py-1"
                      >
                        <Tag className="text-xs">{i + 1}</Tag>
                        <Tag color="cyan">{meta?.label ?? step.type}</Tag>
                        <Text className="text-xs" ellipsis>
                          {step.id}
                        </Text>
                      </div>
                    )
                  })}
                </div>

                {dslSummary.variables &&
                  Object.keys(dslSummary.variables).length > 0 && (
                    <>
                      <Divider className="my-2" />
                      <div>
                        <Text type="secondary" className="text-xs block mb-1">
                          Variables
                        </Text>
                        {Object.entries(dslSummary.variables).map(
                          ([k, v]) => (
                            <div key={k} className="text-xs">
                              <Text code>{k}</Text> = {v}
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}
              </div>
            </Card>
          )}

          <Card title="Reference" size="small">
            <div className="space-y-2">
              <div>
                <Text type="secondary" className="text-xs block mb-1">
                  Trigger Types
                </Text>
                {TRIGGER_TYPES.map((t) => (
                  <Tooltip key={t.value} title={t.desc}>
                    <Tag className="mb-1 cursor-help">{t.label}</Tag>
                  </Tooltip>
                ))}
              </div>
              <div>
                <Text type="secondary" className="text-xs block mb-1">
                  Step Types
                </Text>
                {STEP_TYPES.map((s) => (
                  <Tooltip key={s.value} title={s.desc}>
                    <Tag className="mb-1 cursor-help" color="cyan">
                      {s.label}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
              <div>
                <Text type="secondary" className="text-xs block mb-1">
                  Webhook Events
                </Text>
                {WEBHOOK_EVENTS.map((e) => (
                  <Tag key={e} className="mb-1 text-xs">
                    {e}
                  </Tag>
                ))}
              </div>
              <div>
                <Text type="secondary" className="text-xs block mb-1">
                  UniBee API Actions
                </Text>
                {UNIBEE_API_ACTIONS.map((a) => (
                  <Tag key={a.value} className="mb-1 text-xs" color="orange">
                    {a.label}
                  </Tag>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      )}
    </div>
  )
}

export default ScenarioDetail
