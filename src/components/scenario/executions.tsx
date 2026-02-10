import { useLoading } from '@/hooks/useLoading'
import { usePagination } from '@/hooks/usePagination'
import {
  getScenarioDetailReq,
  getScenarioExecutionDetailReq,
  getScenarioExecutionListReq
} from '@/requests'
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import {
  Badge,
  Button,
  Descriptions,
  Drawer,
  message,
  Space,
  Table,
  Tag,
  Timeline,
  Typography
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  EXECUTION_STATUS_COLORS,
  ExecutionStatus,
  Scenario,
  ScenarioExecution,
  ScenarioStepLog
} from './types'

const { Text } = Typography
const PAGE_SIZE = 20

const statusBadge: Record<ExecutionStatus, 'default' | 'processing' | 'success' | 'error' | 'warning'> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  waiting: 'warning'
}

export const ScenarioExecutions = () => {
  const navigate = useNavigate()
  const { scenarioId } = useParams()
  const { page, onPageChange } = usePagination()
  const [total, setTotal] = useState(0)
  const { isLoading, withLoading } = useLoading()
  const [executions, setExecutions] = useState<ScenarioExecution[]>([])
  const [scenarioName, setScenarioName] = useState('')

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedExec, setSelectedExec] = useState<ScenarioExecution | null>(null)
  const [stepLogs, setStepLogs] = useState<ScenarioStepLog[]>([])
  const [drawerLoading, setDrawerLoading] = useState(false)

  const fetchData = useCallback(async () => {
    const [res, err] = await withLoading(
      () =>
        getScenarioExecutionListReq(
          { scenarioId: Number(scenarioId), page, count: PAGE_SIZE },
          fetchData
        ),
      false
    )
    if (err) {
      message.error((err as Error).message)
      return
    }
    setExecutions(res?.executions ?? [])
    setTotal(res?.total ?? 0)
  }, [page, scenarioId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch scenario name
  useEffect(() => {
    if (!scenarioId) return
    getScenarioDetailReq(Number(scenarioId)).then(([res]) => {
      if (res?.scenario) setScenarioName(res.scenario.name)
    })
  }, [scenarioId])

  const openExecutionDetail = async (exec: ScenarioExecution) => {
    setSelectedExec(exec)
    setDrawerOpen(true)
    setDrawerLoading(true)
    const [res, err] = await getScenarioExecutionDetailReq(exec.id)
    setDrawerLoading(false)
    if (err) {
      message.error((err as Error).message)
      return
    }
    setStepLogs(res?.stepLogs ?? [])
  }

  const columns: ColumnsType<ScenarioExecution> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ExecutionStatus) => (
        <Badge
          status={statusBadge[status]}
          text={<span className="capitalize">{status}</span>}
        />
      ),
      filters: (
        Object.keys(statusBadge) as ExecutionStatus[]
      ).map((s) => ({
        text: s.charAt(0).toUpperCase() + s.slice(1),
        value: s
      })),
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Current Step',
      dataIndex: 'currentStep',
      key: 'currentStep',
      width: 150,
      render: (val: string) =>
        val ? <Text code>{val}</Text> : <Text type="secondary">—</Text>
    },
    {
      title: 'Started',
      dataIndex: 'gmtCreate',
      key: 'gmtCreate',
      width: 180,
      render: (val: string) =>
        val ? new Date(val).toLocaleString() : '—'
    },
    {
      title: 'Error',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (val: string) =>
        val ? (
          <Text type="danger" ellipsis>
            {val}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        )
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: ScenarioExecution) => (
        <Button
          type="link"
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            openExecutionDetail(record)
          }}
        >
          Details
        </Button>
      )
    }
  ]

  const stepLogColor = (status: string) => {
    if (status === 'success') return 'green'
    if (status === 'failed') return 'red'
    return 'gray'
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/scenario/${scenarioId}`)}
            type="text"
          />
          <h2 className="text-lg font-semibold m-0">
            Executions: {scenarioName || `#${scenarioId}`}
          </h2>
        </Space>
      </div>

      <Table<ScenarioExecution>
        columns={columns}
        dataSource={executions}
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
        onRow={(record) => ({
          onClick: () => openExecutionDetail(record)
        })}
        rowClassName="clickable-tbl-row cursor-pointer"
      />

      {/* Execution Detail Drawer */}
      <Drawer
        title={`Execution #${selectedExec?.id ?? ''}`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
      >
        {selectedExec && (
          <>
            <Descriptions column={1} size="small" bordered className="mb-4">
              <Descriptions.Item label="Status">
                <Badge
                  status={statusBadge[selectedExec.status]}
                  text={selectedExec.status}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Current Step">
                {selectedExec.currentStep || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Started">
                {selectedExec.gmtCreate
                  ? new Date(selectedExec.gmtCreate).toLocaleString()
                  : '—'}
              </Descriptions.Item>
              {selectedExec.errorMessage && (
                <Descriptions.Item label="Error">
                  <Text type="danger">{selectedExec.errorMessage}</Text>
                </Descriptions.Item>
              )}
              {selectedExec.triggerData && (
                <Descriptions.Item label="Trigger Data">
                  <pre className="text-xs m-0 max-h-32 overflow-auto bg-gray-50 p-2 rounded">
                    {(() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(selectedExec.triggerData),
                          null,
                          2
                        )
                      } catch {
                        return selectedExec.triggerData
                      }
                    })()}
                  </pre>
                </Descriptions.Item>
              )}
              {selectedExec.variables && (
                <Descriptions.Item label="Variables">
                  <pre className="text-xs m-0 max-h-32 overflow-auto bg-gray-50 p-2 rounded">
                    {(() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(selectedExec.variables),
                          null,
                          2
                        )
                      } catch {
                        return selectedExec.variables
                      }
                    })()}
                  </pre>
                </Descriptions.Item>
              )}
            </Descriptions>

            <h4 className="mb-2">Step Logs</h4>
            {drawerLoading ? (
              <div className="text-center py-8">
                <LoadingOutlined style={{ fontSize: 24 }} />
              </div>
            ) : stepLogs.length === 0 ? (
              <Text type="secondary">No step logs available</Text>
            ) : (
              <Timeline
                items={stepLogs.map((log) => ({
                  color: stepLogColor(log.status),
                  children: (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag color={stepLogColor(log.status)}>
                          {log.status}
                        </Tag>
                        <Text strong>{log.stepId}</Text>
                        <Tag>{log.stepType}</Tag>
                        {log.durationMs > 0 && (
                          <Text type="secondary" className="text-xs">
                            <ClockCircleOutlined /> {log.durationMs}ms
                          </Text>
                        )}
                      </div>
                      {log.errorMessage && (
                        <Text type="danger" className="text-xs block">
                          {log.errorMessage}
                        </Text>
                      )}
                      {log.outputData && (
                        <pre className="text-xs m-0 mt-1 bg-gray-50 p-1 rounded max-h-20 overflow-auto">
                          {(() => {
                            try {
                              return JSON.stringify(
                                JSON.parse(log.outputData),
                                null,
                                2
                              )
                            } catch {
                              return log.outputData
                            }
                          })()}
                        </pre>
                      )}
                    </div>
                  )
                }))}
              />
            )}
          </>
        )}
      </Drawer>
    </div>
  )
}

export default ScenarioExecutions
