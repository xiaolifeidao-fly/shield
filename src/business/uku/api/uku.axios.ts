import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { UserInfo } from '@model/user.types';
import log from '@src/utils/logger';

class HttpError extends Error {
  code?: any;

  constructor(message: string, code?: any) {
    super(message);
    this.name = '';
    if (code != null) {
      this.code = code;
    }
  }
}

function rejectHttpError(message: string, code?: any): Promise<never> {
  const error = new HttpError(message, code);
  return Promise.reject(error);
}

let currentUserInfo: UserInfo | null = null;

export function getCurrentUser(): UserInfo | null {
  return currentUserInfo;
}

export function setCurrentUser(userInfo: UserInfo | null): void {
  currentUserInfo = userInfo;
}

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _username?: string;
}

const ukuInstance: AxiosInstance = axios.create({
  timeout: 60000,
  baseURL: 'https://collection.ukuindo.com',
  withCredentials: true,
});

ukuInstance.interceptors.request.use((config: CustomAxiosRequestConfig) => {
  const user = getCurrentUser();
  if (user?.username) {
    config._username = user.username;
  }
  if (user?.authCookie) {
    config.headers['Cookie'] = user.authCookie;
  }
  config.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
  config.headers['Origin'] = 'https://collection.ukuindo.com';
  config.headers['Referer'] = 'https://collection.ukuindo.com/';
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  log.info(`[UKU] Request ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

ukuInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    log.info(`[UKU] Response ${response.status} ${response.config.url}`);
    return response.data;
  },
  async (error: AxiosError) => {
    log.error(`ukuInstance error: ${JSON.stringify(error)}`);
    if (error.response) {
      const data = error.response.data as { error?: string; message?: string; code?: any };
      if (data && (data.error || data.message)) {
        return rejectHttpError(data.error || data.message || '请求异常！', data.code);
      }
      return rejectHttpError('请求异常：' + error.request?.url + ' ' + error.response.statusText);
    }
    return rejectHttpError(error.message);
  }
);

export { ukuInstance };
