import { BasicConfigApi } from "@eleapi/door/basic.config.api";
import { InvokeType, Protocols } from "@eleapi/base";
import { getCurrentPort, setCurrentPort } from "../../../../common/utils/store/electron";

export class BasicConfigApiImpl extends BasicConfigApi {

    getApiName(): string {
        return "BasicConfigApi";
    }

    @InvokeType(Protocols.INVOKE)
    async saveBasicConfig(config: any) {
        try {
            // 验证配置参数
            if (!config || typeof config !== 'object') {
                return { success: false, message: '配置参数无效' };
            }

            // 🔧 修复：使用配置中的端口号，而不是实例端口号
            const targetPort = config.port || this.getPort();
            const instancePort = this.getPort();
            
            console.log(`保存基本配置 [目标端口 ${targetPort}, 实例端口 ${instancePort}]:`, config);
            
            // 创建StoreApi实例并使用端口隔离存储
            const { StoreApiImpl } = await import("@src/impl/store/store");
            const storeApi = new StoreApiImpl();
            await storeApi.setPortItem('basic_config', config);
            
            return { 
                success: true, 
                message: `配置保存成功 [端口 ${targetPort}]`,
                port: targetPort,
                instancePort: instancePort
            };
        } catch (error: any) {
            console.error('保存配置失败:', error);
            return { success: false, message: '保存失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async loadBasicConfig() {
        try {
            const port = getCurrentPort() || this.getPort();
            
            // 创建StoreApi实例并从端口隔离存储中加载配置
            const { StoreApiImpl } = await import("@src/impl/store/store");
            const storeApi = new StoreApiImpl();
            const savedConfig = await storeApi.getPortItem('basic_config');
            
            // 默认配置
            const defaultConfig = {
                slideStats: false,
                port: port,
                noVideo: false,
                autoEnd: false
            };
            
            // 合并配置
            const config = { ...defaultConfig, ...savedConfig };
            
            console.log(`加载基本配置 [端口 ${port}]:`, config);
            return { 
                success: true, 
                data: config,
                port: port
            };
        } catch (error: any) {
            console.error('加载基本配置失败:', error);
            return { success: false, message: '加载失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async saveScriptConfig(config: any, targetPort?: number) {
        try {
            // 验证配置参数
            if (!config || typeof config !== 'object') {
                return { success: false, message: '脚本配置参数无效' };
            }

            // 🔧 修复：直接使用传入的目标端口，如果没有传入则使用实例端口
            const port = targetPort || this.getPort();
            const instancePort = this.getPort();
            
            console.log(`保存脚本配置 [目标端口 ${port}, 实例端口 ${instancePort}]:`, config);
            
            // 创建StoreApi实例并使用目标端口保存脚本配置
            const { StoreApiImpl } = await import("@src/impl/store/store");
            const storeApi = new StoreApiImpl();
            await storeApi.setPortItem('script_config', config);
            
            return { 
                success: true, 
                message: `脚本配置保存成功 [端口 ${port}]`,
                port: port,
                instancePort: instancePort
            };
        } catch (error: any) {
            console.error('保存脚本配置失败:', error);
            return { success: false, message: '保存失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async loadScriptConfig() {
        try {
            const port = getCurrentPort();
            // 创建StoreApi实例并从端口隔离存储中加载配置
            const { StoreApiImpl } = await import("@src/impl/store/store");
            const storeApi = new StoreApiImpl();
            const savedConfig = await storeApi.getPortItem('script_config');
            
            // 默认配置
            const defaultConfig = {
                likeRate: 0,
                quantity: 0,
                failure: 0,
                taskWait: 0,
                watchWait: 0,
                detectWait: 0
            };
            
            // 合并配置
            const config = { ...defaultConfig, ...savedConfig };
            
            console.log(`加载脚本配置 [端口 ${port}]:`, config);
            return { 
                success: true, 
                data: config,
                port: port
            };
        } catch (error: any) {
            console.error('加载脚本配置失败:', error);
            return { success: false, message: '加载失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async saveProxyConfig(config: any) {
        try {
            if (!config || !config.server || !config.port) {
                return { success: false, message: '服务器地址和端口为必填项' };
            }
            const { StoreApiImpl } = await import("@src/impl/store/store");
            const storeApi = new StoreApiImpl();
            await storeApi.setPortItem('proxy_config', config);
            return { success: true, message: '代理配置保存成功' };
        } catch (error: any) {
            return { success: false, message: '保存失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async loadProxyConfig() {
        try {
            const port = getCurrentPort();
            const { StoreApiImpl } = await import("@src/impl/store/store");
            const storeApi = new StoreApiImpl();
            const config = await storeApi.getPortItem('proxy_config');
            console.log(`加载代理配置 [端口 ${port}]:`, config);
            return { success: true, data: config || {}, port };
        } catch (error: any) {
            return { success: false, message: '加载失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async setContextPort(port: number) {
        try {
            // 1. 更新当前API实例的内部端口
            this.setPort(port);
            
            // 2. 关键修复：同步更新全局存储的端口上下文
            setCurrentPort(port);
            
            return { success: true, message: `上下文端口已设置为: ${port}`, port };
        } catch (error: any) {
            return { success: false, message: '设置上下文端口失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async savePlatformConfig(config: any) {
        try {
            if (!config || typeof config !== 'object') {
                return { success: false, message: '平台配置参数无效' };
            }
            const port = getCurrentPort() || this.getPort();
            const { StoreApiImpl } = await import("@src/impl/store/store");
            const storeApi = new StoreApiImpl();
            await storeApi.setPortItem('platform_config', config);
            console.log(`保存平台配置 [端口 ${port}]:`, config);
            return { success: true, message: '平台配置保存成功' };
        } catch (error: any) {
            console.error('保存平台配置失败:', error);
            return { success: false, message: '保存失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async loadPlatformConfig() {
        try {
            const port = getCurrentPort() || this.getPort();
            const { StoreApiImpl } = await import("@src/impl/store/store");
            const storeApi = new StoreApiImpl();
            const config = await storeApi.getPortItem('platform_config');
            console.log(`加载平台配置 [端口 ${port}]:`, config);
            return { success: true, data: config || {} };
        } catch (error: any) {
            console.error('加载平台配置失败:', error);
            return { success: false, message: '加载失败: ' + error.message };
        }
    }

}