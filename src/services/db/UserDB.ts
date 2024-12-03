import { Knex } from 'knex';
import database from '../../database';
import { User } from '../../types';

export class UserDB {
  private db = database;
  async getUserByChatID(chat_id: number | string): Promise<User> {
    try {
      const user = await this.db
        .raw(
          `
          select u.id_user, u.name, u.chat_id, u.company_id
          from users u
          where u.active=true and chat_id=?
      `,
          [chat_id],
        )
        .then((result) => result.rows[0]);

      return user;
    } catch (err) {
      console.log({
        origin: 'getUserByChatID',
        message: err.message,
        data: { chat_id },
      });
      return null;
    }
  }

  async insertUser(userInput: {
    name: string;
    chat_id: number;
    company_id: number;
  }): Promise<User> {
    try {
      const user = await this.db('users').insert(userInput).returning('*');
      return user[0];
    } catch (err) {
      console.log({
        origin: 'insertUser',
        message: err.message,
        data: { userInput },
      });
      return null;
    }
  }

  async getCompanyByName(company_name: string): Promise<number> {
    try {
      const company = await this.db('companies')
        .where({
          company_name,
          active: true,
        })
        .first();
      return company.id_company;
    } catch (err) {
      console.log({
        origin: 'getCompanyByName',
        message: err.message,
        data: { company_name },
      });
      return null;
    }
  }
}
