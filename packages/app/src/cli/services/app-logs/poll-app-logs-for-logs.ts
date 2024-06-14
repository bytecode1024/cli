import {PollOptions, AppLogData} from './types.js'
import {generateFetchAppLogUrl, fetchAppLogs} from './utils.js'
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
  const url = await generateFetchAppLogUrl(cursor, filters)
  const response = await fetchAppLogs(url, jwtToken)

  if (!response.ok) {
    const responseText = await response.text()
    if (response.status === 401 || response.status === 429 || response.status >= 500) {
      return {
        errors: [{status: response.status, message: `${response.statusText}`}],
      }
    } else {
      const error = new AbortError(`Error while fetching: ${responseText}`)
      renderFatalError(error)
    }
  }

  const data = (await response.json()) as {
    app_logs?: AppLogData[]
    cursor?: string
    errors?: string[]
  }

  return {
    cursor: data.cursor,
    appLogs: data.app_logs,
  }
}
