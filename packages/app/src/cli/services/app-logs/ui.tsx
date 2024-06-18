import {Logs, ProcessOutout} from './ui/components/Logs.js'
import {LogsProcess, PollOptions, SubscribeOptions} from './types.js'
import {parseFunctionRunPayload, subscribeToAppLogs} from './utils.js'
import {
  POLLING_ERROR_RETRY_INTERVAL_MS,
  ONE_MILLION,
  POLLING_INTERVAL_MS,
  POLLING_THROTTLE_RETRY_INTERVAL_MS,
} from './constants.js'
import React from 'react'
import {render} from '@shopify/cli-kit/node/ui'

interface ErrorHandleProcessInput {
  handleJwtUpdate: (jwtToken: string | null) => void
  handleErrors: (errors: {status: number; message: string}[]) => void
  handleAppLog: (input: ProcessOutout) => void
  jwtToken: string
  cursor: string
  filters?: {
    status?: string
    source?: string
  }
}

export async function renderLogs({
  logsProcess,
  pollOptions,
  options: {variables, developerPlatformClient},
}: {
  logsProcess: LogsProcess
  pollOptions: PollOptions
  options: SubscribeOptions
}) {
  const resubscribeCallback = async () => {
    const jwt = await subscribeToAppLogs(developerPlatformClient, variables)
    return jwt
  }

  const errorHandleProcess = async ({
    handleJwtUpdate,
    jwtToken,
    cursor,
    handleErrors,
    handleAppLog,
    filters,
  }: ErrorHandleProcessInput): Promise<{
    cursor: string
    nextInterval: number
  }> => {
    try {
      let nextInterval = POLLING_INTERVAL_MS
      if (jwtToken === null) {
        try {
          const jwtToken = await resubscribeCallback()

          handleJwtUpdate(jwtToken)
        } catch (error) {
          throw new Error("Couldn't resubscribe.")
        }
      }
      const {cursor: newCursor, errors, appLogs} = await logsProcess({jwtToken, cursor, filters})
      if (errors && errors.length > 0) {
        if (errors.some((error) => error.status === 429)) {
          handleErrors([
            ...errors,
            {status: 429, message: `Resubscribing in ${POLLING_THROTTLE_RETRY_INTERVAL_MS / 1000}s`},
          ])
          nextInterval = POLLING_THROTTLE_RETRY_INTERVAL_MS
        } else if (errors.some((error) => error.status === 401)) {
          handleJwtUpdate(null)
        } else {
          handleErrors([
            ...errors,
            {status: 400, message: `Resubscribing in ${POLLING_ERROR_RETRY_INTERVAL_MS / 1000}s`},
          ])
          nextInterval = POLLING_ERROR_RETRY_INTERVAL_MS
        }
      } else {
        handleErrors([])
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
          }

          handleAppLog({
            appLog,
            prefix,
          })
        }
      }
      return {
        cursor: newCursor || '',
        nextInterval,
      }
    } catch (error) {
      throw new Error('Error handling logs')
    }
  }

  return render(
    <Logs
      errorHandledLogsProcess={errorHandleProcess}
      pollOptions={pollOptions}
      resubscribeCallback={resubscribeCallback}
    />,
  )
}
