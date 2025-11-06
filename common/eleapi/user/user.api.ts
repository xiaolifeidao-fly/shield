import { ElectronApi, InvokeType, Protocols } from "../base";

export type BusinessType = 'adapundi' | 'SINGA';

/**
 * 同步统计数据结构
 */
export interface SyncStats {
  totalCount: number; // 总数量
  successCount: number; // 成功数量
  skipCount: number; // 跳过数量（已缓存）
  failCount: number; // 失败数量
  lastSyncTime: string; // 最后同步时间
  running?: boolean; // 运行状态
  startTime?: string; // 运行开始时间
  duration?: number; // 运行时长（秒）
}

export interface UserInfo {
    id: string;
    username: string;
    password: string;
    remark : string;
    businessType?: BusinessType;
    syncStats?: SyncStats; // 同步统计信息
}

export class UserApi extends ElectronApi {

    getApiName(): string {
        return "user";
    }

    @InvokeType(Protocols.INVOKE)
    async getUserInfo(username: string): Promise<UserInfo> {
        return this.invokeApi("getUserInfo", username);
    }

    @InvokeType(Protocols.INVOKE)
    async getUserInfoList(): Promise<UserInfo[]> {
        return this.invokeApi("getUserInfoList");
    }

    @InvokeType(Protocols.INVOKE)
    async addUser(userInfo: UserInfo): Promise<void> {
        return this.invokeApi("addUser", userInfo);
    }

    @InvokeType(Protocols.INVOKE)
    async updateUser(userInfo: UserInfo): Promise<void> {
        return this.invokeApi("updateUser", userInfo);
    }

    @InvokeType(Protocols.INVOKE)
    async deleteUser(username: string): Promise<void> {
        return this.invokeApi("deleteUser", username);
    }

    @InvokeType(Protocols.INVOKE)
    async runUser(username: string, enableDeduplication: boolean = true, enableResume: boolean = false): Promise<void> {
        return this.invokeApi("runUser", username, enableDeduplication, enableResume);
    }

    @InvokeType(Protocols.INVOKE)
    async stopUser(username: string): Promise<void> {
        return this.invokeApi("stopUser", username);
    }
    
}