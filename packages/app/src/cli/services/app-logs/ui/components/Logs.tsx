import {PollOptions, FunctionRunLog, AppLogData} from '../../types.js'
import {parseFunctionRunPayload, prettyPrintJsonIfPossible} from '../../utils.js'
import {
  POLLING_ERROR_RETRY_INTERVAL_MS,
  ONE_MILLION,
  POLLING_INTERVAL_MS,
  POLLING_THROTTLE_RETRY_INTERVAL_MS,
} from '../../constants.js'
import React, {FunctionComponent, useRef, useState, useEffect} from 'react'

import {Static, Box, Text} from '@shopify/cli-kit/node/ink'

export interface LogsProps {
  pollAppLogs: ({jwtToken, cursor, filters}: PollOptions) => Promise<{
    cursor?: string
    errors?: {
      status: number
      message: string
    }[]
    appLogs?: AppLogData[]
  }>
  resubscribeCallback: () => Promise<string>
  pollOptions: PollOptions
}

interface AppLogPrefix {
  status: string
  source: string
  fuelConsumed: string
  functionId: string
  logTimestamp: string
}

export interface ProcessOutout {
  prefix: AppLogPrefix
  appLog: FunctionRunLog
}

const Logs: FunctionComponent<LogsProps> = ({
  pollAppLogs,
  pollOptions: {cursor = '', jwtToken, filters},
  resubscribeCallback,
}) => {
  const pollingInterval = useRef<NodeJS.Timeout>()
  const [processOutputs, setProcessOutputs] = useState<ProcessOutout[]>([])
  const [errorsState, setErrorsState] = useState<{status: number; message: string}[]>([])
  const [jwtTokenState, setJwtTokenState] = useState<string | null>(jwtToken)

  useEffect(() => {
    const pollLogs = async (currentCursor: string) => {
      let nextCursor = currentCursor
      let nextInterval = POLLING_INTERVAL_MS
      try {
        if (jwtTokenState === null) {
          try {
            const jwtToken = await resubscribeCallback()

            setJwtTokenState(jwtToken)
          } catch (error) {
            throw new Error("Couldn't resubscribe.")
          }
        } else {
          const {
            cursor: newCursor,
            errors,
            appLogs,
          } = await pollAppLogs({jwtToken: jwtTokenState, cursor: currentCursor, filters})
          nextCursor = newCursor || currentCursor // should we invoke with '' or currentCursor?

          if (errors && errors.length > 0) {
            if (errors.some((error) => error.status === 429)) {
              setErrorsState([
                ...errors,
                {status: 429, message: `Retrying in ${POLLING_THROTTLE_RETRY_INTERVAL_MS / 1000}s`},
              ])
              nextInterval = POLLING_THROTTLE_RETRY_INTERVAL_MS
            } else if (errors.some((error) => error.status === 401)) {
              setJwtTokenState(null)
            } else {
              setErrorsState([
                ...errors,
                {status: 400, message: `Retrying in ${POLLING_ERROR_RETRY_INTERVAL_MS / 1000}s`},
              ])
              nextInterval = POLLING_ERROR_RETRY_INTERVAL_MS
            }
          } else {
            setErrorsState([])
          }

          if (appLogs) {
            for (const log of appLogs) {
              // console.log(log)
              const appLog = parseFunctionRunPayload(log.payload)
              const fuel = (appLog.fuelConsumed / ONE_MILLION).toFixed(4)
              const prefix = {
                status: log.status === 'success' ? 'Success' : 'Failure',
                source: log.source,
                fuelConsumed: fuel,
                functionId: appLog.functionId,
                logTimestamp: log.log_timestamp,
              }

              setProcessOutputs((prev) => [...prev, {appLog, prefix}])
            }
          } else {
            // TODO:
            // if there no apps logs, display message saying 'waiting for app logs'
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        pollingInterval.current = setTimeout(() => {
          return pollLogs(nextCursor)
        }, nextInterval)
      } catch (error) {
        throw new Error('Error handling logs')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    pollLogs(cursor)

    return () => {
      if (pollingInterval.current) {
        clearTimeout(pollingInterval.current)
      }
    }
  }, [jwtTokenState])

  return (
    <>
      <Static items={processOutputs}>
        {(
          {
            appLog,
            prefix,
          }: {
            appLog: FunctionRunLog
            prefix: AppLogPrefix
          },
          index: number,
        ) => (
          <Box flexDirection="column" key={index}>
            {/* update: use invocationId after https://github.com/Shopify/shopify-functions/issues/235 */}
            <Box flexDirection="row" gap={0.5}>
              <Text color="green">{prefix.logTimestamp} </Text>
              <Text color="blueBright">{`${prefix.source}`}</Text>
              <Text color={prefix.status === 'Success' ? 'green' : 'red'}>{`${prefix.status}`}</Text>
              <Text> {`${prefix.functionId}`}</Text>
              <Text>in {prefix.fuelConsumed} M instructions</Text>
            </Box>
            <Text>{appLog.logs}</Text>
            {appLog.input && (
              <>
                <Text>Input ({appLog.inputBytes} bytes):</Text>
                <Text>{prettyPrintJsonIfPossible(appLog.input)}</Text>
              </>
            )}
            {appLog.output && (
              <>
                <Text>Output ({appLog.outputBytes} bytes):</Text>
                <Text>{prettyPrintJsonIfPossible(appLog.output)}</Text>
              </>
            )}
          </Box>
        )}
      </Static>

      {errorsState.length > 0 && (
        <Box flexDirection="column">
          {errorsState.map((error, index) => (
            <Box key={index}>
              <Text color="red">{error.message}</Text>
            </Box>
          ))}
        </Box>
      )}
    </>
  )
}

export {Logs}
