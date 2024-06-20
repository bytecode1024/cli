import {PollOptions, AppLogData} from './types.js'
import {fetchAppLogs} from './utils.js'
import {AbortError} from '@shopify/cli-kit/node/error'
import {renderFatalError} from '@shopify/cli-kit/node/ui'

export const pollAppLogsForLogs = async ({
  jwtToken,
  cursor,
  filters,
}: PollOptions): Promise<{
  cursor?: string
  errors?: {
    status: number
    message: string
  }[]
  appLogs?: AppLogData[]
}> => {
  const response = await fetchAppLogs(jwtToken, cursor, filters)

  const responseJson = await response.json()
  if (!response.ok) {
    const errorResponse = responseJson as {
      errors: string[]
    }
    if (response.status === 401 || response.status === 429 || response.status >= 500) {
      return {
        errors: [{status: response.status, message: `${errorResponse.errors.join(', ')}`}],
      }
    } else {
      throw new AbortError(`${errorResponse.errors.join(', ')} while fetching app logs`)
    }
  }

  const data = responseJson as {
    app_logs?: AppLogData[]
    cursor?: string
    errors?: string[]
  }

  return {
    cursor: data.cursor,
    appLogs: data.app_logs,
  }
}
