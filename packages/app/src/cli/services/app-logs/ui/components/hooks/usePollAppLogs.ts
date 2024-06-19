import {
  POLLING_ERROR_RETRY_INTERVAL_MS,
  ONE_MILLION,
  POLLING_INTERVAL_MS,
  POLLING_THROTTLE_RETRY_INTERVAL_MS,
} from '../../../constants.js'
import {pollAppLogsForLogs} from '../../../poll-app-logs-for-logs.js'
import {AppLogOutput} from '../../../types.js'
import {parseFunctionRunPayload} from '../../../utils.js'
import {useState, useEffect, useRef} from 'react'

interface UsePollAppLogsOptions {
  initialJwt: string
  filters?: {
    status?: string
    source?: string
  }
  resubscribeCallback: () => Promise<string>
}

export default function usePollAppLogs({initialJwt, filters, resubscribeCallback}: UsePollAppLogsOptions) {
  const [errors, setErrors] = useState<string[]>([])
  const [appLogs, setAppLogs] = useState<AppLogOutput[]>([])
  const [jwtToken, setJwtToken] = useState<string | null>(initialJwt)
  const pollTimeoutRef = useRef<NodeJS.Timeout>()
  const cursorRef = useRef<string>('')

  useEffect(() => {
    const pollLogs = async () => {
      let nextInterval = POLLING_INTERVAL_MS
      try {
        if (jwtToken === null) {
          try {
            const newJwt = await resubscribeCallback()
            setJwtToken(newJwt)
          } catch (error) {
            throw new Error("Couldn't resubscribe.")
          }
        } else {
          const response = await pollAppLogsForLogs({jwtToken, cursor: cursorRef.current, filters})
          const {appLogs, errors, cursor: newCursor} = response

          // eslint-disable-next-line require-atomic-updates
          cursorRef.current = newCursor ?? cursorRef.current

          if (errors && errors.length > 0) {
            const errorsStrings = errors.map((error) => error.message)
            if (errors.some((error) => error.status === 429)) {
              setErrors([...errorsStrings, `Retrying in ${POLLING_THROTTLE_RETRY_INTERVAL_MS / 1000}s`])
              nextInterval = POLLING_THROTTLE_RETRY_INTERVAL_MS
            } else if (errors.some((error) => error.status === 401)) {
              setJwtToken(null)
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

              setAppLogs((prev) => [...prev, {appLog, prefix}])
            }
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        pollTimeoutRef.current = setTimeout(() => {
          return pollLogs()
        }, nextInterval)
      } catch (error) {
        throw new Error(`Error handling logs: ${error}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    pollLogs()

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [jwtToken, filters])

  return {appLogs, errors}
}
