// Scenario DSL types matching the backend models

export interface ScenarioDSL {
  id: string
  name: string
  enabled: boolean
  trigger: TriggerDSL
  variables?: Record<string, string>
  steps: StepDSL[]
}

export interface TriggerDSL {
  type: TriggerType
  event: string
}

export interface StepDSL {
  id: string
  type: StepType
  params: Record<string, unknown>
}

export interface ButtonDSL {
  text: string
  action: string
}

export type TriggerType =
  | 'webhook_event'
  | 'bot_command'
  | 'button_click'
  | 'schedule'
  | 'manual'

export type StepType =
  | 'send_telegram'
  | 'http_request'
  | 'delay'
  | 'condition'
  | 'set_variable'
  | 'unibee_api'
  | 'send_email'
  | 'log'

// API response types
export interface Scenario {
  id: number
  merchantId: number
  name: string
  description: string
  scenarioJson: string
  enabled: number // 0 or 1
  triggerType: string
  triggerValue: string
  createTime: number
  gmtCreate: string
  gmtModify: string
}

export interface ScenarioExecution {
  id: number
  merchantId: number
  scenarioId: number
  triggerData: string
  status: ExecutionStatus
  currentStep: string
  variables: string
  startedAt: number
  finishedAt: number
  errorMessage: string
  gmtCreate: string
}

export interface ScenarioStepLog {
  id: number
  executionId: number
  stepId: string
  stepType: string
  inputData: string
  outputData: string
  status: 'success' | 'failed' | 'skipped'
  durationMs: number
  errorMessage: string
  gmtCreate: string
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'waiting'

// Trigger & step metadata for the UI
export const TRIGGER_TYPES: { value: TriggerType; label: string; desc: string }[] = [
  { value: 'webhook_event', label: 'Webhook Event', desc: 'Triggered by a billing system event' },
  { value: 'bot_command', label: 'Bot Command', desc: 'Triggered by a Telegram bot command' },
  { value: 'button_click', label: 'Button Click', desc: 'Triggered by an inline button press' },
  { value: 'schedule', label: 'Schedule', desc: 'Triggered on a cron schedule' },
  { value: 'manual', label: 'Manual', desc: 'Triggered manually from admin' }
]

export const STEP_TYPES: { value: StepType; label: string; desc: string }[] = [
  { value: 'send_telegram', label: 'Send Telegram', desc: 'Send a Telegram message' },
  { value: 'http_request', label: 'HTTP Request', desc: 'Call an external API' },
  { value: 'delay', label: 'Delay', desc: 'Wait for a duration' },
  { value: 'condition', label: 'Condition', desc: 'Conditional branching' },
  { value: 'set_variable', label: 'Set Variable', desc: 'Set a runtime variable' },
  { value: 'unibee_api', label: 'UniBee API', desc: 'Call internal billing API' },
  { value: 'send_email', label: 'Send Email', desc: 'Send an email' },
  { value: 'log', label: 'Log', desc: 'Write a log message' }
]

export const WEBHOOK_EVENTS = [
  'payment.success',
  'payment.failure',
  'subscription.created',
  'subscription.cancelled',
  'subscription.expired',
  'subscription.updated',
  'subscription.active',
  'invoice.created',
  'invoice.paid',
  'invoice.failed',
  'user.created',
  'refund.created',
  'refund.success'
]

export const UNIBEE_API_ACTIONS = [
  { value: 'get_subscription', label: 'Get Subscription' },
  { value: 'get_user', label: 'Get User' },
  { value: 'get_invoice_list', label: 'Get Invoice List' },
  { value: 'cancel_subscription', label: 'Cancel Subscription' },
  { value: 'create_discount', label: 'Create Discount' },
  { value: 'get_plan', label: 'Get Plan' }
]

export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  waiting: 'warning'
}
