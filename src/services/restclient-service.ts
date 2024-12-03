/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {
  AxiosError,
  AxiosProxyConfig,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { RestClientProps } from '../types';
import https from 'https';

export class RestClientService {
  private axiosInstance = axios.create();
  private axiosInstanceKeepAlive = axios.create({
    httpsAgent: new https.Agent({ keepAlive: true }),
  });

  async setupClient() {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (config.data) {
          const requestSize = JSON.stringify(config.data).length;
        }
        return config;
      },
    );
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        if (response.data) {
          const responseSize = JSON.stringify(response.data).length;
        }
        return response;
      },
      (error: AxiosError) => {
        const apiError = (error.response?.data as any)?.message;
        if (error.response?.data) {
          const responseSize = JSON.stringify(error.response?.data).length;
        }
        if (apiError) {
          return Promise.reject(new Error(apiError));
        }
        return Promise.reject(error);
      },
    );

    this.axiosInstanceKeepAlive.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (config.data) {
          const requestSize = JSON.stringify(config.data).length;
        }
        return config;
      },
    );
    this.axiosInstanceKeepAlive.interceptors.response.use(
      (response: AxiosResponse) => {
        if (response.data) {
          const responseSize = JSON.stringify(response.data).length;
        }
        return response;
      },
      (error: AxiosError) => {
        const apiError = (error.response?.data as any)?.message;
        if (error.response?.data) {
          const responseSize = JSON.stringify(error.response?.data).length;
        }
        if (apiError) {
          return Promise.reject(new Error(apiError));
        }
        return Promise.reject(error);
      },
    );
  }

  async callService({
    headers,
    body,
    baseURL,
    service,
    method,
    params,
    useProxy,
    keepAlive,
    responseEncoding,
    httpsAgent,
    proxy,
    timeout,
    full_response,
  }: RestClientProps): Promise<any> {
    let reqHeader = {};
    if (headers) {
      reqHeader = Object.assign(reqHeader, headers);
    }
    const request: AxiosRequestConfig = {
      headers: reqHeader,
      method,
      url: service,
      baseURL,
      withCredentials: true,
      responseEncoding: responseEncoding,
      httpsAgent,
      timeout,
    };
    if (method === 'post') {
      request.data = body;
    }
    if (params) {
      request.params = params;
    }
    if (!!useProxy) {
      request.proxy = {
        protocol: 'http',
        host: proxy?.host || process.env.PROXY_HOST,
        port: proxy?.port || parseInt(process.env.PROXY_PORT, 10),
        auth: {
          username: proxy?.username || process.env.PROXY_USER,
          password: proxy?.password || process.env.PROXY_PASS,
        },
      };
    }
    if (keepAlive) {
      return this.axiosInstanceKeepAlive(request).then(
        (response: any) => response.data,
      );
    }
    return this.axiosInstance(request).then((response: any) => {
      if (full_response) {
        return response;
      }
      return response.data;
    });
  }

  async callAxiosArrayBuffer(
    url: string,
    proxy?: AxiosProxyConfig,
  ): Promise<Buffer> {
    try {
      const response = await axios({
        method: 'get',
        url,
        responseType: 'arraybuffer',
        proxy: proxy,
      });
      console.log('fileplanilla size', response.data.length);
      return Buffer.from(response.data, 'binary');
    } catch (error) {
      console.log(error.message);
      return null;
    }
  }
  async callAxiosImage64(url: string): Promise<string> {
    try {
      const response = await axios({
        method: 'get',
        url,
        responseType: 'arraybuffer',
      });
      const imageBuffer = Buffer.from(response.data, 'binary');
      const base64String = imageBuffer.toString('base64');
      return base64String;
    } catch (error) {
      console.log(error.message);
      return null;
    }
  }
}
