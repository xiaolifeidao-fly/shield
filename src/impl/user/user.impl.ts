import { UserApi } from "@api/user.api";
import { UserInfo } from "@model/user.types";
import { deleteUserByUsername, getUserByUsername, insertUser, listUsers, updateUser } from "@src/utils/store/mysql-store";
import { businessFactoryRegistry } from "@src/business";
import log from "../../utils/logger";
import { ensureKlikKamiSession } from "@src/business/klikkami/api/klikkami.axios";

let activeSyncUsername: string | null = null;
let syncQueue: Promise<void> = Promise.resolve();
const pendingSyncs = new Map<string, Promise<void>>();

export class UserImpl extends UserApi {

    /**
     * 获取用户列表（从store中读取）
     */
    private async getUserList(): Promise<UserInfo[]> {
        const users = await listUsers();
        return users.map(u => ({
            id: u.id,
            username: u.username,
            password: u.password,
            remark: u.remark || '',
            authCookie: u.authCookie,
            businessType: u.businessType || undefined,
        })) as UserInfo[];
    }

    async getUserInfo(username: string): Promise<UserInfo> {
        const user = await getUserByUsername(username);
        if (!user) {
            throw new Error(`用户 ${username} 不存在`);
        }
        return user as UserInfo;
    }

    async getUserInfoList(): Promise<UserInfo[]> {
        const userList = await this.getUserList();
        // 为每个用户填充 syncStats
        return await Promise.all(userList.map(async user => {
            try {
                if (user.businessType && businessFactoryRegistry.hasBusinessType(user.businessType)) {
                    const syncService = businessFactoryRegistry.getSyncService(user.businessType);
                    const syncStats = await Promise.resolve(syncService.getUserSyncStatsInfo(user.username) as any);
                    return {
                        ...user,
                        syncStats,
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
        }));
    }

    async addUser(userInfo: UserInfo): Promise<void> {
        const existing = await getUserByUsername(userInfo.username);
        if (existing) {
            throw new Error(`用户名 ${userInfo.username} 已存在`);
        }
        // 如果没有 id，生成一个
        if (!userInfo.id) {
            userInfo.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        }
        await insertUser({
            id: userInfo.id,
            username: userInfo.username,
            password: userInfo.password,
            remark: userInfo.remark || '',
            authCookie: userInfo.authCookie,
            businessType: userInfo.businessType,
        });
        // 取消写入全局 KV 的 userList 快照
    }

    async updateUser(userInfo: UserInfo): Promise<void> {
        const existing = userInfo.username ? await getUserByUsername(userInfo.username) : null;
        if (!existing && !userInfo.id) {
            throw new Error(`用户 ${userInfo.username} 不存在`);
        }
        const userId = userInfo.id || existing?.id;
        if (!userId) {
            throw new Error(`用户 ${userInfo.username} 不存在`);
        }
        await updateUser({
            id: userId,
            username: userInfo.username,
            password: userInfo.password,
            remark: userInfo.remark || '',
            authCookie: userInfo.authCookie,
            businessType: userInfo.businessType,
        });
        // 取消写入全局 KV 的 userList 快照
    }

    async deleteUser(username: string): Promise<void> {
        const existing = await getUserByUsername(username);
        if (!existing) {
            throw new Error(`用户 ${username} 不存在`);
        }
        await deleteUserByUsername(username);
        // 取消写入全局 KV 的 userList 快照
    }

    async runUser(username: string, enableDeduplication: boolean = true, enableResume: boolean = false): Promise<void> {
        const pendingSync = pendingSyncs.get(username);
        if (pendingSync) {
            log.info(`[SyncQueue] 用户 ${username} 已在同步队列中，复用现有任务`);
            return pendingSync;
        }

        if (activeSyncUsername) {
            log.info(`[SyncQueue] 用户 ${username} 等待用户 ${activeSyncUsername} 同步完成`);
        }

        const queuedSync = syncQueue.then(async () => {
            activeSyncUsername = username;
            try {
                await this.executeUserSync(username, enableDeduplication, enableResume);
            } finally {
                if (activeSyncUsername === username) {
                    activeSyncUsername = null;
                }
            }
        });

        pendingSyncs.set(username, queuedSync);
        // 前一个任务失败不能阻塞后续用户，错误仍通过 queuedSync 返回给当前调用方。
        syncQueue = queuedSync.catch(() => undefined);

        try {
            await queuedSync;
        } finally {
            if (pendingSyncs.get(username) === queuedSync) {
                pendingSyncs.delete(username);
            }
        }
    }

    private async executeUserSync(username: string, enableDeduplication: boolean, enableResume: boolean): Promise<void> {
        const user = await getUserByUsername(username);
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
        let resolvedUser = user as UserInfo;

        // KLIKKAMI 在同步前先检查登录态，失效则自动登录并刷新 Cookie
        if (user.businessType === 'KLIKKAMI') {
            resolvedUser = await ensureKlikKamiSession(user as UserInfo);
        }

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

        await syncService.syncUserCases(resolvedUser as UserInfo, syncParams);
    }

    async stopUser(username: string): Promise<void> {
        const user = await getUserByUsername(username);
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
