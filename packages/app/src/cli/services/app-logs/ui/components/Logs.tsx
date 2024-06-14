import {PollOptions, FunctionRunLog} from '../../types.js'
import {currentTime} from '../../utils.js'
import React, {FunctionComponent, useRef, useState, useEffect} from 'react'

import {Static, Box, Text} from '@shopify/cli-kit/node/ink'

export interface LogsProps {
  errorHandledLogsProcess: ErrorHandleLogsProcess
  resubscribeCallback: () => Promise<string>
  pollOptions: PollOptions
}

interface AppLogPrefix {
  status: string
  source: string
  fuelConsumed: string
  functionId: string
}

interface ErrorHandleProcessInput {
  handleJwtUpdate: (jwtToken: string | null) => void
  handleErrors: (error: {status: number; message: string}[]) => void
  handleAppLog: (input: ProcessOutout) => void
  jwtToken: string
  cursor: string
  filters?: {
    status?: string
    source?: string
  }
}

type ErrorHandleLogsProcess = ({
  handleJwtUpdate,
  jwtToken,
  cursor,
  handleErrors,
  handleAppLog,
  filters,
}: ErrorHandleProcessInput) => Promise<{
  cursor: string
  nextInterval: number
}>

export interface ProcessOutout {
  prefix: AppLogPrefix
  appLog: FunctionRunLog
}

const Logs: FunctionComponent<LogsProps> = ({
  errorHandledLogsProcess: logsProcess,
  pollOptions: {cursor = '', jwtToken, filters},
  resubscribeCallback,
}) => {
  const pollingInterval = useRef<NodeJS.Timeout>()
  const [processOutputs, setProcessOutputs] = useState<ProcessOutout[]>([])
  const [errorsState, setErrorsState] = useState<{status: number; message: string}[]>([])
  const [jwtTokenState, setJwtTokenState] = useState<string | null>(jwtToken)

  const handleAppLogErrors = (error: {status: number; message: string}[]) => {
    const userFacingErrors = error.filter((error) => {
      return error.status === 401 || error.status === 429 || error.status >= 500
    })
    if (userFacingErrors) {
      const errors = error.map((error) => {
        return {status: error.status, message: error.message}
      })
      setErrorsState(errors)
    } else {
      setErrorsState([{status: 500, message: 'Error while fetching'}])
    }
  }

  const handleAppLog = ({appLog, prefix}: {appLog: FunctionRunLog; prefix: AppLogPrefix}) => {
    setProcessOutputs((prev) => [...prev, {appLog, prefix}])
  }

  useEffect(() => {
    const pollLogs = async (currentCursor: string) => {
      try {
        if (jwtTokenState === null) {
          try {
            const jwtToken = await resubscribeCallback()

            setJwtTokenState(jwtToken)
          } catch (error) {
            throw new Error("Couldn't resubscribe.")
          }
        }
        const {cursor, nextInterval} = await logsProcess({
          jwtToken: jwtTokenState || jwtToken,
          cursor: currentCursor,
          filters,
          handleErrors: handleAppLogErrors,
          handleAppLog,
          handleJwtUpdate: setJwtTokenState,
        })

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        pollingInterval.current = setTimeout(() => {
          return pollLogs(cursor || currentCursor)
        }, nextInterval)
      } catch (error) {
        throw new Error('Error polling logs')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    pollLogs(cursor)

    return () => {
      if (pollingInterval.current) {
        clearTimeout(pollingInterval.current)
      }
    }
  }, [cursor, jwtToken])

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
              <Text color="green">{currentTime()} </Text>
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
              <Text color="red">{currentTime()} </Text>
              <Text color="red">{error.message}</Text>
            </Box>
          ))}
        </Box>
      )}
    </>
  )
}

export {Logs}

function prettyPrintJsonIfPossible(json: unknown) {
  try {
    if (typeof json === 'string') {
      const jsonObject = JSON.parse(json)
      return JSON.stringify(jsonObject, null, 2)
    } else if (typeof json === 'object' && json !== null) {
      return JSON.stringify(json, null, 2)
    } else {
      return json
    }
  } catch (error) {
    throw new Error(`Error parsing JSON: ${error}`)
  }
}
