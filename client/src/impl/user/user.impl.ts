import { UserApi, UserInfo } from "@eleapi/user/user.api";
import { businessFactoryRegistry } from "@src/business";
import { userService, DBUser } from "@utils/store/user.service";
import { removeGlobal } from "@utils/store/electron";
import log from "electron-log";

/**
 * 将数据库用户转换为 UserInfo
 */
function dbUserToUserInfo(dbUser: DBUser): UserInfo {
    return {
        id: dbUser.id,
        username: dbUser.username,
        password: dbUser.password,
        remark: dbUser.remark,
        businessType: dbUser.business_type as any,
    };
}

export class UserImpl extends UserApi {

    /**
     * 获取用户列表（从 MySQL shield_users 表中读取）
     */
    private async getUserList(): Promise<UserInfo[]> {
        try {
            const dbUsers = await userService.findAll();
            return dbUsers.map(dbUserToUserInfo);
        } catch (error) {
            log.error('Failed to get user list from MySQL:', error);
            return [];
        }
    }

    /**
     * 根据用户名获取用户
     */
    private async getUserByUsername(username: string): Promise<UserInfo | null> {
        try {
            const dbUser = await userService.findByUsername(username);
            return dbUser ? dbUserToUserInfo(dbUser) : null;
        } catch (error) {
            log.error(`Failed to get user ${username} from MySQL:`, error);
            return null;
        }
    }

    async getUserInfo(username: string): Promise<UserInfo> {
        const user = await this.getUserByUsername(username);
        if (!user) {
            throw new Error(`用户 ${username} 不存在`);
        }
        return user;
    }

    async getUserInfoList(): Promise<UserInfo[]> {
        const userList = await this.getUserList();
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
        // 检查用户名是否已存在
        const existingUser = await this.getUserByUsername(userInfo.username);
        if (existingUser) {
            throw new Error(`用户名 ${userInfo.username} 已存在`);
        }
        // 如果没有 id，生成一个
        if (!userInfo.id) {
            userInfo.id = require('crypto').randomUUID();
        }
        await userService.create({
            id: userInfo.id,
            username: userInfo.username,
            password: userInfo.password,
            remark: userInfo.remark || '',
            auth_cookie: null,
            business_type: userInfo.businessType || null,
        });
    }

    async updateUser(userInfo: UserInfo): Promise<void> {
        const existingUser = await this.getUserByUsername(userInfo.username);
        if (!existingUser) {
            throw new Error(`用户 ${userInfo.username} 不存在`);
        }
        await userService.update(userInfo.username, {
            password: userInfo.password,
            remark: userInfo.remark,
            business_type: userInfo.businessType,
        });
    }

    async deleteUser(username: string): Promise<void> {
        const existingUser = await this.getUserByUsername(username);
        if (!existingUser) {
            throw new Error(`用户 ${username} 不存在`);
        }
        await userService.delete(username);
    }

    async runUser(username: string, enableDeduplication: boolean = true, enableResume: boolean = false): Promise<void> {
        const user = await this.getUserByUsername(username);
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

        await syncService.syncUserCases(user, syncParams);
    }

    async stopUser(username: string): Promise<void> {
        const user = await this.getUserByUsername(username);
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

    async clearCache(username: string): Promise<void> {
        const cookieKey = `simba_cookie_${username}`;
        const firstSyncKey = `simba_is_first_sync_${username}`;

        await removeGlobal(cookieKey);
        await removeGlobal(firstSyncKey);

        log.info(`[clearCache] Cleared cache for user: ${username}, keys: ${cookieKey}, ${firstSyncKey}`);
    }
}
