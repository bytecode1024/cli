import {pollAppLogsForLogs} from '../../poll-app-logs-for-logs.js'
import {describe, test, vi, beforeEach} from 'vitest'
import {partnersFqdn} from '@shopify/cli-kit/node/context/fqdn'

vi.mock('../../poll-app-logs-for-logs.js')
vi.mock('../../helpers.js')

const FQDN = await partnersFqdn()
const MOCK_URL = '/app_logs/poll?cursor=mockedCursor'
const MOCKED_JWT_TOKEN = 'mockedJwtToken'
const MOCKED_CURSOR = 'mockedCursor'
const RETURNED_CURSOR = '2024-05-23T19:17:02.321773Z'

const RESPONSE_DATA_SUCCESS = {
  app_logs: [
    {
      shop_id: 1,
      api_client_id: 1830457,
      payload: JSON.stringify({
        input: JSON.stringify({}),
        input_bytes: 123,
        output: JSON.stringify({}),
        output_bytes: 182,
        function_id: 'e57b4d31-2038-49ff-a0a1-1eea532414f7',
        logs: '1\\n2\\n3\\n4\\n',
        fuel_consumed: 512436,
      }),
      log_type: 'function_run',
      cursor: RETURNED_CURSOR,
      status: 'success',
      source: 'my-function',
      source_namespace: 'extensions',
      log_timestamp: '2024-05-23T19:17:00.240053Z',
    },
  ],
  cursor: RETURNED_CURSOR,
}

const createMockResponse = (data: unknown, status = 200, statusText = 'OK') => {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }
}

describe('Logs', () => {
  let mockedLogProcess: typeof pollAppLogsForLogs
  beforeEach(() => {
    vi.mocked(pollAppLogsForLogs).mockImplementation(mockedLogProcess)

    // TO STUB:
    // The <Logs /> component is a React component that fetches logs from the server and displays them in the terminal.
    // its takes in errorHandledLogsProcess, which is appLogsForLogs, and the errors and output are handled and to be used by the Logs component
    // In this error handle process, the rebscrube will need to be mocked
    // and the app fetch will need to be mocked
    // fetchAppLogs needed to be mocked, we have example of this
    // option1: alternatively, just mock pollAppLogsForLogs and return the expected response
  })

  test('renders logs on successful polling', async () => {
    // Given
    mockedLogProcess = vi.fn().mockResolvedValueOnce(createMockResponse(RESPONSE_DATA_SUCCESS))

    // option1: mock pollAppLogsForLogs and return the expected response
    //     this needs to get mocked: so that data is returned as expected
    /*

  const data = (await response.json()) as {
    app_logs?: AppLogData[]
    cursor?: string
    errors?: string[]
  }
aka need to make sure the response.json(), returns the expected data
*/
  })

  test('re-subscribes when jwtToken is null', async () => {})

  test('handles 401 status', async () => {})

  test('handles 429 status', async () => {})

  test('handles other errors', async () => {})
})
