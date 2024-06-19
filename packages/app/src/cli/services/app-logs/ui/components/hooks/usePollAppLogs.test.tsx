import {usePollAppLogs} from './usePollAppLogs.js'
import {pollAppLogsForLogs} from '../../../poll-app-logs-for-logs.js'
import {parseFunctionRunPayload} from '../../../utils.js'
import {render} from '@shopify/cli-kit/node/testing/ui'
import {test, describe, vi, beforeEach, afterEach, expect} from 'vitest'
import React from 'react'

vi.mock('../../../poll-app-logs-for-logs.js')

const MOCKED_JWT_TOKEN = 'mockedJwtToken'
const NEW_JWT_TOKEN = 'newJwt'
const MOCKED_CURSOR = 'mockedCursor'
const RETURNED_CURSOR = '2024-05-23T19:17:02.321773Z'
const FUNCTION_ID = 'e57b4d31-2038-49ff-a0a1-1eea532414f7'
const FUEL_CONSUMED = 512436
const TIME = '2024-06-18 16:02:04.868'

const LOG_TYPE = 'function-run'
const STATUS = 'success'
const SOURCE = 'my-function'
const LOGS = 'test logs'
const OUTPUT = {test: 'output'}
const INPUT = {test: 'input'}
const INPUT_BYTES = 10
const OUTPUT_BYTES = 10

const POLL_APP_LOGS_FOR_LOGS_RESPONSE = {
  cursor: RETURNED_CURSOR,
  appLogs: [
    {
      shop_id: 1,
      api_client_id: 1830457,
      payload: JSON.stringify({
        input: INPUT,
        input_bytes: INPUT_BYTES,
        output: OUTPUT,
        output_bytes: OUTPUT_BYTES,
        function_id: FUNCTION_ID,
        logs: LOGS,
        fuel_consumed: FUEL_CONSUMED,
      }),
      log_type: LOG_TYPE,
      cursor: RETURNED_CURSOR,
      status: STATUS,
      source: SOURCE,
      source_namespace: 'extensions',
      log_timestamp: TIME,
    },
  ],
}

const POLL_APP_LOGS_FOR_LOGS_401_RESPONSE = {
  errors: [{status: 401, message: 'Unauthorized'}],
}

const POLL_APP_LOGS_FOR_LOGS_429_RESPONSE = {
  errors: [{status: 429, message: 'Error Message'}],
}

describe('usePollAppLogs', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  test('returns logs on successful poll', async () => {
    const mockedPollAppLogs = vi.fn().mockResolvedValue(POLL_APP_LOGS_FOR_LOGS_RESPONSE)
    vi.mocked(pollAppLogsForLogs).mockImplementation(mockedPollAppLogs)

    const resubscribeCallback = vi.fn().mockResolvedValue(NEW_JWT_TOKEN)

    const hook = renderHook(() => usePollAppLogs({initialJwt: MOCKED_JWT_TOKEN, resubscribeCallback}))

    await vi.advanceTimersByTimeAsync(0)

    expect(mockedPollAppLogs).toHaveBeenCalledTimes(1)

    expect(hook.lastResult?.appLogOutputs).toHaveLength(1)
    expect(hook.lastResult?.appLogOutputs[0]!.appLog).toEqual(
      parseFunctionRunPayload(POLL_APP_LOGS_FOR_LOGS_RESPONSE.appLogs[0]!.payload),
    )

    expect(hook.lastResult?.appLogOutputs[0]!.prefix).toEqual({
      status: 'Success',
      source: SOURCE,
      fuelConsumed: (FUEL_CONSUMED / 1000000).toFixed(4),
      functionId: FUNCTION_ID,
      logTimestamp: TIME,
    })

    expect(vi.getTimerCount()).toEqual(1)
  })

  test('refreshes jwt after 401', async () => {
    const mockedPollAppLogs = vi
      .fn()
      .mockResolvedValueOnce(POLL_APP_LOGS_FOR_LOGS_401_RESPONSE)
      .mockResolvedValueOnce(POLL_APP_LOGS_FOR_LOGS_RESPONSE)
    vi.mocked(pollAppLogsForLogs).mockImplementation(mockedPollAppLogs)

    const resubscribeCallback = vi.fn().mockResolvedValue(NEW_JWT_TOKEN)

    renderHook(() => usePollAppLogs({initialJwt: MOCKED_JWT_TOKEN, resubscribeCallback}))

    // Initial invocation, 401 returned
    await vi.advanceTimersByTimeAsync(0)
    expect(mockedPollAppLogs).toHaveBeenCalledTimes(1)
    expect(resubscribeCallback).not.toHaveBeenCalledOnce()

    // Follow up invocation, which invokes resubscribeCallback
    await vi.advanceTimersByTimeAsync(0)
    expect(resubscribeCallback).toHaveBeenCalledOnce()

    expect(vi.getTimerCount()).toEqual(1)
  })

  test.only('retries after throttle interval on 429', async () => {
    const mockedPollAppLogs = vi.fn().mockResolvedValueOnce(POLL_APP_LOGS_FOR_LOGS_429_RESPONSE)
    vi.mocked(pollAppLogsForLogs).mockImplementation(mockedPollAppLogs)

    vi.spyOn(global, 'setTimeout')

    const resubscribeCallback = vi.fn().mockResolvedValue(NEW_JWT_TOKEN)

    renderHook(() => usePollAppLogs({initialJwt: MOCKED_JWT_TOKEN, resubscribeCallback}))

    // Initial invocation, 429 returned
    await vi.advanceTimersByTimeAsync(0)
    expect(mockedPollAppLogs).toHaveBeenCalledTimes(1)

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000)

    // // Follow up invocation, which invokes resubscribeCallback
    // await vi.advanceTimersByTimeAsync(0)
    // expect(resubscribeCallback).toHaveBeenCalledOnce()

    expect(vi.getTimerCount()).toEqual(1)
  })
})

function renderHook<THookResult>(renderHookCallback: () => THookResult) {
  const result: {
    lastResult: THookResult | undefined
  } = {
    lastResult: undefined,
  }

  const MockComponent = () => {
    const hookResult = renderHookCallback()
    result.lastResult = hookResult

    return null
  }

  render(<MockComponent />)

  return result
}
