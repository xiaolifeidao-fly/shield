import axios, { AxiosRequestConfig } from 'axios';
import log from 'electron-log';
import { plainToInstance } from 'class-transformer';

// Webview服务器地址
const WEBVIEW_SERVER = 'http://47.242.38.130:9901';//生产
// const WEBVIEW_SERVER = 'http://127.0.0.1:9900';//测试

/**
 * 通过webview服务器代理发送请求
 * 
 * @param targetUrl 真实目标URL
 * @param data 请求数据
 * @param config Axios请求配置
 * @returns 响应数据
 */
export async function proxyRequest(targetUrl: string, data: any, config: AxiosRequestConfig = {}) {
  try {
    
    // 发送请求到webview服务器的通用代理API
    const response = await axios.post(`${WEBVIEW_SERVER}/api/proxy`, {
      _targetUrl: targetUrl, // 添加真实目标URL作为隐藏参数
      ...data // 展开原始请求数据
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {})
      },
      ...config
    });
    
    return response.data;
  } catch (error: any) {
    throw error;
  }
}

export async function proxyGet(targetUrl: string, config: AxiosRequestConfig = {}) {
  try {
    
    // 发送请求到webview服务器的通用代理API
    const response = await axios.get(`${WEBVIEW_SERVER}/api/${targetUrl}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {})
      },
      ...config
    });
    
    return response.data;
  } catch (error: any) {
    throw error;
  }
}

/**
 * 发送特定API的代理请求
 * 
 * @param apiPath 特定API路径
 * @param data 请求数据
 * @param config Axios请求配置
 * @returns 响应数据
 */
export async function proxyApiRequest(apiPath: string, data: any, config: AxiosRequestConfig = {}) {
  try {
    // 确保apiPath不为空
    if (!apiPath) {
      throw new Error('API路径不能为空');
    }
    
    // 修正API路径 - 对于log请求，使用logProxy端点
    const correctedPath = apiPath;
    
    const url = `${WEBVIEW_SERVER}/api/${correctedPath}`;
    // 发送请求到webview服务器的特定API
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {})
      },
      ...config
    });
    
    return response.data;
  } catch (error: any) {
    throw error;
  }
} 


export const proxyGetData = async <T>(targetUrl : string, clazz: new (...args: any[]) => T, config: AxiosRequestConfig = {}): Promise<T|null> =>{
  const data = await proxyGet(targetUrl, config)
  return plainToInstance(clazz, data)
}

export const proxyGetDataList = async <T>(targetUrl : string, clazz: new (...args: any[]) => T, config: AxiosRequestConfig = {}) : Promise<T[]> => {
  const data : {}[] = await proxyGet(targetUrl, config)
  if (data == undefined || data.length  == 0) {
    return [];
  }
  const dataList : T[] = []
  data.forEach(item => {
    const item_instance : T = plainToInstance(clazz, item);
    dataList.push(item_instance);
  })
  return dataList;
}


