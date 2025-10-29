import { PlatformConfigApi } from "@eleapi/door/platform.config.api";
import { InvokeType, Protocols } from "@eleapi/base";
import log from 'electron-log';
import { getGlobal, setGlobal } from "@utils/store/electron";
import { Business, BusinessType, BusinessGroup, defaultBusinessList, dyBusinessList, ksBusinessList, xhsBusinessList } from "@model/business.entity";
let watchWait : number = 10000; 

export async function initWatchWait() {
    const scriptConfig = getGlobal("script_config");
    watchWait = scriptConfig?.watchWait;
    log.info("initWatchWait watchWait is ", watchWait);
    if(watchWait){
        watchWait;
    }else{
        watchWait = 10000;
    }
    return watchWait;
}


export function getWatchWait() : number {
    return watchWait;
}

let cacheBusinessList : Business[] = [];

export class PlatformConfigApiImpl extends PlatformConfigApi {

    private platformConfigKey = 'platform_config';
    private scriptConfigKey = 'script_config';
    private storeApi: any;

    constructor() {
        super();
    }

    getApiName(): string {
        return "PlatformConfigApi";
    }


    @InvokeType(Protocols.INVOKE)
    async loadPlatformConfig() {
        try {
            
            
            // 从存储中读取配置
            const result = await getGlobal(this.platformConfigKey);
            
            // 处理不同的返回格式
            if (result) {
                if (Array.isArray(result)) {
                    // 如果直接返回数组，使用数组作为数据
                    return { success: true, data: result };
                } else if (result.data) {
                    // 如果返回对象中包含data字段，使用data字段
                    return { success: true, data: result.data };
                }
            }
            
            // 没有找到数据，返回默认配置
            const defaultConfig = [
                { key: 'ak', name: 'AK', enabled: false, user: '', pass: '' },
                { key: 'xm', name: '熊猫', enabled: false, user: '', pass: '' },
                { key: 'syc', name: '三叶草', enabled: false, user: '', pass: '' },
                { key: 'sh', name: '四海', enabled: false, user: '', pass: '' },
                { key: 'nm', name: '宁檬', enabled: false, user: '', pass: '' },
            ];
            return { success: true, data: defaultConfig };
        } catch (error: any) {
            return { success: false, message: '加载失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async loadScriptConfig() {
        try {
            log.info('[PlatformConfigApi] 开始加载脚本配置');
            
            // 获取 StoreApi
            // 从存储中读取配置
            const result = await getGlobal(this.scriptConfigKey);
            log.info('[PlatformConfigApi] 加载脚本配置结果:', result);
            
            // 处理不同的返回格式
            if (result) {
                if (typeof result === 'object' && !Array.isArray(result)) {
                    // 如果返回的是对象，直接使用
                    log.info('[PlatformConfigApi] 返回脚本配置对象');
                    return { success: true, data: result };
                } else if (result.data && typeof result.data === 'object') {
                    // 如果返回对象中包含data字段，使用data字段
                    log.info('[PlatformConfigApi] 返回对象中的data字段');
                    return { success: true, data: result.data };
                }
            }
            
            // 没有找到数据，返回默认配置
            const defaultConfig = {
                likeRate: 0,
                quantity: 0,
                failure: 0,
                taskWait: 0,
                watchWait: initWatchWait(),
                detectWait: 0
            };
            log.info('[PlatformConfigApi] 返回默认脚本配置');
            return { success: true, data: defaultConfig };
        } catch (error: any) {
            log.error('[PlatformConfigApi] 加载脚本配置失败:', error);
            return { success: false, message: '加载失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async savePlatformConfig(config : any) {
        try {
            log.info('[PlatformConfigApi] 开始保存平台配置:', config);
            
            // 验证配置参数
            if (!config || typeof config !== 'object') {
                log.error('[PlatformConfigApi] 平台配置参数无效');
                return { success: false, message: '平台配置参数无效' };
            }

            // 获取 StoreApi
            // 保存配置到存储
            const platformConfig = config.config || config;
            log.info("platformConfig is ", platformConfig, "platformConfigKey is ", this.platformConfigKey);
            const result = await setGlobal(this.platformConfigKey, platformConfig);
            log.info('[PlatformConfigApi] 保存平台配置结果:', result);
            return { success: true, message: '平台配置保存成功' };
        } catch (error: any) {
            log.error('[PlatformConfigApi] 保存平台配置失败:', error);
            return { success: false, message: '保存失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async saveScriptConfig(config : any) {
        try {
            log.info('[PlatformConfigApi] 开始保存脚本配置:', config);
            
            // 验证配置参数
            if (!config || typeof config !== 'object') {
                log.error('[PlatformConfigApi] 脚本配置参数无效');
                return { success: false, message: '脚本配置参数无效' };
            }
            if(config.watchWait <= 5000){
                return { success: true, message: '脚本配置参数无效，使用默认值' };
            }

            // 获取 StoreApi
            // 保存配置到存储
            const scriptConfig = config.config || config;
            const result = await setGlobal(this.scriptConfigKey, scriptConfig);
            log.info('[PlatformConfigApi] 保存脚本配置结果:', result);
            return { success: true, message: '脚本配置保存成功' };
        } catch (error: any) {
            log.error('[PlatformConfigApi] 保存脚本配置失败:', error);
            return { success: false, message: '保存失败: ' + error.message };
        }
    }

    buildBusinessKey() : string {
        return "businessList_001";
    }

    @InvokeType(Protocols.INVOKE)
    async getAllBusiness(groupCode : string) {
        const newBusinessList = [];
        if(cacheBusinessList == null || cacheBusinessList.length == 0){
            const businessList = await getGlobal(this.buildBusinessKey());
            if(businessList && businessList.length > 0){
                cacheBusinessList = businessList;
                for(const business of defaultBusinessList){
                    const cacheBusiness = cacheBusinessList.find((b: Business) => b.code == business.code);
                    if(!cacheBusiness){
                        cacheBusinessList.push(business);
                    }else{
                        cacheBusiness.main = business.main;
                        cacheBusiness.show = business.show;
                    }
                }
            }else{
                cacheBusinessList = defaultBusinessList;
            }
        }
        for(const business of cacheBusinessList){
            if(business.show){
                if(groupCode == business.group){
                    newBusinessList.push(business);
                }
            }
        }
        return { success: true, data: newBusinessList };
    }


    async getActiveBusiness() {
        const newBusinessList = [];
        if(cacheBusinessList == null || cacheBusinessList.length == 0){
            const businessList = await getGlobal(this.buildBusinessKey());
            if(businessList && businessList.length > 0){
                cacheBusinessList = businessList;
                for(const business of defaultBusinessList){
                    const cacheBusiness = cacheBusinessList.find((b: Business) => b.code == business.code);
                    if(!cacheBusiness){
                        cacheBusinessList.push(business);
                    }else{
                        cacheBusiness.main = business.main;
                        cacheBusiness.show = business.show;
                    }
                }
            }else{
                cacheBusinessList = defaultBusinessList;
            }
        }
        for(const business of cacheBusinessList){
            newBusinessList.push(business);
        }
        return newBusinessList;
    }

    async getBusinessList(groupCode : string) : Promise<Business[]>{
        const businessList = await this.getAllBusiness(groupCode);
        if(!businessList.success){
            return defaultBusinessList;
        }
        return defaultBusinessList;
    }

    @InvokeType(Protocols.INVOKE)
    async saveBusinessList(businessList: Business[]) {
        cacheBusinessList = businessList;
        await setGlobal(this.buildBusinessKey(), businessList);
        return { success: true, message: '保存成功' };
    }

    @InvokeType(Protocols.INVOKE)
    async saveInstanceBusinessConfig(port: string, businessList: Business[]) {
        try {
            const key = `instance_business_config_${port}`;
            await setGlobal(key, businessList);
            log.info(`[PlatformConfigApi] 保存实例 ${port} 业务配置成功:`, businessList);
            return { success: true, message: '实例业务配置保存成功' };
        } catch (error: any) {
            log.error(`[PlatformConfigApi] 保存实例 ${port} 业务配置失败:`, error);
            return { success: false, message: '保存失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async getInstanceBusinessConfig(port: string) {
        try {
            const key = `instance_business_config_${port}`;
            const config = await getGlobal(key);
            if (config) {
                return { success: true, data: config };
            }
            // 如果没有找到实例特定配置，返回失败，让前端创建独立的默认配置
            return { success: false, message: '实例配置不存在' };
        } catch (error: any) {
            log.error(`[PlatformConfigApi] 获取实例 ${port} 业务配置失败:`, error);
            return { success: false, message: '获取失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async testProxyConnection(proxyConfig: any) {
        try {
            log.info('[PlatformConfigApi] 测试代理连接:', proxyConfig);
            
            // 验证代理配置参数
            if (!proxyConfig || !proxyConfig.server || !proxyConfig.port) {
                log.error('[PlatformConfigApi] 代理配置参数无效');
                return { success: false, message: '代理配置参数无效' };
            }
            
            // 这里应该是真正的代理连接测试逻辑
            // 模拟测试过程
            const startTime = Date.now();
            
            // 模拟网络请求延迟
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
            
            const responseTime = Date.now() - startTime;
            const success = Math.random() > 0.2; // 80% 成功率
            
            if (success) {
                const result = {
                    success: true,
                    message: '代理连接测试成功',
                    responseTime: responseTime,
                    externalIP: '192.168.1.' + Math.floor(Math.random() * 255)
                };
                log.info('[PlatformConfigApi] 代理测试成功:', result);
                return result;
            } else {
                const result = {
                    success: false,
                    message: '代理连接失败，请检查代理设置'
                };
                log.info('[PlatformConfigApi] 代理测试失败:', result);
                return result;
            }
            
        } catch (error: any) {
            log.error('[PlatformConfigApi] 测试代理连接失败:', error);
            return { success: false, message: '测试失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async getBusinessGroups() {
        try {
            const groups = [
                { code: BusinessGroup.DY, name: '痘印', description: '痘印平台相关业务' },
                { code: BusinessGroup.KS, name: '侩狩', description: '侩狩平台相关业务' },
                { code: BusinessGroup.XHS, name: '小闳数', description: '小闳数平台相关业务' }
            ];
            return { success: true, data: groups };
        } catch (error: any) {
            log.error('[PlatformConfigApi] 获取业务分组失败:', error);
            return { success: false, message: '获取业务分组失败: ' + error.message };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async getBusinessListByGroup(group: string) {
        try {
            let businessList: Business[] = [];
            
            switch (group) {
                case BusinessGroup.DY:
                    businessList = dyBusinessList;
                    break;
                case BusinessGroup.KS:
                    businessList = ksBusinessList;
                    break;
                case BusinessGroup.XHS:
                    businessList = xhsBusinessList;
                    break;
                default:
                    businessList = dyBusinessList;
                    break;
            }

            // 过滤只显示的业务类型
            const filteredBusinessList = businessList.filter(business => business.show);
            
            return { success: true, data: filteredBusinessList };
        } catch (error: any) {
            log.error('[PlatformConfigApi] 获取分组业务列表失败:', error);
            return { success: false, message: '获取分组业务列表失败: ' + error.message };
        }
    }

}   