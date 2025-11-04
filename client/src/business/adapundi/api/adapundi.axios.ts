import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getGlobal, setGlobal, removeGlobal } from '@utils/store/electron';
import { UserInfo } from '@eleapi/user/user.api';
import log from "electron-log";
import * as dotenv from 'dotenv';
const path = require('path');
dotenv.config({path: path.join(__dirname, '.env')}); // 加载 .env 文件中的环境变量


// 定义一个 HttpError 类，扩展自 Error
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

// 抛出 http 异常
function rejectHttpError(message: string, code?: any): Promise<never> {
  const error = new HttpError(message, code);
  return Promise.reject(error);
}

// Store 中的 key 前缀
const USER_TOKEN_KEY_PREFIX = "userToken";

// 当前操作的用户信息
let currentUserInfo: UserInfo | null = null;

/**
 * 获取当前操作的用户信息
 */
export function getCurrentUser(): UserInfo | null {
  return currentUserInfo;
}

/**
 * 设置当前操作的用户
 */
export function setCurrentUser(userInfo: UserInfo | null): void {
  currentUserInfo = userInfo;
}

/**
 * 获取用户信息
 */
function getUserInfo(username: string): UserInfo | null {
  const USER_LIST_KEY = "userList";
  const userList = getGlobal(USER_LIST_KEY);
  if (!userList || !Array.isArray(userList)) {
    return null;
  }
  return userList.find((u: UserInfo) => u.username === username) || null;
}

/**
 * 获取用户 token 的 store key
 */
function getUserTokenKey(username: string): string {
  return `${USER_TOKEN_KEY_PREFIX}.${username}`;
}

/**
 * 设置用户 token
 */
export function setUserToken(username: string, token: string): void {
  const key = getUserTokenKey(username);
  setGlobal(key, token);
}

/**
 * 获取用户 token
 */
export function getUserToken(username: string): string | undefined {
  const key = getUserTokenKey(username);
  return getGlobal(key);
}

/**
 * 清除用户 token
 */
export function clearUserToken(username: string): void {
  const key = getUserTokenKey(username);
  removeGlobal(key);
}

// 扩展 AxiosRequestConfig 以支持自定义属性
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _username?: string;
}

// 创建 adapundi 专用的 axios 实例
const adapundiInstance: AxiosInstance = axios.create({
  timeout: 60000,
  baseURL: 'https://admin-hive.adapundi.com',
  withCredentials: true,
});

// 请求拦截器 - 添加 x-auth-token 请求头
adapundiInstance.interceptors.request.use(
  async (config: CustomAxiosRequestConfig) => {
    // 从当前用户获取 token
    const user = getCurrentUser();
    if (user && user.username) {
      const token = getUserToken(user.username);
      if (token) {
        config.headers['x-auth-token'] = token;
      }
      // 将 username 存储在配置中，供响应拦截器使用
      config._username = user.username;
    }
    return config;
  },
);

