import {
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  SendOutlined,
  UndoOutlined
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import {
  getTelegramSetupReq,
  getTelegramTemplateListReq,
  previewTelegramTemplateReq,
  saveTelegramSetupReq,
  sendTelegramTestReq,
  updateTelegramTemplateReq
} from '../../../requests'

const { Text, Paragraph } = Typography
const { TextArea } = Input

type TelegramSetup = {
  botToken: string
  chatId: string
  enabled: boolean
}

type TemplateItem = {
  event: string
  template: string
  isCustom: boolean
  defaultTemplate: string
}

type TemplateListData = {
  templates: TemplateItem[]
  availableVariables: string[]
}

const TelegramSettings = () => {
  const [loading, setLoading] = useState(false)
  const [setup, setSetup] = useState<TelegramSetup | null>(null)
  const [setupModalOpen, setSetupModalOpen] = useState(false)
  const [testSending, setTestSending] = useState(false)

  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [availableVars, setAvailableVars] = useState<string[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null)
  const [editValue, setEditValue] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [form] = Form.useForm()

  const fetchSetup = async () => {
    setLoading(true)
    const [data, err] = await getTelegramSetupReq()
    setLoading(false)
    if (err) {
      message.error(err.message || 'Failed to load Telegram setup')
      return
    }
    setSetup(data)
  }

  const fetchTemplates = async () => {
    setTemplatesLoading(true)
    const [data, err] = await getTelegramTemplateListReq()
    setTemplatesLoading(false)
    if (err) {
      message.error(err.message || 'Failed to load templates')
      return
    }
    const d = data as TemplateListData
    setTemplates(d.templates || [])
    setAvailableVars(d.availableVariables || [])
  }

  useEffect(() => {
    fetchSetup()
    fetchTemplates()
  }, [])

  const handleSaveSetup = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const [, err] = await saveTelegramSetupReq({
        botToken: values.botToken,
        chatId: values.chatId,
        enabled: values.enabled ?? false
      })
      setLoading(false)
      if (err) {
        message.error(err.message || 'Failed to save')
        return
      }
      message.success('Telegram bot setup saved')
      setSetupModalOpen(false)
      fetchSetup()
    } catch {
      // validation failed
    }
  }

  const handleSendTest = async () => {
    setTestSending(true)
    const [data, err] = await sendTelegramTestReq()
    setTestSending(false)
    if (err) {
      message.error(err.message || 'Failed to send test')
      return
    }
    if (data?.success) {
      message.success('Test message sent successfully!')
    } else {
      message.error(data?.error || 'Failed to send test message')
    }
  }

  const handleEditTemplate = (record: TemplateItem) => {
    setEditingTemplate(record)
    setEditValue(record.template)
    setPreviewText('')
    setEditModalOpen(true)
  }

  const handlePreview = async () => {
    if (!editingTemplate) return
    setPreviewLoading(true)
    const [data, err] = await previewTelegramTemplateReq({
      event: editingTemplate.event,
      template: editValue
    })
    setPreviewLoading(false)
    if (err) {
      message.error(err.message || 'Preview failed')
      return
    }
    setPreviewText(data?.renderedMessage || '')
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return
    setSavingTemplate(true)
    const [, err] = await updateTelegramTemplateReq({
      event: editingTemplate.event,
      template: editValue
    })
    setSavingTemplate(false)
    if (err) {
      message.error(err.message || 'Failed to save template')
      return
    }
    message.success('Template saved')
    setEditModalOpen(false)
    fetchTemplates()
  }

  const handleResetTemplate = async () => {
    if (!editingTemplate) return
    setSavingTemplate(true)
    const [, err] = await updateTelegramTemplateReq({
      event: editingTemplate.event,
      template: '' // empty = reset to default
    })
    setSavingTemplate(false)
    if (err) {
      message.error(err.message || 'Failed to reset template')
      return
    }
    message.success('Template reset to default')
    setEditModalOpen(false)
    fetchTemplates()
  }

  const templateColumns: ColumnsType<TemplateItem> = [
    {
      title: 'Event',
      dataIndex: 'event',
      key: 'event',
      width: 280,
      sorter: (a, b) => a.event.localeCompare(b.event),
      render: (event: string) => <Text code>{event}</Text>
    },
    {
      title: 'Template',
      dataIndex: 'template',
      key: 'template',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text className="max-w-[400px]" ellipsis>
            {text}
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isCustom',
      key: 'isCustom',
      width: 100,
      render: (isCustom: boolean) =>
        isCustom ? (
          <Tag color="blue">Custom</Tag>
        ) : (
          <Tag color="default">Default</Tag>
        )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleEditTemplate(record)}
        >
          Edit
        </Button>
      )
    }
  ]

  const isConfigured = setup && setup.botToken && setup.chatId

  return (
    <div className="flex flex-col gap-4">
      {/* Setup Section */}
      <Card
        title="Telegram Bot Configuration"
        extra={
          <Space>
            {isConfigured && (
              <Button
                icon={<SendOutlined />}
                onClick={handleSendTest}
                loading={testSending}
              >
                Send Test
              </Button>
            )}
            <Button
              type="primary"
              onClick={() => {
                if (setup) {
                  form.setFieldsValue({
                    botToken: '',
                    chatId: setup.chatId,
                    enabled: setup.enabled
                  })
                }
                setSetupModalOpen(true)
              }}
            >
              {isConfigured ? 'Edit Setup' : 'Set Up'}
            </Button>
          </Space>
        }
      >
        {setup ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Status">
              {setup.enabled ? (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  Enabled
                </Tag>
              ) : (
                <Tag color="default">Disabled</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Bot Token">
              {setup.botToken || <Text type="secondary">Not configured</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Chat ID">
              {setup.chatId || <Text type="secondary">Not configured</Text>}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert
            message="Telegram bot is not configured"
            description="Set up a Telegram bot to receive billing notifications. You'll need a bot token from @BotFather and a chat/channel ID."
            type="info"
            showIcon
          />
        )}
      </Card>

      {/* Templates Section */}
      <Card
        title="Message Templates"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchTemplates}
            loading={templatesLoading}
          >
            Refresh
          </Button>
        }
      >
        <Paragraph type="secondary" className="mb-3">
          Customize notification messages using {'{{variable}}'} placeholders.
          Available variables:{' '}
          {availableVars.map((v) => (
            <Tag key={v} className="mb-1">
              {`{{${v}}}`}
            </Tag>
          ))}
        </Paragraph>
        <Table
          columns={templateColumns}
          dataSource={templates}
          rowKey="event"
          size="small"
          loading={templatesLoading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </Card>

      {/* Setup Modal */}
      <Modal
        title="Telegram Bot Setup"
        open={setupModalOpen}
        onCancel={() => setSetupModalOpen(false)}
        onOk={handleSaveSetup}
        confirmLoading={loading}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="botToken"
            label="Bot Token"
            rules={[{ required: true, message: 'Enter your bot token from @BotFather' }]}
            help="Create a bot via @BotFather on Telegram and paste the token here"
          >
            <Input.Password placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
          </Form.Item>
          <Form.Item
            name="chatId"
            label="Chat ID"
            rules={[{ required: true, message: 'Enter chat/channel ID' }]}
            help="Use @userinfobot or @RawDataBot to get chat ID. For channels, use @channel_username"
          >
            <Input placeholder="-100123456789 or @channel_name" />
          </Form.Item>
          <Form.Item name="enabled" label="Enable Notifications" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Template Edit Modal */}
      <Modal
        title={`Edit Template: ${editingTemplate?.event}`}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        width={640}
        footer={
          <Space>
            {editingTemplate?.isCustom && (
              <Button
                icon={<UndoOutlined />}
                onClick={handleResetTemplate}
                loading={savingTemplate}
                danger
              >
                Reset to Default
              </Button>
            )}
            <Button icon={<EyeOutlined />} onClick={handlePreview} loading={previewLoading}>
              Preview
            </Button>
            <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSaveTemplate} loading={savingTemplate}>
              Save
            </Button>
          </Space>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <Text strong>Template:</Text>
            <TextArea
              rows={5}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter template with {{variables}}"
            />
          </div>
          {editingTemplate?.defaultTemplate && (
            <div>
              <Text type="secondary">Default template:</Text>
              <Paragraph
                code
                className="whitespace-pre-wrap text-xs"
                copyable
              >
                {editingTemplate.defaultTemplate}
              </Paragraph>
            </div>
          )}
          {previewText && (
            <div>
              <Text strong>Preview:</Text>
              <Card size="small" className="whitespace-pre-wrap bg-gray-50">
                {previewText}
              </Card>
            </div>
          )}
          <div>
            <Text type="secondary" className="text-xs">
              Variables:{' '}
              {availableVars.map((v) => (
                <Tag
                  key={v}
                  className="mb-1 cursor-pointer"
                  onClick={() => setEditValue((prev) => prev + `{{${v}}}`)}
                >
                  {`{{${v}}}`}
                </Tag>
              ))}
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TelegramSettings
