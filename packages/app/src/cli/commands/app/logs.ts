import Dev from './dev.js'
import Command from '../../utilities/app-command.js'
import {checkFolderIsValidApp} from '../../models/app/loader.js'
import {logs} from '../../services/logs.js'
import {environmentVariableNames} from '../../constants.js'
import {Flags} from '@oclif/core'
import {getEnvironmentVariables} from '@shopify/cli-kit/node/environment'
import {isTruthy} from '@shopify/cli-kit/node/context/utilities'

export default class Logs extends Command {
  static hidden = true
  static summary = 'Stream detailed logs for your Shopify app.'

  static descriptionWithMarkdown = `
  Opens a real-time stream of detailed log events from the selected app and store. Use the \`--source\` argument to limit output to a particular log source, such as a Shopify Function or webhook topic.
  \`\`\`
  shopify app logs
  \`\`\`
  `

  static description = this.descriptionWithoutMarkdown()

  static flags = {
    ...Dev.flags,
    source: Flags.string({
      description: 'Filters output to the specified log source (Multiple flags allowed).',
      env: 'SHOPIFY_FLAG_SOURCE',
    }),
    status: Flags.string({
      description: 'Filters output to the specified status (success or failure).',
      env: 'SHOPIFY_FLAG_STATUS',
    }),
  }

  public async run(): Promise<void> {
    const env = getEnvironmentVariables()
    const logPollingEnabled = isTruthy(env[environmentVariableNames.enableAppLogPolling])

    if (!logPollingEnabled) {
      throw new Error(
        'This command is not released yet. You can experiment with it by setting SHOPIFY_CLI_ENABLE_APP_LOG_POLLING=1 in your env.',
      )
    }
    const {flags} = await this.parse(Logs)

    const apiKey = flags['client-id'] || flags['api-key']

    await checkFolderIsValidApp(flags.path)
    const logOptions = {
      apiKey,
      directory: flags.path,
      storeFqdn: flags.store,
      source: flags.source,
      status: flags.status,
      configName: flags.config,
      reset: flags.reset,
    }

    await logs(logOptions)
  }
}
