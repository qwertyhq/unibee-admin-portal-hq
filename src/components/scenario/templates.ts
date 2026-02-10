import { ScenarioDSL } from './types'

export interface ScenarioTemplate {
  id: string
  name: string
  description: string
  category: string
  dsl: ScenarioDSL
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'payment_failed_recovery',
    name: 'Payment Failed Recovery',
    description:
      'When payment fails → notify user via Telegram → wait 1h → remind again → escalate to Slack after 24h',
    category: 'Recovery',
    dsl: {
      id: 'payment_failed_recovery',
      name: 'Payment Failed Recovery',
      enabled: true,
      trigger: { type: 'webhook_event', event: 'payment.failure' },
      variables: {
        user_email: '{{data_userEmail}}',
        plan_name: '{{data_planName}}',
        amount: '{{data_amountFormatted}}'
      },
      steps: [
        {
          id: 'step_1',
          type: 'send_telegram',
          params: {
            message:
              '⚠️ Payment failed\nPlan: {{plan_name}}\nAmount: {{amount}}',
            buttons: [
              { text: 'Retry payment', action: 'retry_payment' },
              { text: 'Change card', action: 'change_card' }
            ]
          }
        },
        { id: 'step_2', type: 'delay', params: { duration: '1h' } },
        {
          id: 'step_3',
          type: 'send_telegram',
          params: {
            message:
              '🔔 Reminder: your payment is still pending.\nPlan: {{plan_name}}'
          }
        },
        { id: 'step_4', type: 'delay', params: { duration: '24h' } },
        {
          id: 'step_5',
          type: 'log',
          params: {
            message: 'Payment still failed for {{user_email}} after 24h',
            level: 'warning'
          }
        }
      ]
    }
  },
  {
    id: 'subscription_cancelled_retention',
    name: 'Churn Prevention',
    description:
      'When subscription is cancelled → offer a 20% discount → create promo code → send to user',
    category: 'Retention',
    dsl: {
      id: 'subscription_cancelled_retention',
      name: 'Churn Prevention',
      enabled: true,
      trigger: { type: 'webhook_event', event: 'subscription.cancelled' },
      variables: {
        user_email: '{{data_userEmail}}',
        plan_name: '{{data_planName}}'
      },
      steps: [
        {
          id: 'step_1',
          type: 'send_telegram',
          params: {
            message:
              "😔 Sorry to see you go!\nYou've cancelled {{plan_name}}.\nWould you like a 20% discount?",
            buttons: [
              { text: 'Yes, give me a discount!', action: 'accept_discount' },
              { text: 'No thanks', action: 'decline_discount' }
            ]
          }
        }
      ]
    }
  },
  {
    id: 'new_user_welcome',
    name: 'New User Welcome',
    description:
      'When a new user is created → send a welcome Telegram message with available plans',
    category: 'Onboarding',
    dsl: {
      id: 'new_user_welcome',
      name: 'New User Welcome',
      enabled: true,
      trigger: { type: 'webhook_event', event: 'user.created' },
      variables: {
        user_email: '{{data_email}}',
        first_name: '{{data_firstName}}'
      },
      steps: [
        {
          id: 'step_1',
          type: 'send_telegram',
          params: {
            message:
              '👋 Welcome, {{first_name}}!\n\nThank you for signing up. Use /plans to see our available subscriptions.'
          }
        },
        {
          id: 'step_2',
          type: 'send_email',
          params: {
            to: '{{user_email}}',
            subject: 'Welcome to our platform!',
            body: 'Hi {{first_name}},\n\nWelcome aboard! We are glad to have you.'
          }
        }
      ]
    }
  },
  {
    id: 'subscription_expiring',
    name: 'Subscription Expiring Reminder',
    description:
      'When subscription is about to expire → send reminder with renewal button',
    category: 'Retention',
    dsl: {
      id: 'subscription_expiring',
      name: 'Subscription Expiring Reminder',
      enabled: true,
      trigger: { type: 'webhook_event', event: 'subscription.expired' },
      variables: {
        user_email: '{{data_userEmail}}',
        plan_name: '{{data_planName}}'
      },
      steps: [
        {
          id: 'step_1',
          type: 'send_telegram',
          params: {
            message:
              '⏰ Your subscription to {{plan_name}} has expired.\nRenew now to keep your access!',
            buttons: [{ text: '🔄 Renew now', action: 'renew_subscription' }]
          }
        }
      ]
    }
  },
  {
    id: 'bot_status_command',
    name: 'Bot /status Command',
    description:
      'When user sends /status → fetch their subscription and reply with details',
    category: 'Bot Commands',
    dsl: {
      id: 'bot_status_command',
      name: 'Bot /status Command',
      enabled: true,
      trigger: { type: 'bot_command', event: '/status' },
      steps: [
        {
          id: 'step_1',
          type: 'unibee_api',
          params: {
            action: 'get_subscription',
            params: { userId: '{{user_id}}' }
          }
        },
        {
          id: 'step_2',
          type: 'condition',
          params: {
            if: "{{found}} == 'true'",
            then: 'step_3',
            else: 'step_4'
          }
        },
        {
          id: 'step_3',
          type: 'send_telegram',
          params: {
            message:
              '📊 Your subscription:\nPlan: {{plan_name}}\nStatus: {{subscription_status}}\nAmount: {{subscription_amount}} {{subscription_currency}}'
          }
        },
        {
          id: 'step_4',
          type: 'send_telegram',
          params: {
            message: 'ℹ️ You have no active subscription.'
          }
        }
      ]
    }
  }
]
