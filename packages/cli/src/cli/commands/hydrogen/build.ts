import {asyncTasks} from '../../services/kitchen-sink/async.js'
import Command from '@shopify/cli-kit/node/base-command'

/**
 * This command is used to output all the async UI components of the CLI.
 * It's useful to test how they behave under different terminal sizes
 * and to help update the documentation when they change.
 */
export default class KitchenSinkAsync extends Command {
  static description = 'Build a hydrogen project'

  async run(): Promise<void> {
    console.log("Looks like you're trying to run a Hydrogen command outside of a Hydrogen project.")
  }
}
