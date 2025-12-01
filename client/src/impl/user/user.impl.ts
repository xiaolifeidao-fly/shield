import { UserApi } from "@api/user.api";
import { UserInfo } from "@model/user.types";
import { getGlobal, setGlobal } from "@src/utils/store/conf";
import { businessFactoryRegistry } from "@src/business";
import log from "../../utils/logger";
const USER_LIST_KEY = "userList";

export class UserImpl extends UserApi {

    /**
     * 获取用户列表（从store中读取）
     */
    private getUserList(): UserInfo[] {
        const userList = getGlobal(USER_LIST_KEY);
        return userList ? (Array.isArray(userList) ? userList : []) : [];
    }

    /**
     * 保存用户列表（到store中）
     */
    private saveUserList(userList: UserInfo[]): void {
        setGlobal(USER_LIST_KEY, userList);
    }

    async getUserInfo(username: string): Promise<UserInfo> {
        const userList = this.getUserList();
        const user = userList.find(u => u.username === username);
        if (!user) {
            throw new Error(`用户 ${username} 不存在`);
        }
        return user;
    }

    async getUserInfoList(): Promise<UserInfo[]> {
        const userList = this.getUserList();
        // 为每个用户填充 syncStats
        return userList.map(user => {
            try {
                if (user.businessType && businessFactoryRegistry.hasBusinessType(user.businessType)) {
                    const syncService = businessFactoryRegistry.getSyncService(user.businessType);
                    return {
                        ...user,
                        syncStats: syncService.getUserSyncStatsInfo(user.username)
                    };
                }
            } catch (error) {
                log.error(`Failed to get sync stats for user ${user.username}:`, error);
            }
            return {
                ...user,
                syncStats: {
                    totalCount: 0,
                    successCount: 0,
                    skipCount: 0,
                    failCount: 0,
                    lastSyncTime: '',
                    running: false,
                }
            };
        });
    }

    async addUser(userInfo: UserInfo): Promise<void> {
        const userList = this.getUserList();
        // 检查用户名是否已存在
        if (userList.some(u => u.username === userInfo.username)) {
            throw new Error(`用户名 ${userInfo.username} 已存在`);
        }
        // 如果没有 id，生成一个
        if (!userInfo.id) {
            userInfo.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        }
        userList.push(userInfo);
        this.saveUserList(userList);
    }

    async updateUser(userInfo: UserInfo): Promise<void> {
        const userList = this.getUserList();
        const index = userList.findIndex(u => u.id === userInfo.id || u.username === userInfo.username);
        if (index === -1) {
            throw new Error(`用户 ${userInfo.username} 不存在`);
        }
        userList[index] = userInfo;
        this.saveUserList(userList);
    }

    async deleteUser(username: string): Promise<void> {
        const userList = this.getUserList();
        const index = userList.findIndex(u => u.username === username);
        if (index === -1) {
            throw new Error(`用户 ${username} 不存在`);
        }
        userList.splice(index, 1);
        this.saveUserList(userList);
    }

    async runUser(username: string, enableDeduplication: boolean = true, enableResume: boolean = false): Promise<void> {
        const userList = this.getUserList();
        const user = userList.find(u => u.username === username);
        if (!user) {
            throw new Error(`用户 ${username} 不存在`);
        }
        
        if (!user.businessType) {
            throw new Error(`用户 ${username} 未设置业务类型`);
        }

        // 根据业务类型获取对应的同步服务
        if (!businessFactoryRegistry.hasBusinessType(user.businessType)) {
            throw new Error(`业务类型 ${user.businessType} 未注册`);
        }

        log.info(`runUser: ${JSON.stringify(user)} start sync, enableDeduplication: ${enableDeduplication}, enableResume: ${enableResume}`);
        
        const syncService = businessFactoryRegistry.getSyncService(user.businessType);
        
        // 构建同步参数（不同业务类型可能有不同的参数）
        const syncParams: any = {
            enableDeduplication,
            enableResume,
        };
        
        // Adapundi 特定的参数
        if (user.businessType === 'adapundi') {
            syncParams.product = 'AP';
        }
        
        // TODO: 可以在这里添加其他业务类型的特定参数
        
        await syncService.syncUserCases(user, syncParams);
    }

    async stopUser(username: string): Promise<void> {
        const userList = this.getUserList();
        const user = userList.find(u => u.username === username);
        if (!user) {
            throw new Error(`用户 ${username} 不存在`);
        }
        
        if (!user.businessType) {
            throw new Error(`用户 ${username} 未设置业务类型`);
        }

        // 根据业务类型获取对应的同步服务并停止
        if (!businessFactoryRegistry.hasBusinessType(user.businessType)) {
            throw new Error(`业务类型 ${user.businessType} 未注册`);
        }

        const syncService = businessFactoryRegistry.getSyncService(user.businessType);
        syncService.stopUserSync(username);
    }
}