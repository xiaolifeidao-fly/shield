import { get } from '@utils/store/electron';
import log from 'electron-log';

export interface ProxyConfig {
  enabled: boolean;
  server: string;
  port: number;
  username?: string;
  password?: string;
}

export class ProxyService {
  private static instance: ProxyService;
  private readonly PROXY_CONFIG_KEY = 'proxy_config';

  private constructor() {
    log.info('[ProxyService] 初始化');
  }

  public static getInstance(): ProxyService {
    if (!ProxyService.instance) {
      ProxyService.instance = new ProxyService();
    }
    return ProxyService.instance;
  }

  /**
   * 获取指定端口的代理配置
   * @param port 端口号
   * @returns 代理配置或undefined
   */
  public async getProxyConfig(port?: string): Promise<ProxyConfig | undefined> {
    try {
      log.info(`[ProxyService] 获取代理配置, 端口: ${port || '默认'}`);
      
      // 从存储中获取代理配置
      const config = get(this.PROXY_CONFIG_KEY);
      
      if (!config) {
        log.info('[ProxyService] 未找到代理配置');
        return undefined;
      }

      // 如果配置不包含config字段，则直接使用整个配置对象
      const proxyConfig = config.config || config;
      
      // 检查代理配置是否有效
      if (!proxyConfig || !proxyConfig.enabled) {
        log.info('[ProxyService] 代理未启用或配置无效');
        return undefined;
      }

      // 检查必要的字段
      if (!proxyConfig.server || !proxyConfig.port) {
        log.info('[ProxyService] 代理配置缺少服务器或端口信息');
        return undefined;
      }

      log.info(`[ProxyService] 找到有效的代理配置: ${proxyConfig.server}:${proxyConfig.port}`);
      return proxyConfig;
    } catch (error) {
      log.error('[ProxyService] 获取代理配置失败:', error);
      return undefined;
    }
  }

  /**
   * 获取Playwright代理配置对象
   * @param port 端口号
   * @returns Playwright代理配置对象或undefined
   */
  public async getPlaywrightProxyConfig(port?: string): Promise<any | undefined> {
    const proxyConfig = await this.getProxyConfig(port);
    
    if (!proxyConfig) {
      return undefined;
    }
    
    // 构建Playwright代理配置
    const playwrightProxy: any = {
      server: `http://${proxyConfig.server}:${proxyConfig.port}`
    };
    // 如果有用户名和密码，添加认证信息
    if (proxyConfig.username && proxyConfig.password) {
      playwrightProxy.username = proxyConfig.username;
      playwrightProxy.password = proxyConfig.password;
    }
    
    log.info(`[ProxyService] 创建Playwright代理配置: ${JSON.stringify(playwrightProxy)}`);
    return playwrightProxy;
  }
} 