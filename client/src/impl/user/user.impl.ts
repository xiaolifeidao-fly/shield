import { UserApi, UserInfo } from "@eleapi/user/user.api";
import { getGlobal, setGlobal } from "@utils/store/electron";
import { syncUserCases, getUserSyncStatsInfo, stopUserSync } from "@src/business/adapundi/service/case.sync";
import log from "electron-log";
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
        return userList.map(user => ({
            ...user,
            syncStats: getUserSyncStatsInfo(user.username)
        }));
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

    async runUser(username: string, enableDeduplication: boolean = true): Promise<void> {
        const userList = this.getUserList();
        const user = userList.find(u => u.username === username);
        if (!user) {
            throw new Error(`用户 ${username} 不存在`);
        }
        // 根据业务类型执行同步
        log.info(`runUser: ${JSON.stringify(user)} start sync, enableDeduplication: ${enableDeduplication}`);
        if (user.businessType === 'adapundi') {
            // 调用 adapundi 同步
            await syncUserCases(user, {
                product: 'AP',
                enableDeduplication,
            });
        } else if (user.businessType === 'singa') {
            // TODO: 实现 singa 同步逻辑
            throw new Error('Singa 业务类型暂未实现');
        } else {
            throw new Error(`用户 ${username} 未设置业务类型`);
        }
    }

    async stopUser(username: string): Promise<void> {
        const userList = this.getUserList();
        const user = userList.find(u => u.username === username);
        if (!user) {
            throw new Error(`用户 ${username} 不存在`);
        }
        // 根据业务类型停止同步
        if (user.businessType === 'adapundi') {
            // 停止 adapundi 同步
            stopUserSync(username);
        } else if (user.businessType === 'singa') {
            // TODO: 实现 singa 停止逻辑
            throw new Error('Singa 业务类型暂未实现');
        } else {
            throw new Error(`用户 ${username} 未设置业务类型`);
        }
    }
}