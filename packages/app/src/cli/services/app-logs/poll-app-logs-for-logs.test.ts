import {fetchAppLogs, generateFetchAppLogUrl} from './helpers.js'
import {pollAppLogsForLogs} from './poll-app-logs-for-logs.js'
import {describe, test, vi, expect} from 'vitest'
import {partnersFqdn} from '@shopify/cli-kit/node/context/fqdn'

vi.mock('@shopify/cli-kit/node/output')
vi.mock('@shopify/cli-kit/node/context/fqdn')
vi.mock('@shopify/cli-kit/node/http')
vi.mock('./helpers.js')

const FQDN = await partnersFqdn()
const MOCK_URL = '/app_logs/poll?cursor=mockedCursor'
const MOCKED_JWT_TOKEN = 'mockedJwtToken'
const MOCKED_CURSOR = 'mockedCursor'

const LOGS = '1\\n2\\n3\\n4\\n'
const FUNCTION_ERROR = 'function_error'
const FUNCTION_RUN = 'function_run'

const INPUT = {
  cart: {
    lines: [
      {
        quantity: 3,
        merchandise: {
          __typename: 'ProductVariant',
          id: 'gid:\\/\\/shopify\\/ProductVariant\\/2',
        },
      },
    ],
  },
}
const OUTPUT = {
  discountApplicationStrategy: 'FIRST',
  discounts: [
    {
      message: '10% off',
      value: {
        percentage: {
          value: 10,
        },
      },
      targets: [
        {
          productVariant: {
            id: 'gid://shopify/ProductVariant/2',
          },
        },
      ],
    },
  ],
}
const SOURCE = 'my-function'
const FUNCTION_PAYLOAD = {
  input: JSON.stringify(INPUT),
  input_bytes: 123,
  output: JSON.stringify(OUTPUT),
  output_bytes: 182,
  function_id: 'e57b4d31-2038-49ff-a0a1-1eea532414f7',
  logs: LOGS,
  fuel_consumed: 512436,
}
const FAILURE_PAYLOAD = {
  input: INPUT,
  input_bytes: 123,
  output: OUTPUT,
  output_bytes: 182,
  function_id: 'e57b4d31-2038-49ff-a0a1-1eea532414f7',
  logs: LOGS,
  error_type: FUNCTION_ERROR,
}
const OTHER_PAYLOAD = {some: 'arbitrary payload'}
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

const RESPONSE_401 = {
  errors: ['401: Unauthorized'],
}

const RESPONSE_429 = {
  errors: ['429: Resubscribe'],
}

const RESPONSE_500 = {
  errors: ['500: Error'],
}

// Custom mock response with .json method to mock response from poll
const createMockResponse = (data: any, status = 200, statusText = 'OK') => {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }
}

describe('pollProcess', () => {
  test('successful poll', async () => {
    // Given
    const mockedFetchAppLogs = vi.fn().mockResolvedValueOnce(createMockResponse(RESPONSE_DATA_SUCCESS))
    vi.mocked(fetchAppLogs).mockImplementation(mockedFetchAppLogs)

    const mockedUrl = vi.fn().mockResolvedValueOnce(`https://${FQDN}${MOCK_URL}`)
    vi.mocked(generateFetchAppLogUrl).mockImplementation(mockedUrl)

    // // When
    const result = await pollAppLogsForLogs({
      jwtToken: MOCKED_JWT_TOKEN,
      cursor: MOCKED_CURSOR,
      filters: {},
    })

    // Then
    expect(fetchAppLogs).toHaveBeenCalledWith(`https://${FQDN}${MOCK_URL}`, MOCKED_JWT_TOKEN)

    expect(result).toEqual({
      cursor: RETURNED_CURSOR,
      appLogs: RESPONSE_DATA_SUCCESS.app_logs,
    })
  })

  test('polling with 401 status', async () => {
    // Given
    const status = 401
    const statusText = 'Unauthorized'
    const mockedUrl = vi.fn().mockResolvedValueOnce(`https://${FQDN}${MOCK_URL}`)
    vi.mocked(generateFetchAppLogUrl).mockImplementation(mockedUrl)

    const mockedFetchAppLogs = vi.fn().mockResolvedValueOnce(createMockResponse(RESPONSE_401, status, statusText))
    vi.mocked(fetchAppLogs).mockImplementation(mockedFetchAppLogs)

    // When
    const result = await pollAppLogsForLogs({
      jwtToken: MOCKED_JWT_TOKEN,
      cursor: MOCKED_CURSOR,
      filters: {},
    })

    // Then
    expect(fetchAppLogs).toHaveBeenCalledWith(`https://${FQDN}${MOCK_URL}`, MOCKED_JWT_TOKEN)
    expect(result).toEqual({
      errors: [{status, message: statusText}],
    })
  })

  test('polling with 429 status', async () => {
    // Given
    const status = 429
    const statusText = 'Resubscribe'
    const mockedUrl = vi.fn().mockResolvedValueOnce(`https://${FQDN}${MOCK_URL}`)
    vi.mocked(generateFetchAppLogUrl).mockImplementation(mockedUrl)

    const mockedFetchAppLogs = vi.fn().mockResolvedValueOnce(createMockResponse(RESPONSE_429, status, statusText))
    vi.mocked(fetchAppLogs).mockImplementation(mockedFetchAppLogs)

    // When
    const result = await pollAppLogsForLogs({
      jwtToken: MOCKED_JWT_TOKEN,
      cursor: MOCKED_CURSOR,
      filters: {},
    })

    // Then
    expect(fetchAppLogs).toHaveBeenCalledWith(`https://${FQDN}${MOCK_URL}`, MOCKED_JWT_TOKEN)

    expect(result).toEqual({
      errors: [{status, message: statusText}],
    })
  })

  test('polling with other error status', async () => {
    // Given
    const status = 500
    const statusText = 'Error'
    const mockedUrl = vi.fn().mockResolvedValueOnce(`https://${FQDN}${MOCK_URL}`)
    vi.mocked(generateFetchAppLogUrl).mockImplementation(mockedUrl)

    const mockedFetchAppLogs = vi.fn().mockResolvedValueOnce(createMockResponse(RESPONSE_500, status, statusText))
    vi.mocked(fetchAppLogs).mockImplementation(mockedFetchAppLogs)

    // When
    const result = await pollAppLogsForLogs({
      jwtToken: MOCKED_JWT_TOKEN,
      cursor: MOCKED_CURSOR,
      filters: {},
    })

    // Then
    expect(fetchAppLogs).toHaveBeenCalledWith(`https://${FQDN}${MOCK_URL}`, MOCKED_JWT_TOKEN)

    expect(result).toEqual({
      errors: [{status, message: statusText}],
    })
  })
})
