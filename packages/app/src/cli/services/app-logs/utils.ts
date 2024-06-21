import {FunctionRunLog} from './types.js'
import {DeveloperPlatformClient} from '../../utilities/developer-platform-client.js'
import {AppLogsSubscribeVariables} from '../../api/graphql/subscribe_to_app_logs.js'
import {fetch, Response} from '@shopify/cli-kit/node/http'
import {outputDebug, outputWarn} from '@shopify/cli-kit/node/output'
import {partnersFqdn} from '@shopify/cli-kit/node/context/fqdn'
import {AbortError} from '@shopify/cli-kit/node/error'

export const POLLING_INTERVAL_MS = 450
export const POLLING_ERROR_RETRY_INTERVAL_MS = 5 * 1000
export const POLLING_THROTTLE_RETRY_INTERVAL_MS = 60 * 1000
export const ONE_MILLION = 1000000
export const LOG_TYPE_FUNCTION_RUN = 'function_run'

export function parseFunctionRunPayload(payload: string): FunctionRunLog {
  const parsedPayload = JSON.parse(payload)
  return {
    input: parsedPayload.input,
    inputBytes: parsedPayload.input_bytes,
    output: parsedPayload.output,
    outputBytes: parsedPayload.output_bytes,
    logs: parsedPayload.logs,
    functionId: parsedPayload.function_id,
    fuelConsumed: parsedPayload.fuel_consumed,
    errorMessage: parsedPayload.error_message,
    errorType: parsedPayload.error_type,
  }
}

const generateFetchAppLogUrl = async (
  cursor?: string,
  filters?: {
    status?: string
    source?: string
  },
) => {
  const fqdn = await partnersFqdn()
  let url = `https://${fqdn}/app_logs/poll`

  if (!cursor) {
    return url
  }

  url += `?cursor=${cursor}`

  if (filters?.status) {
    url += `&status=${filters.status}`
  }
  if (filters?.source) {
    url += `&source=${filters.source}`
  }

  return url
}

export const fetchAppLogs = async (
  jwtToken: string,
  cursor?: string,
  filters?: {
    status?: string
    source?: string
  },
): Promise<Response> => {
  const url = await generateFetchAppLogUrl(cursor, filters)
  return fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
  })
}

export const subscribeToAppLogs = async (
  developerPlatformClient: DeveloperPlatformClient,
  variables: AppLogsSubscribeVariables,
): Promise<string> => {
  const result = await developerPlatformClient.subscribeToAppLogs(variables)
  const {jwtToken, success, errors} = result.appLogsSubscribe
  outputDebug(`Token: ${jwtToken}\n`)
  outputDebug(`API Key: ${variables.apiKey}\n`)
  if (errors && errors.length > 0) {
    const errorOutput = errors.join(', ')
    outputWarn(`Errors subscribing to app logs: ${errorOutput}`)
    outputWarn('App log streaming is not available in this session.')
    throw new AbortError(errorOutput)
  } else {
    outputDebug(`Subscribed to App Events for shop ID(s) ${variables.shopIds}`)
    outputDebug(`Success: ${success}\n`)
  }
  return jwtToken
}

export function prettyPrintJsonIfPossible(json: unknown) {
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
