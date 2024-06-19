// import {Logs} from './Logs.js'
// import {AppLogData} from '../../types.js'
// import {POLLING_ERROR_RETRY_INTERVAL_MS, ONE_MILLION, POLLING_THROTTLE_RETRY_INTERVAL_MS} from '../../constants.js'
// import {describe, test, vi, beforeEach, afterEach, expect} from 'vitest'
// import {render} from '@shopify/cli-kit/node/testing/ui'
// import React from 'react'
// import {unstyled} from '@shopify/cli-kit/node/output'

// vi.mock('../../poll-app-logs-for-logs.js')

// const MOCKED_JWT_TOKEN = 'mockedJwtToken'
// const MOCKED_CURSOR = 'mockedCursor'
// const RETURNED_CURSOR = '2024-05-23T19:17:02.321773Z'
// const FUNCTION_ID = 'e57b4d31-2038-49ff-a0a1-1eea532414f7'
// const FUEL_CONSUMED = 512436
// const TIME = '2024-06-18 16:02:04.868'

// const LOG_TYPE = 'function-run'
// const STATUS = 'success'
// const SOURCE = 'my-function'
// const LOGS = 'test logs'
// const OUTPUT = {test: 'output'}
// const INPUT = {test: 'input'}
// const INPUT_BYTES = 10
// const OUTPUT_BYTES = 10

// const POLL_APP_LOGS_RETURN_VALUE: {
//   cursor: string
//   errors?: {
//     status: number
//     message: string
//   }[]
//   appLogs: AppLogData[]
// } = {
//   cursor: RETURNED_CURSOR,
//   appLogs: [
//     {
//       shop_id: 1,
//       api_client_id: 1830457,
//       payload: JSON.stringify({
//         input: INPUT,
//         input_bytes: INPUT_BYTES,
//         output: OUTPUT,
//         output_bytes: OUTPUT_BYTES,
//         function_id: FUNCTION_ID,
//         logs: LOGS,
//         fuel_consumed: FUEL_CONSUMED,
//       }),
//       log_type: LOG_TYPE,
//       cursor: RETURNED_CURSOR,
//       status: STATUS,
//       source: SOURCE,
//       source_namespace: 'extensions',
//       log_timestamp: TIME,
//     },
//   ],
// }

// const POLL_APP_LOGS_401_RETURN_VALUE = {
//   errors: [{status: 401, message: 'Unauthorized'}],
// }

// const POLL_APP_LOGS_429_RETURN_VALUE = {
//   errors: [{status: 429, message: 'Error Message'}],
// }

// const POLL_APP_LOGS_OTHER_RETURN_VALUE = {
//   errors: [{status: 400, message: 'Error Message'}],
// }

// describe('Logs', () => {
//   // let mockedPollAppLogs = vi.fn().mockResolvedValue(POLL_APP_LOGS_RETURN_VALUE)

//   beforeEach(() => {
//     // vi.mocked(pollAppLogsForLogs).mockImplementation(mockedPollAppLogs)
//     vi.useFakeTimers()
//   })

//   afterEach(() => {
//     vi.clearAllTimers()
//   })

//   test.only('renders logs on successful polling', async () => {
//     // Given
//     let resolvePromise
//     const promise = new Promise<unknown>((resolve) => {
//       resolvePromise = resolve
//     })

//     const pollAppLogs = () => {
//       return Promise.resolve(POLL_APP_LOGS_RETURN_VALUE)
//     }

//     // When
//     const renderInstance = render(
//       <Logs
//         pollAppLogs={pollAppLogs}
//         pollOptions={{jwtToken: MOCKED_JWT_TOKEN, cursor: MOCKED_CURSOR}}
//         resubscribeCallback={vi.fn().mockResolvedValueOnce(MOCKED_JWT_TOKEN)}
//       />,
//     )

//     // Not sure why this fixes tests, but it does
//     // Think it has somethign to do with a race condition
//     // between the render and the test
//     await vi.advanceTimersByTimeAsync(0)
//     // await vi.advanceTimersToNextTimerAsync()

//     // Then
//     const lastFrame = renderInstance.lastFrame()

//     expect(unstyled(lastFrame!)).toMatchInlineSnapshot(`
//       "${TIME} ${SOURCE} ${STATUS === 'success' ? 'Success' : 'Failure'} ${FUNCTION_ID} in ${(
//       FUEL_CONSUMED / ONE_MILLION
//     ).toFixed(4)} M instructions
//       test logs
//       Input (${INPUT_BYTES} bytes):
//       {
//         \\"test\\": \\"input\\"
//       }
//       Output (${OUTPUT_BYTES} bytes):
//       {
//         \\"test\\": \\"output\\"
//       }
//       "
//     `)