// 响应拦截器
adapundiInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    let result = response.data;
    if (!result.success) {
      return rejectHttpError(
        result.error || result.message || result.errorMessage || '请求异常！',
        500
      );
    }
    return result.data;
  },
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;
    log.error(`adapundiInstance error: ${JSON.stringify(error)}`);
    // 处理 400 错误 - 尝试重新登录并重试
    if (error.response?.status === 401 && config) {
      // 如果请求URL包含 ac/user/login，则不进行重试
      const requestUrl = config.url || error.config?.url || '';
      if (requestUrl.includes('ac/user/login')) {
        // 直接返回错误，不进行重试
        if (error.response) {
          const data = error.response.data as { error?: string; code?: any };
          if (data && data.error) {
            return rejectHttpError(data.error, data.code);
          }
          return rejectHttpError('请求异常：' + error.request?.url + ' ' + error.response.statusText);
        }
        return rejectHttpError(error.message);
      }
      
      // 初始化重试计数
      if (!config._retryCount) {
        config._retryCount = 0;
      }
      
      // 最多重试 3 次
      if (config._retryCount < 3) {
        config._retryCount++;
        
        try {
          // 获取用户信息
          const username = config._username;
          log.info(`current username: ${username}`);
          if (username) {
            const userInfo = getUserInfo(username);
            if (userInfo) {
              // 动态导入 login 函数以避免循环依赖
              const { login } = await import('./login.api');
              
              // 重新登录获取新 token
              const loginResponse = await login(userInfo, 'adapundi');
              log.info(`loginResponse: ${JSON.stringify(loginResponse)}`);
              const newToken = loginResponse.accessToken;
              
              // 更新 token 映射
              setUserToken(username, newToken);
              
              // 更新请求头
              config.headers['x-auth-token'] = newToken;
              
              // 重试请求
              return adapundiInstance.request(config);
            }
          }
        } catch (loginError) {
          // 登录失败，继续抛出原始错误
          log.error('自动重新登录失败:', loginError);
        }
      }
    }
    
    // 处理其他错误或重试次数超限
    if (error.response) {
      const data = error.response.data as { error?: string; code?: any };
      if (data && data.error) {
        return rejectHttpError(data.error, data.code);
      }
      return rejectHttpError('请求异常：' + error.request?.url + ' ' + error.response.statusText);
    }

    if (error.request) {
      return rejectHttpError('请求异常：无返回结果');
    }
    return rejectHttpError(error.message);
  }
);

// 创建认证中心专用的 axios 实例
const authCenterInstance: AxiosInstance = axios.create({
  timeout: 60000,
  baseURL: 'https://auth-center.adapundi.com',
  withCredentials: true,
});

// 认证中心响应拦截器
authCenterInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    let result = response.data;
    if (!result.success) {
      return rejectHttpError(
        result.error || result.message || result.errorMessage || '请求异常！',
        result.code || 500
      );
    }
    return result.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      const data = error.response.data as { error?: string; code?: any };
      if (data && data.error) {
        return rejectHttpError(data.error, data.code);
      }
      return rejectHttpError('请求异常：' + error.request?.url + ' ' + error.response.statusText);
    }

    if (error.request) {
      return rejectHttpError('请求异常：无返回结果');
    }
    return rejectHttpError(error.message);
  }
);

// 创建 writeCase 专用的 axios 实例（baseURL 从环境变量读取）
const writeCaseBaseURL = process.env.WRITE_CASE_API_BASE_URL || '';
log.info("writeCaseBaseURL : ", writeCaseBaseURL);
if (!writeCaseBaseURL) {
  log.warn('警告: WRITE_CASE_API_BASE_URL 环境变量未设置，writeCase 接口可能无法正常工作');
}

const writeCaseInstance: AxiosInstance = axios.create({
  timeout: 60000,
  baseURL: writeCaseBaseURL,
  withCredentials: true,
});

// writeCase 响应拦截器
writeCaseInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    let result = response.data;
    log.info(`writeCaseInstance response: ${JSON.stringify(result)}`);
    if (result.code != 0) {
      return rejectHttpError(
        result.error || result.message || result.errorMessage || '请求异常！',
        500
      );
    }
    return result.data;
  },
  (error: AxiosError) => {
    log.error(`writeCaseInstance error: ${JSON.stringify(error)}`);
    if (error.response) {
      const data = error.response.data as { error?: string; code?: any };
      if (data && data.error) {
        return rejectHttpError(data.error, data.code);
      }
      return rejectHttpError('请求异常：' + error.request?.url + ' ' + error.response.statusText);
    }

    if (error.request) {
      return rejectHttpError('请求异常：无返回结果');
    }
    return rejectHttpError(error.message);
  }
);

export {
  adapundiInstance,
  authCenterInstance,
  writeCaseInstance,
  HttpError,
};

