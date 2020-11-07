import Knex from 'knex';

import {
  ILogger,
  IProcessManagerService,
  IServiceHealth,
  IServiceStatus,
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
  state: 'stopped' | 'starting' | 'running' | 'stopping';

  constructor(logger: ILogger, options: IKnexServiceOptions) {
    this.logger = logger;
    this.options = options;
    this.state = 'stopped';
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
          healthy: 'healthy',
        };
      } catch (err) {
        return {
          healthy: 'unhealthy',
          message: `Failed to connect to mysql: ${err}`,
        };
      }
    }
    return {
      healthy: 'unhealthy',
      message: 'Knex instance not initialised',
    };
  }

  getStatus(): IServiceStatus {
    return {
      state: this.state,
    };
  }

  async start(): Promise<void> {
    this.state = 'starting';
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
    try {
      await this.knex.raw('select 1+1 as result');
    } finally {
      this.state = 'running';
    }
  }

  stop(): Promise<void> {
    this.logger.info('Attempting to close mysql connections')
    this.state = 'stopping';
    if (this.knex) {
      return new Promise((res, rej) => {
        try {
          this.knex?.destroy(() => {
            this.logger.info('mysql connections closed successfully');
            this.state = 'stopped';
            res();
          });
        } catch (err) {
          rej(err);
        }
      });
    } else {
      this.state = 'stopped';
      this.logger.info('No connections to close, stopped');
      return Promise.resolve();
    }
  }
}
