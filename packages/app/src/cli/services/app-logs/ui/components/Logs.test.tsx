import {Logs} from './Logs.js'
import {pollAppLogsForLogs} from '../../poll-app-logs-for-logs.js'
import {AppLogData} from '../../types.js'
import {ONE_MILLION} from '../../helpers.js'
import {describe, test, vi, beforeEach, afterEach, expect} from 'vitest'
import {partnersFqdn} from '@shopify/cli-kit/node/context/fqdn'
import {render} from '@shopify/cli-kit/node/testing/ui'
import React from 'react'
import {unstyled} from '@shopify/cli-kit/node/output'

vi.mock('../../poll-app-logs-for-logs.js')

const FQDN = await partnersFqdn()
const MOCK_URL = '/app_logs/poll?cursor=mockedCursor'
const MOCKED_JWT_TOKEN = 'mockedJwtToken'
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

const RESPONSE_DATA_SUCCESS: {
  app_logs: AppLogData[]
  cursor: string
} = {
  app_logs: [
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
  cursor: RETURNED_CURSOR,
}

describe('Logs', () => {
  let mockedPollAppLogs: typeof pollAppLogsForLogs

  beforeEach(() => {
    vi.mocked(pollAppLogsForLogs).mockImplementation(mockedPollAppLogs)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  test('renders logs on successful polling', async () => {
    // Given
    mockedPollAppLogs = vi.fn().mockResolvedValue(RESPONSE_DATA_SUCCESS)

    // When
    const renderInstance = render(
      <Logs
        pollAppLogs={mockedPollAppLogs}
        pollOptions={{jwtToken: MOCKED_JWT_TOKEN, cursor: MOCKED_CURSOR}}
        resubscribeCallback={vi.fn().mockResolvedValueOnce(MOCKED_JWT_TOKEN)}
      />,
    )

    // Then
    expect(vi.getTimerCount()).toEqual(0)

    // Time less then the second poll
    await vi.advanceTimersByTimeAsync(1)

    expect(vi.getTimerCount()).toEqual(1)

    const lastFrame = renderInstance.lastFrame()

    expect(unstyled(lastFrame!)).toMatchInlineSnapshot(`
      "${TIME} ${SOURCE} ${STATUS === 'success' ? 'Success' : 'Failure'} ${FUNCTION_ID} in ${(
      FUEL_CONSUMED / ONE_MILLION
    ).toFixed(4)} M instructions
      test logs
      Input (${INPUT_BYTES} bytes):
      {
        \\"test\\": \\"input\\"
      }
      Output (${OUTPUT_BYTES} bytes):
      {
        \\"test\\": \\"output\\"
      }
      "
    `)

    // Add Second Poll

    renderInstance.unmount()
  })

  test('re-subscribes when jwtToken is null', async () => {})

  test('handles 401 status', async () => {})

  test('handles 429 status', async () => {})

  test('handles other errors', async () => {})
})
