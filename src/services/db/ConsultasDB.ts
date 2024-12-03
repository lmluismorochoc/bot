import { Knex } from 'knex';
import database from '../../database';
import moment from 'moment';
import { QueryRequest } from '../../types';

export class ConsultasDB {
  private db = database;

  async checkPackageaAccount(company_id: number): Promise<number> {
    try {
      const hasBalance = await this.db
        .raw(
          `
        select qp.id_query_package, qp.initial_count, queries.queries
          from query_packages qp
          left join lateral (
              select count(*) as queries from query_request qr
              where qr.query_package_id=qp.id_query_package
          ) queries on true
          where qp.active=true and completed=false and company_id=?
          and qp.initial_count > queries.queries
      `,
          [company_id],
        )
        .then((result) => result.rows[0]);
      return hasBalance.id_query_package;
    } catch (err) {
      console.log({
        origin: 'checkPackageaAccount',
        message: err.message,
        data: { company_id },
      });
      return null;
    }
  }

  async insertIntoQueryRequest(params: QueryRequest): Promise<QueryRequest> {
    try {
      const query = await this.db('query_request')
        .insert(params)
        .returning('*');
      return query[0];
    } catch (err) {
      console.log({
        origin: 'insertIntoQueryRequest',
        message: err.message,
        data: { params },
      });
      return null;
    }
  }
}
