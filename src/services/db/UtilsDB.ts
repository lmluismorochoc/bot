import { Knex } from 'knex';
import database from '../../database';
import { GeneralConfig, GeneralConfigParams } from '../../types';

export class UtilsDB {
  private db = database;

  async getGlobalConfig(
    config: GeneralConfigParams,
    trx?: Knex.Transaction,
  ): Promise<GeneralConfig> {
    const db = trx || this.db;
    try {
      const configObj = await db('company_configs')
        .where({
          config,
          active: true,
        })
        .first();
      return configObj;
    } catch (err) {
      return null;
    }
  }

  async updateGlobalConfig(
    params: {
      config: GeneralConfigParams;
      value?: string;
      json_value?: unknown;
    },
    trx?: Knex.Transaction,
  ): Promise<boolean> {
    const db = trx || this.db;
    try {
      await db('company_configs').update(params).where({
        config: params.config,
      });
      return true;
    } catch (err) {
      return null;
    }
  }
}
