import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getGlobal, setGlobal, removeGlobal } from '@src/utils/store/conf';
import { UserInfo } from '@model/user.types';
import log from "../../../utils/logger";
import * as dotenv from 'dotenv';
dotenv.config();

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
const USER_TOKEN_KEY_PREFIX = "userToken_kat";

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

// 创建 kat 专用的 axios 实例
const katInstance: AxiosInstance = axios.create({
  timeout: 60000,
  baseURL: 'http://collection.pendanaan.com',
  withCredentials: false,
});

// 请求拦截器 - 添加 Authorization 和 Tenant 请求头
katInstance.interceptors.request.use(
  async (config: CustomAxiosRequestConfig) => {
    // 从当前用户获取 token
    const user = getCurrentUser();
    if (user && user.username) {
      const token = getUserToken(user.username);
      if (token) {
        config.headers['Authorization'] = token;
      }
      config.headers['Origin'] = 'http://collection.pendanaan.com';
      config.headers['Referer'] = 'http://collection.pendanaan.com/';
      config.headers['Tenant'] = 'PAID';
      // 将 username 存储在配置中，供响应拦截器使用
      config._username = user.username;
    }
    // 添加固定的 Tenant 头
    config.headers['Tenant'] = 'PAID';
    return config;
  },
);

// 响应拦截器
katInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    let result = response.data;
    if (result.Code !== 200) {
      return rejectHttpError(
        result.Message || '请求异常！',
        result.Code || 500
      );
    }
    return result.Result;
  },
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;
    log.error(`katInstance error: ${JSON.stringify(error)}`);
    
    // 处理 400/401 错误 - 尝试重新登录并重试
    if ((error.response?.status === 400 || error.response?.status === 401) && config) {
      // 如果请求URL包含 api/login，则不进行重试
      const requestUrl = config.url || error.config?.url || '';
      if (requestUrl.includes('api/login')) {
        // 直接返回错误，不进行重试
        if (error.response) {
          const data = error.response.data as { Message?: string; Code?: any };
          if (data && data.Message) {
            return rejectHttpError(data.Message, data.Code);
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
              const loginResponse = await login(userInfo);
              log.info(`loginResponse: ${JSON.stringify(loginResponse)}`);
              const newToken = loginResponse.jwt;
              
              // 更新 token 映射
              setUserToken(username, newToken);
              
              // 更新请求头
              config.headers['Authorization'] = newToken;
              
              // 重试请求
              return katInstance.request(config);
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
      const data = error.response.data as { Message?: string; Code?: any };
      if (data && data.Message) {
        return rejectHttpError(data.Message, data.Code);
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
  katInstance,
  HttpError,
};

