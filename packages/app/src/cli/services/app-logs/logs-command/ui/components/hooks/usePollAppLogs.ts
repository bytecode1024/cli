import {
  POLLING_ERROR_RETRY_INTERVAL_MS,
  ONE_MILLION,
  POLLING_INTERVAL_MS,
  POLLING_THROTTLE_RETRY_INTERVAL_MS,
  parseFunctionRunPayload,
} from '../../../../utils.js'
import {pollAppLogsForLogs} from '../../../poll-app-logs.js'
import {AppLogOutput} from '../../../../types.js'
import {useState, useEffect} from 'react'

interface UsePollAppLogsOptions {
  initialJwt: string
  filters?: {
    status?: string
    source?: string
  }
  resubscribeCallback: () => Promise<string>
}

export function usePollAppLogs({initialJwt, filters, resubscribeCallback}: UsePollAppLogsOptions) {
  const [errors, setErrors] = useState<string[]>([])
  const [appLogOutputs, setAppLogOutputs] = useState<AppLogOutput[]>([])

  useEffect(() => {
    let jwtToken = initialJwt
    let cursor = ''

    const poll = async () => {
      let nextInterval = POLLING_INTERVAL_MS
      const response = await pollAppLogsForLogs({jwtToken, cursor, filters})
      const appLogs = response.appLogs
      const errors = response.errors
      const newCursor = response.cursor

      // eslint-disable-next-line require-atomic-updates
      cursor = newCursor ?? cursor

      if (errors && errors.length > 0) {
        const errorsStrings = errors.map((error) => error.message)
        if (errors.some((error) => error.status === 429)) {
          setErrors([...errorsStrings, `Retrying in ${POLLING_THROTTLE_RETRY_INTERVAL_MS / 1000}s`])
          nextInterval = POLLING_THROTTLE_RETRY_INTERVAL_MS
        } else if (errors.some((error) => error.status === 401)) {
          // eslint-disable-next-line require-atomic-updates
          jwtToken = await resubscribeCallback()
        } else {
          setErrors([...errorsStrings, `Retrying in ${POLLING_ERROR_RETRY_INTERVAL_MS / 1000}s`])
          nextInterval = POLLING_ERROR_RETRY_INTERVAL_MS
        }
      } else {
        setErrors([])
      }

      if (appLogs) {
        for (const log of appLogs) {
          const appLog = parseFunctionRunPayload(log.payload)
          const fuel = (appLog.fuelConsumed / ONE_MILLION).toFixed(4)
          const prefix = {
            status: log.status === 'success' ? 'Success' : 'Failure',
            source: log.source,
            fuelConsumed: fuel,
            functionId: appLog.functionId,
            logTimestamp: log.log_timestamp,
          }

          setAppLogOutputs((prev) => [...prev, {appLog, prefix}])
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setTimeout(poll, nextInterval)
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    poll()
  }, [])

  return {appLogOutputs, errors}
}
