import {DevContextOptions, ensureDevContext} from './context.js'
import {renderLogs} from './app-logs/ui.js'
import {subscribeToAppLogs} from './app-logs/utils.js'
import {pollAppLogsForLogs} from './app-logs/poll-app-logs-for-logs.js'
import {selectDeveloperPlatformClient, DeveloperPlatformClient} from '../utilities/developer-platform-client.js'
import {loadAppConfiguration} from '../models/app/loader.js'

interface LogsOptions {
  directory: string
  reset: boolean
  apiKey?: string
  storeFqdn?: string
  source?: string
  status?: string
  configName?: string
  userProvidedConfigName?: string
}

export async function logs(commandOptions: LogsOptions) {
  const logsConfig = await prepareForLogs(commandOptions)

  const variables = {
    shopIds: [logsConfig.storeId],
    apiKey: logsConfig.apiKey,
    token: '',
  }

  const jwtToken = await subscribeToAppLogs(logsConfig.developerPlatformClient, variables)

  console.log(jwtToken)

  const filters = {
    status: commandOptions.status,
    source: commandOptions.source,
  }

  const pollOptions = {
    jwtToken,
    filters,
  }

  await renderLogs({
    logsProcess: pollAppLogsForLogs,
    options: {
      variables,
      developerPlatformClient: logsConfig.developerPlatformClient,
    },
    pollOptions,
  })
}

async function prepareForLogs(commandOptions: LogsOptions): Promise<{
  storeId: string
  developerPlatformClient: DeveloperPlatformClient
  apiKey: string
}> {
  const {configuration} = await loadAppConfiguration({
    ...commandOptions,
    userProvidedConfigName: commandOptions.configName,
  })
  let developerPlatformClient = selectDeveloperPlatformClient({configuration})
  const devContextOptions: DevContextOptions = {...commandOptions, developerPlatformClient}
  const {storeId, remoteApp} = await ensureDevContext(devContextOptions)

  developerPlatformClient = remoteApp.developerPlatformClient ?? developerPlatformClient

  const apiKey = remoteApp.apiKey

  return {
    storeId,
    developerPlatformClient,
    apiKey,
  }
}