//     // Ensure next poll was enqueued
//     expect(vi.getTimerCount()).toEqual(1)

//     renderInstance.unmount()
//   })

//   test('handles 401 status and re-subscribes', async () => {
//     const mockedPollAppLogs = vi
//       .fn()
//       .mockResolvedValueOnce(POLL_APP_LOGS_401_RETURN_VALUE)
//       .mockResolvedValueOnce(POLL_APP_LOGS_RETURN_VALUE)

//     const mockedResubscribeCallback = vi.fn().mockResolvedValueOnce(MOCKED_JWT_TOKEN)

//     const renderInstance = render(
//       <Logs
//         pollAppLogs={mockedPollAppLogs}
//         pollOptions={{jwtToken: MOCKED_JWT_TOKEN, cursor: MOCKED_CURSOR}}
//         resubscribeCallback={mockedResubscribeCallback}
//       />,
//     )

//     await vi.advanceTimersByTimeAsync(1)

//     // Then

//     // Do we want this?
//     expect(unstyled(renderInstance.lastFrame()!)).toMatchInlineSnapshot(`""`)

//     // Ensure next poll was enqueued
//     expect(vi.getTimerCount()).toEqual(1)

//     await vi.advanceTimersToNextTimerAsync()

//     expect(mockedResubscribeCallback).toHaveBeenCalledTimes(1)

//     await vi.advanceTimersToNextTimerAsync()

//     // Next poll returns result
//     expect(unstyled(renderInstance.lastFrame()!)).toMatchInlineSnapshot(`
//       "${TIME} ${SOURCE} ${STATUS === 'success' ? 'Success' : 'Failure'} ${FUNCTION_ID} in ${(
//       FUEL_CONSUMED / ONE_MILLION
//     ).toFixed(4)} M instructions
//       test logs
//       Input (${INPUT_BYTES} bytes):
//       {
//         \\"test\\": \\"input\\"
//       }
//       Output (${OUTPUT_BYTES} bytes):
//       {
//         \\"test\\": \\"output\\"
//       }
//       "
//     `)

//     renderInstance.unmount()
//   })

//   test('handles 429 status', async () => {
//     const mockedPollAppLogs = vi.fn().mockResolvedValue(POLL_APP_LOGS_429_RETURN_VALUE)

//     const renderInstance = await render(
//       <Logs
//         pollOptions={{jwtToken: MOCKED_JWT_TOKEN, cursor: MOCKED_CURSOR}}
//         resubscribeCallback={vi.fn().mockResolvedValueOnce(MOCKED_JWT_TOKEN)}
//       />,
//     )

//     await vi.advanceTimersByTimeAsync(200)
//     // await vi.advanceTimersToNextTimerAsync()

//     // Then
//     const lastFrame = renderInstance.lastFrame()

//     // Do we want this?
//     expect(unstyled(lastFrame!)).toMatchInlineSnapshot(`
//       "Error Message
//       Retrying in ${POLLING_THROTTLE_RETRY_INTERVAL_MS / 1000}s"
//     `)

//     // Ensure next poll was enqueued
//     expect(vi.getTimerCount()).toEqual(1)

//     renderInstance.unmount()
//   })

//   test('handles other errors', async () => {
//     const mockedPollAppLogs = vi.fn().mockResolvedValue(POLL_APP_LOGS_OTHER_RETURN_VALUE)

//     const renderInstance = await render(
//       <Logs

//         pollOptions={{jwtToken: MOCKED_JWT_TOKEN, cursor: MOCKED_CURSOR}}
//         resubscribeCallback={vi.fn().mockResolvedValueOnce(MOCKED_JWT_TOKEN)}
//       />,
//     )

//     await vi.advanceTimersByTimeAsync(200)
//     // await vi.advanceTimersToNextTimerAsync()

//     // Then
//     const lastFrame = renderInstance.lastFrame()

//     // Do we want this?
//     expect(unstyled(lastFrame!)).toMatchInlineSnapshot(`
//       "Error Message
//       Retrying in ${POLLING_ERROR_RETRY_INTERVAL_MS / 1000}s"
//     `)

//     // Ensure next poll was enqueued
//     expect(vi.getTimerCount()).toEqual(1)

//     renderInstance.unmount()
//   })
// })
