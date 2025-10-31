import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

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

// 创建 adapundi 专用的 axios 实例
const adapundiInstance: AxiosInstance = axios.create({
  timeout: 60000,
  baseURL: 'https://admin-hive.adapundi.com',
  withCredentials: true,
});

// 请求拦截器 - 添加 x-auth-token 请求头
adapundiInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 添加请求头 x-auth-token（默认写死）
    const token = 'default-token'; // TODO: 后续从存储或配置中获取
    if (token) {
      config.headers['x-auth-token'] = token;
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

export {
  adapundiInstance,
  HttpError,
};

