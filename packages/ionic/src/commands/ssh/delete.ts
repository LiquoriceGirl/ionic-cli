import chalk from 'chalk';

import { validators } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun, isSSHKeyListResponse } from '@ionic/cli-utils';

import { SSHBaseCommand } from './base';

export class SSHDeleteCommand extends SSHBaseCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'delete',
      type: 'global',
      description: 'Delete an SSH public key from Ionic',
      inputs: [
        {
          name: 'key-id',
          description: 'The ID of the public key to delete',
          validators: [validators.required],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { createFatalAPIFormat } = await import('@ionic/cli-utils/lib/http');

    if (!inputs[0]) {
      const config = await this.env.config.load();
      const token = await this.env.session.getUserToken();

      const { req } = await this.env.client.make('GET', `/users/${config.user.id}/sshkeys`);
      req.set('Authorization', `Bearer ${token}`);
      const res = await this.env.client.do(req);

      if (!isSSHKeyListResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      if (res.data.length === 0) {
        this.env.log.warn(`No SSH keys found. Use ${chalk.green('ionic ssh add')} to add keys to Ionic.`);
      }

      inputs[0] = await this.env.prompt({
        type: 'list',
        name: 'id',
        message: 'Which SSH keys would you like to delete from Ionic?',
        choices: res.data.map(key => ({
          name: `${key.fingerprint} ${key.name} ${key.annotation}`,
          value: key.id,
        })),
      });
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const id = inputs[0];

    const config = await this.env.config.load();
    const token = await this.env.session.getUserToken();

    const { req } = await this.env.client.make('DELETE', `/users/${config.user.id}/sshkeys/${id}`);
    req.set('Authorization', `Bearer ${token}`);
    await this.env.client.do(req);

    this.env.log.ok(`Your public key (${chalk.bold(id)}) has been deleted from Ionic.`);
  }
}
