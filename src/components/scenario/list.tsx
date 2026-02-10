import { useLoading } from '@/hooks/useLoading'
import { usePagination } from '@/hooks/usePagination'
import {
  createScenarioReq,
  deleteScenarioReq,
  getScenarioListReq,
  toggleScenarioReq
} from '@/requests'
import {
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  HistoryOutlined
} from '@ant-design/icons'
import {
  Badge,
  Button,
  Card,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  message
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scenario, TRIGGER_TYPES } from './types'
import { SCENARIO_TEMPLATES, ScenarioTemplate } from './templates'

const PAGE_SIZE = 20

const triggerColor: Record<string, string> = {
  webhook_event: 'blue',
  bot_command: 'green',
  button_click: 'purple',
  schedule: 'orange',
  manual: 'default'
}

export const ScenarioList = () => {
  const { page, onPageChange } = usePagination()
  const [total, setTotal] = useState(0)
  const navigate = useNavigate()
  const { isLoading, withLoading } = useLoading()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [templatesOpen, setTemplatesOpen] = useState(false)

  const fetchData = useCallback(async () => {
    const [res, err] = await withLoading(
      () => getScenarioListReq({ page, count: PAGE_SIZE }, fetchData),
      false
    )
    if (err) {
      message.error((err as Error).message)
      return
    }
    setScenarios(res?.scenarios ?? [])
    setTotal(res?.total ?? 0)
  }, [page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggle = async (id: number, enabled: boolean) => {
    const [, err] = await toggleScenarioReq(id, enabled)
    if (err) {
      message.error((err as Error).message)
      return
    }
    message.success(`Scenario ${enabled ? 'enabled' : 'disabled'}`)
    fetchData()
  }

  const handleDelete = async (id: number) => {
    const [, err] = await deleteScenarioReq(id)
    if (err) {
      message.error((err as Error).message)
      return
    }
    message.success('Scenario deleted')
    fetchData()
  }

  const handleCreateFromTemplate = async (template: ScenarioTemplate) => {
    const [, err] = await createScenarioReq({
      name: template.name,
      description: template.description,
      scenarioJson: JSON.stringify(template.dsl)
    })
    if (err) {
      message.error((err as Error).message)
      return
    }
    message.success('Scenario created from template')
    setTemplatesOpen(false)
    fetchData()
  }

  const columns: ColumnsType<Scenario> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Scenario) => (
        <a onClick={() => navigate(`/scenario/${record.id}`)}>{name}</a>
      )
    },
    {
      title: 'Trigger',
      dataIndex: 'triggerType',
      key: 'triggerType',
      width: 160,
      render: (type: string) => {
        const meta = TRIGGER_TYPES.find((t) => t.value === type)
        return (
          <Tag color={triggerColor[type] ?? 'default'}>
            {meta?.label ?? type}
          </Tag>
        )
      },
      filters: TRIGGER_TYPES.map((t) => ({
        text: t.label,
        value: t.value
      })),
      onFilter: (value, record) => record.triggerType === value
    },
    {
      title: 'Event / Command',
      dataIndex: 'triggerValue',
      key: 'triggerValue',
      width: 200,
      render: (val: string) => (
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{val}</code>
      )
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: number, record: Scenario) => (
        <Switch
          checked={enabled === 1}
          onChange={(checked) => handleToggle(record.id, checked)}
          checkedChildren="ON"
          unCheckedChildren="OFF"
          size="small"
        />
      ),
      filters: [
        { text: 'Enabled', value: 1 },
        { text: 'Disabled', value: 0 }
      ],
      onFilter: (value, record) => record.enabled === value
    },
    {
      title: 'Created',
      dataIndex: 'gmtCreate',
      key: 'gmtCreate',
      width: 180,
      render: (val: string) =>
        val ? new Date(val).toLocaleString() : '—'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Scenario) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/scenario/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Executions">
            <Button
              type="text"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => navigate(`/scenario/${record.id}/executions`)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this scenario?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold m-0">Scenarios</h2>
        <Space>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={() => setTemplatesOpen(true)}
          >
            From Template
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/scenario/new')}
          >
            New Scenario
          </Button>
        </Space>
      </div>

      <Table<Scenario>
        columns={columns}
        dataSource={scenarios}
        rowKey="id"
        loading={{
          spinning: isLoading,
          indicator: <LoadingOutlined style={{ fontSize: 32 }} />
        }}
        pagination={{
          total,
          pageSize: PAGE_SIZE,
          current: page + 1,
          onChange: (p) => onPageChange(p, PAGE_SIZE)
        }}
        rowClassName="clickable-tbl-row"
        onRow={(record) => ({
          onClick: () => navigate(`/scenario/${record.id}`)
        })}
      />

      {/* Templates Modal */}
      <Modal
        title="Create from Template"
        open={templatesOpen}
        onCancel={() => setTemplatesOpen(false)}
        footer={null}
        width={720}
      >
        <div className="grid grid-cols-1 gap-3 mt-4">
          {SCENARIO_TEMPLATES.map((t) => (
            <Card
              key={t.id}
              size="small"
              hoverable
              onClick={() => handleCreateFromTemplate(t)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {t.description}
                  </div>
                </div>
                <Tag color="blue">{t.category}</Tag>
              </div>
            </Card>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export default ScenarioList
