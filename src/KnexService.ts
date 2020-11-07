import Knex from 'knex';

import {
  ILogger,
  IProcessManagerService,
  IServiceHealth,
} from '@teamest/process-manager';

export interface IKnexServiceOptions {
  host: string;
  user: string;
  password: string;
  database: string;
}

export default class KnexService implements IProcessManagerService {
  logger: ILogger;
  options: IKnexServiceOptions;
  knex?: Knex;

  constructor(logger: ILogger, options: IKnexServiceOptions) {
    this.logger = logger;
    this.options = options;
  }

  getInstance(): Knex {
    if (!this.knex) {
      throw new Error('Knex not ready');
    }
    return this.knex;
  }

  getName(): string {
    return 'mysql';
  }

  async getHealth(): Promise<IServiceHealth> {
    if (this.knex) {
      try {
        await this.knex.raw('select 1+1 as result');
        return {
          healthy: true,
        };
      } catch (err) {
        return {
          healthy: false,
          message: `Failed to connect to mysql: ${err}`,
        };
      }
    }
    return {
      healthy: false,
      message: 'Knex instance not initialised',
    };
  }

  async start(): Promise<void> {
    this.logger.info(
      `Connecting to MySql ${this.options.user}@${this.options.host}`,
    );
    this.knex = Knex({
      client: 'mysql2',
      connection: this.options,
      migrations: {
        tableName: 'migrations',
      },
    });
  }

  stop(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
