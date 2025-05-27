export type IResponse = Record<any, any>;
export type IRequest = Record<any, any>;

export type HTTPMethod =
  | 'get'
  | 'GET'
  | 'delete'
  | 'DELETE'
  | 'head'
  | 'HEAD'
  | 'options'
  | 'OPTIONS'
  | 'post'
  | 'POST'
  | 'put'
  | 'PUT'
  | 'patch'
  | 'PATCH'
  | 'purge'
  | 'PURGE'
  | 'link'
  | 'LINK'
  | 'unlink'
  | 'UNLINK';

export interface RestClientProps {
  headers?: object;
  baseURL: string;
  body?: object | null | string;
  service: string;
  method: HTTPMethod;
  params?: { [k: string]: unknown };
  useProxy?: boolean;
  proxy?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
  keepAlive?: boolean;
  responseEncoding?: string;
  httpsAgent?: any;
  timeout?: number;
  full_response?: boolean;
}

export interface BotMessage {
  update_id: number;
  message: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name: string;
      language_code: string;
    };
    chat: {
      id: number;
      first_name: string;
      last_name: string;
      type: string;
    };
    location?: {
      latitude: number;
      longitude: number;
    }
    date: number;
    text: string;
  };
}

export interface QueryRequest {
  id_query_request?: number;
  request: string;
  response?: string;
  user_id: number;
  query_package_id: number;
}

export enum GeneralConfigParams {
  cl_headers = 'cl_headers',
  user_pass = 'user_pass',
}
export interface GeneralConfig {
  param: GeneralConfigParams;
  value?: string;
  json_value: unknown;
}

export interface ClaroCredentials {
  user: string;
  password: string;
  login_param: string;
  login_value: string;
}
export interface User {
  id_user?: number;
  name: string;
  chat_id: string;
  company_id?: number;
}

export interface MediaData {
  group_id?: number;
  media: MediaFile[];
}

export interface MediaFile {
  sha256?: string;
  file_id?: string;
  type?: string;
  file_url?: string;
}
