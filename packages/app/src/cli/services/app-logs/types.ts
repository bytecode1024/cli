import {DeveloperPlatformClient} from '../../utilities/developer-platform-client.js'

export const LOG_TYPE_FUNCTION_RUN = 'function_run'

export interface AppLogData {
  shop_id: number
  api_client_id: number
  payload: string
  log_type: string
  source: string
  source_namespace: string
  cursor: string
  status: 'success' | 'failure'
  log_timestamp: string
}

export interface FunctionRunLog {
  input: unknown
  inputBytes: number
  invocationId: string
  output: unknown
  outputBytes: number
  logs: string
  functionId: string
  fuelConsumed: number
  errorMessage: string | null
  errorType: string | null
}

export interface SubscribeOptions {
  developerPlatformClient: DeveloperPlatformClient
  variables: {
    shopIds: string[]
    apiKey: string
    token: string
  }
}

export interface PollOptions {
  jwtToken: string
  cursor?: string
  filters?: {
    status?: string
    source?: string
  }
}

interface PollResponse {
  cursor?: string
  errors?: {
    status: number
    message: string
  }[]
  appLogs?: AppLogData[]
}

export type LogsProcess = (pollOptions: PollOptions) => Promise<PollResponse>
