import { StoreApi } from "@eleapi/store/store";
import { InvokeType, Protocols } from "@eleapi/base";
import { 
    getGlobal, setGlobal, removeGlobal, clearGlobal,
    get, set, remove, clear, getPortConfig, copyPortConfig,
    getAllPortConfigs, getAllStoreKeys
} from "../../../../common/utils/store/electron";

export class StoreApiImpl extends StoreApi {

    // ========== 全局存储接口实现 (不涉及端口) ==========

    @InvokeType(Protocols.INVOKE)
    async getItem(key : string){
        return getGlobal(key);
    }

    @InvokeType(Protocols.INVOKE)
    async setItem(key : string, value : any){
        setGlobal(key, value);
    }

    @InvokeType(Protocols.INVOKE)
    async removeItem(key : string){
        removeGlobal(key);
    }

    @InvokeType(Protocols.INVOKE)
    async clear(){
        clearGlobal();
    }

    // ========== 端口隔离存储接口实现 ==========

    @InvokeType(Protocols.INVOKE)
    async getPortItem(key: string){
        const port = this.getPort();
        return get(key, port);
    }

    @InvokeType(Protocols.INVOKE)
    async setPortItem(key: string, value: any){
        const port = this.getPort();
        set(key, value, port);
    }

    @InvokeType(Protocols.INVOKE)
    async removePortItem(key: string){
        const port = this.getPort();
        remove(key, port);
    }

    @InvokeType(Protocols.INVOKE)
    async clearPort(){
        const port = this.getPort();
        clear(port);
    }

    @InvokeType(Protocols.INVOKE)
    async getPortConfig(){
        const port = this.getPort();
        return {
            success: true,
            data: getPortConfig(port),
            port: port
        };
    }

    @InvokeType(Protocols.INVOKE)
    async copyPortConfig(fromPort: number, toPort: number){
        try {
            copyPortConfig(fromPort, toPort);
            return {
                success: true,
                message: `配置从端口 ${fromPort} 复制到端口 ${toPort} 成功`
            };
        } catch (error: any) {
            return {
                success: false,
                message: '复制配置失败: ' + error.message
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async getAllPortConfigs(){
        try {
            const portConfigs = getAllPortConfigs();
            return {
                success: true,
                data: portConfigs
            };
        } catch (error: any) {
            return {
                success: false,
                message: '获取端口配置失败: ' + error.message
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async getPortConfigByPort(port: number){
        try {
            const config = getPortConfig(port);
            return {
                success: true,
                data: config,
                port: port
            };
        } catch (error: any) {
            return {
                success: false,
                message: '获取端口配置失败: ' + error.message
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async getAllStoreKeys(){
        try {
            const keys = getAllStoreKeys();
            return {
                success: true,
                data: keys
            };
        } catch (error: any) {
            return {
                success: false,
                message: '获取存储键名失败: ' + error.message
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async setPortItemByPort(port: number, key: string, value: any){
        try {
            set(key, value, port);
            return {
                success: true,
                message: `配置已保存到端口 ${port}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: '保存配置失败: ' + error.message
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async deletePortConfig(port: number){
        try {
            clear(port);
            return {
                success: true,
                message: `端口 ${port} 的配置已删除`
            };
        } catch (error: any) {
            return {
                success: false,
                message: '删除配置失败: ' + error.message
            };
        }
    }

}