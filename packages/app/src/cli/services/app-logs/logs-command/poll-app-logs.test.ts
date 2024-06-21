import {pollAppLogs} from './poll-app-logs.js'
import {fetchAppLogs} from '../utils.js'
import {describe, test, vi, expect} from 'vitest'

vi.mock('@shopify/cli-kit/node/output')
vi.mock('@shopify/cli-kit/node/context/fqdn')
vi.mock('@shopify/cli-kit/node/http')
vi.mock('@shopify/cli-kit/node/ui')
vi.mock('../utils.js')

const MOCKED_JWT_TOKEN = 'mockedJwtToken'
const MOCKED_CURSOR = 'mockedCursor'

const LOGS = '1\\n2\\n3\\n4\\n'
const FUNCTION_ERROR = 'function_error'

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
const RESPONSE_422 = {
  errors: ['422: Unprocessable'],
}

const RESPONSE_429 = {
  errors: ['429: Resubscribe'],
}

const RESPONSE_500 = {
  errors: ['500: Error'],
}

const EMPTY_FILTERS = {status: undefined, source: undefined}

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

    // // When
    const result = await pollAppLogs({
      jwtToken: MOCKED_JWT_TOKEN,
      cursor: MOCKED_CURSOR,
      filters: EMPTY_FILTERS,
    })

    expect(result).toEqual({
      cursor: RETURNED_CURSOR,
      appLogs: RESPONSE_DATA_SUCCESS.app_logs,
    })
  })

  test('successful poll with filters', async () => {
    // Given
    const mockedFetchAppLogs = vi.fn().mockResolvedValueOnce(createMockResponse(RESPONSE_DATA_SUCCESS))
    vi.mocked(fetchAppLogs).mockImplementation(mockedFetchAppLogs)

    // // When
    const result = await pollAppLogs({
      jwtToken: MOCKED_JWT_TOKEN,
      cursor: MOCKED_CURSOR,
      filters: {status: 'failure', source: 'my-function'},
    })

    expect(result).toEqual({
      cursor: RETURNED_CURSOR,
      appLogs: [],
    })
  })

  test('returns errors when response is 401/429/500', async () => {
    // Given
    const status = 401
    const statusText = '401: Unauthorized'

    const mockedFetchAppLogs = vi.fn().mockResolvedValueOnce(createMockResponse(RESPONSE_401, status, statusText))
    vi.mocked(fetchAppLogs).mockImplementation(mockedFetchAppLogs)

    // When
    const result = await pollAppLogs({
      jwtToken: MOCKED_JWT_TOKEN,
      cursor: MOCKED_CURSOR,
      filters: EMPTY_FILTERS,
    })

    // Then
    expect(result).toEqual({
      errors: [{status, message: statusText}],
    })
  })

  test('polling with other error status', async () => {
    // Given
    const status = 422
    const statusText = '422: Unprocessable'

    const mockedFetchAppLogs = vi.fn().mockResolvedValueOnce(createMockResponse(RESPONSE_422, status, statusText))
    vi.mocked(fetchAppLogs).mockImplementation(mockedFetchAppLogs)

    // When/Then
    await expect(() =>
      pollAppLogs({
        jwtToken: MOCKED_JWT_TOKEN,
        cursor: MOCKED_CURSOR,
        filters: EMPTY_FILTERS,
      }),
    ).rejects.toThrowError()
  })
})
