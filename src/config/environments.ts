import path from 'path';
import dotenv from 'dotenv';
import envSchema from 'env-schema';
import S from 'fluent-json-schema';

export const loadConfig = (): void => {
  const result = dotenv.config({
    path: path.join(__dirname, `../../.env`),
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  const scheme = {
    data: result.parsed,
    schema: S.object()
      .prop('NODE_ENV', S.string().enum(['dev', 'production']).required())
      .prop('API_PORT', S.number().required()),
  };
  envSchema(scheme);
};

export default loadConfig;
