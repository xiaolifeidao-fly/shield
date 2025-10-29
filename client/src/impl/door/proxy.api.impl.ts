import { ProxyConfigApi } from "@eleapi/door/proxy.config.api";
import { InvokeType, Protocols } from "@eleapi/base";
import log from 'electron-log';
import axios from 'axios';

export class ProxyConfigApiImpl extends ProxyConfigApi {

    private proxyConfigKey = 'proxy_config';
    private storeApi: any;

    constructor() {
        super();
        // 初始化日志
        log.info('[ProxyConfigApi] 初始化');
    }

    getApiName(): string {
        return "ProxyConfigApi";
    }

    // 获取 StoreApi 实例
    private async getStoreApi() {
        if (!this.storeApi) {
            try {
                // 动态导入 StoreApi 实现
                const { StoreApiImpl } = require('../store/store');
                this.storeApi = new StoreApiImpl();
                log.info('[ProxyConfigApi] StoreApi 初始化成功');
            } catch (error) {
                log.error('[ProxyConfigApi] StoreApi 初始化失败:', error);
                throw new Error('StoreApi 初始化失败');
            }
        }
        return this.storeApi;
    }

    @InvokeType(Protocols.INVOKE)
    async loadProxyConfig() {
        try {
            log.info('[ProxyConfigApi] 开始加载代理配置');
            
            // 获取 StoreApi
            const storeApi = await this.getStoreApi();
            
            // 从存储中读取配置
            const result = await storeApi.getItem(this.proxyConfigKey);
            log.info('[ProxyConfigApi] 加载代理配置结果:', result);
            
            // 处理不同的返回格式
            if (result) {
                if (typeof result === 'object' && !Array.isArray(result)) {
                    // 如果返回的是对象，直接使用
                    log.info('[ProxyConfigApi] 返回代理配置对象');
                    return { success: true, data: result };
                } else if (result.data && typeof result.data === 'object') {
                    // 如果返回对象中包含data字段，使用data字段
                    log.info('[ProxyConfigApi] 返回对象中的data字段');
                    return { success: true, data: result.data };
                }
            }
            
            // 没有找到数据，返回默认配置
            const defaultConfig = {
                enabled: false,
                server: '',
                port: 0,
                username: '',
                password: '',
            };
            log.info('[ProxyConfigApi] 返回默认代理配置');
            return { success: true, data: defaultConfig };
        } catch (error: any) {
            log.error('[ProxyConfigApi] 加载代理配置失败:', error);
            return { success: false, message: '加载失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async saveProxyConfig(config : any) {
        try {
            log.info('[ProxyConfigApi] 开始保存代理配置:', config);
            
            // 验证配置参数
            if (!config || typeof config !== 'object') {
                log.error('[ProxyConfigApi] 代理配置参数无效');
                return { success: false, message: '代理配置参数无效' };
            }

            // 获取 StoreApi
            const storeApi = await this.getStoreApi();
            
            // 保存配置到存储
            const proxyConfig = config.config || config;
            const result = await storeApi.setItem(this.proxyConfigKey, proxyConfig);
            log.info('[ProxyConfigApi] 保存代理配置结果:', result);
            
            return { success: true, message: '代理配置保存成功' };
        } catch (error: any) {
            log.error('[ProxyConfigApi] 保存代理配置失败:', error);
            return { success: false, message: '保存失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async testProxyConnection(proxyConfig: any) {
        try {
            log.info('[ProxyConfigApi] 测试代理连接:', proxyConfig);
            
            // 验证代理配置参数
            if (!proxyConfig || !proxyConfig.server || !proxyConfig.port) {
                log.error('[ProxyConfigApi] 代理配置参数无效');
                return { success: false, message: '代理配置参数无效' };
            }
            
            const startTime = Date.now();
            
            try {
                // 构建代理配置
                const proxyUrl = `http://${proxyConfig.server}:${proxyConfig.port}`;
                const auth = proxyConfig.username && proxyConfig.password 
                    ? { username: proxyConfig.username, password: proxyConfig.password }
                    : undefined;
                
                // 使用axios测试代理连接
                const response = await axios.get('http://httpbin.org/ip', {
                    proxy: {
                        host: proxyConfig.server,
                        port: proxyConfig.port,
                        auth
                    },
                    timeout: 10000 // 10秒超时
                });
                
                const responseTime = Date.now() - startTime;
                
                if (response.status === 200) {
                    const externalIP = response.data.origin || '未知';
                    const result = {
                        success: true,
                        message: '代理连接测试成功',
                        responseTime,
                        externalIP
                    };
                    log.info('[ProxyConfigApi] 代理测试成功:', result);
                    return result;
                } else {
                    const result = {
                        success: false,
                        message: `代理连接失败，HTTP状态码: ${response.status}`
                    };
                    log.info('[ProxyConfigApi] 代理测试失败:', result);
                    return result;
                }
            } catch (error: any) {
                // 处理网络错误
                const result = {
                    success: false,
                    message: `代理连接失败: ${error.message}`
                };
                log.error('[ProxyConfigApi] 代理测试网络错误:', error);
                return result;
            }
        } catch (error: any) {
            log.error('[ProxyConfigApi] 测试代理连接失败:', error);
            return { success: false, message: '测试失败: ' + error.message };
        }
    }
} 