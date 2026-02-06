import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { UserInfo } from '@model/user.types';
import { updateUserAuthCookie } from '@src/utils/store/mysql-store';
import { login } from './login.api';
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

const klikkamiInstance: AxiosInstance = axios.create({
  timeout: 60000,
  baseURL: 'https://www.klikkamicorp.id',
  withCredentials: true,
});

function extractAdminToken(cookieValue: string | undefined): string | undefined {
  if (!cookieValue) {
    return undefined;
  }
  const match = /Admin-Token=([^;]+)/.exec(cookieValue);
  return match ? match[1] : undefined;
}

klikkamiInstance.interceptors.request.use(
  async (config: CustomAxiosRequestConfig) => {
    const user = getCurrentUser();
    if (user?.username) {
      config._username = user.username;
    }
    log.info(`[KlikKami] Request ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (user?.authCookie) {
      config.headers['Cookie'] = user.authCookie;
      const tokenValue = extractAdminToken(user.authCookie);
      if (tokenValue) {
        config.headers['Admin-Token'] = tokenValue;
        config.headers['X-Token'] = tokenValue;
      }
    } else if (user?.username && user?.password && !config.url?.includes('/indonesia_admin/user/login')) {
      log.info(`[KlikKami] No auth cookie, auto login for ${user.username}`);
      const loginResp = await login(user);
      const cookieValue = loginResp.setCookie
        ? `${loginResp.setCookie}; Admin-Token=${loginResp.token}`
        : `sidebarStatus=1; Admin-Token=${loginResp.token}`;
      config.headers['Cookie'] = cookieValue;
      config.headers['Admin-Token'] = loginResp.token;
      config.headers['X-Token'] = loginResp.token;
      user.authCookie = cookieValue;
      await updateUserAuthCookie(user.username, cookieValue);
      log.info(`[KlikKami] Updated auth cookie for ${user.username}`);
    }
    config.headers['Content-Type'] = 'application/json';
    config.headers['Origin'] = 'https://www.klikkamicorp.id';
    config.headers['Referer'] = 'https://www.klikkamicorp.id/client/testtestccc/';
    return config;
  }
);

klikkamiInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    log.info(`[KlikKami] Response ${response.status} ${response.config.url}`);
    const result = response.data;
    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success) {
        return rejectHttpError(result.error || result.message || '请求异常！', 500);
      }
      return result.ret;
    }
    return result;
  },
  async (error: AxiosError) => {
    log.error(`klikkamiInstance error: ${JSON.stringify(error)}`);
    if (error.response) {
      const data = error.response.data as { error?: string; message?: string; code?: any };
      if ((error.response.status === 401 || error.response.status === 403) && error.config) {
        const config = error.config as CustomAxiosRequestConfig;
        const user = getCurrentUser();
        if (user?.username && user?.password && !config.url?.includes('/indonesia_admin/user/login')) {
          const loginResp = await login(user);
          const cookieValue = loginResp.setCookie
            ? `${loginResp.setCookie}; Admin-Token=${loginResp.token}`
            : `sidebarStatus=1; Admin-Token=${loginResp.token}`;
          user.authCookie = cookieValue;
          await updateUserAuthCookie(user.username, cookieValue);
          config.headers = config.headers || {};
          config.headers['Cookie'] = cookieValue;
          config.headers['Admin-Token'] = loginResp.token;
          config.headers['X-Token'] = loginResp.token;
          config.headers['Origin'] = 'https://www.klikkamicorp.id';
          config.headers['Referer'] = 'https://www.klikkamicorp.id/client/testtestccc/';
          return klikkamiInstance.request(config);
        }
      }
      if (data && (data.error || data.message)) {
        return rejectHttpError(data.error || data.message || '请求异常！', data.code);
      }
      return rejectHttpError('请求异常：' + error.request?.url + ' ' + error.response.statusText);
    }
    return rejectHttpError(error.message);
  }
);

export { klikkamiInstance };
