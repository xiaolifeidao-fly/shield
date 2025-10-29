import { InstanceApi } from "@eleapi/door/instance.api";
import { InvokeType, Protocols } from "@eleapi/base";
import { InstanceManager } from "@src/kernel/instance/instance.manager";
import { runByPort, stopByPort } from "@src/door/dy/task/run";
import { createInstance, getAllInstances, getLastPort, getPortTaskTypeChoose, getStatusByPort, removeInstance, setLastPort, setPortTaskTypeChoose } from "@src/door/dy/store/port.store";
import { getDyUser, getDyUserHeadless, getDyUserStatistic, getDyUserTodayStatistic, isLogin, resetConsecutiveFailures, setDyUser } from "@src/door/dy/store/dy.store";
import log from 'electron-log';
import { DyUser } from "@model/dy.entity";
import { PlatformConfigApiImpl } from "./platform.api.impl";
import { Business } from "@model/business.entity";
import { TaskType } from "@model/task.entity";

const platformApi = new PlatformConfigApiImpl();

export class InstanceApiImpl extends InstanceApi {

    getApiName(): string {
        return "InstanceApi";
    }

    @InvokeType(Protocols.INVOKE)
    async createNewInstance(groupCode : string) {
        try {
            const instance = createInstance(groupCode);
            return {
                success: true,
                message: `新实例创建成功`,
                data: instance
            };
        } catch (error: any) {
            console.error('创建新实例失败:', error);
            return { 
                success: false, 
                message: '创建新实例失败: ' + error.message 
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async deleteByPort(groupCode : string, port: string) {
        await removeInstance(groupCode, port);
        return {
            success: true,
            message: `实例 [端口 ${port}] 删除成功`
        };
    }


    @InvokeType(Protocols.INVOKE)
    async getAllInstances(groupCode : string) {
        try {
            const busiessList = await platformApi.getBusinessList(groupCode);
            const instances = getAllInstances(groupCode);
            return {
                success: true,
                data: instances.map(instance => {
                    const instanceResult =  {
                    port: instance.port,
                    uid: "",
                    secUid : "",
                    isLogin: false,
                    isExcepiton: false,
                    locks : new Map<string, boolean>(),
                    nickName : "",
                    createdAt: instance.createTime,
                    lastActiveAt: instance.createTime,
                    isActive: true,
                    runningStatus: getStatusByPort(instance.port),
                    lockTimes : new Map<string, number>(),
                    sleepFlags : new Map<string, boolean>(),
                    sleepReasons : new Map<string, string>(),
                    sleepTimes : new Map<string, number>(),
                    statistic: new Map<string, {
                        totalCount : number,
                        todayCount: number,
                        totalErrorCount: number,
                        todayErrorCount: number,
                        chose: boolean
                    }>()
                }
                let dyUser : DyUser = getDyUser(groupCode, instance.port)!;
                if(isLogin(dyUser)){
                    instanceResult.uid = dyUser!.uid;
                    instanceResult.secUid = dyUser!.secUid;
                    instanceResult.isLogin = true;
                    instanceResult.nickName = dyUser!.nickName;
                    instanceResult.isExcepiton = dyUser!.isExcepiton || false;
                    instanceResult.locks = this.getLocks(dyUser!, busiessList);
                    instanceResult.lockTimes = this.getLockTimes(dyUser!, busiessList);
                    instanceResult.sleepFlags = this.getSleepFlags(dyUser!, busiessList);
                    instanceResult.sleepReasons = this.getSleepReasons(dyUser!, busiessList);
                    instanceResult.sleepTimes = this.getSleepTimes(dyUser!, busiessList);
                }
                for(const busiess of busiessList){
                    const statistic = getDyUserStatistic(instance.port, busiess.code);
                    const todayStatistic = getDyUserTodayStatistic(instance.port, busiess.code);
                    instanceResult.statistic.set(busiess.code, {
                        totalCount: statistic.totalLoveNum,
                        todayCount: todayStatistic.totalLoveNum,
                        totalErrorCount: statistic.totalErrorNum,
                        todayErrorCount: todayStatistic.totalErrorNum,
                        chose: getPortTaskTypeChoose(instance.port, busiess.code)
                    });
                }
                return instanceResult;
            })
            };
        } catch (error: any) {
            console.error('获取实例列表失败:', error);
            return { 
                success: false, 
                message: '获取实例列表失败: ' + error.message 
            };
        }
    }

    private getLocks(dyUser: DyUser,busiessList: Business[]) {
        const locks = dyUser.locks || {};
        for(const busiess of busiessList){
            if(busiess.code == TaskType.DIGG){
                locks[busiess.code] = dyUser.isLock || false;
                continue;
            }
            if(!locks[busiess.code]){
                locks[busiess.code] = false;
            }
        }
        const locksMap = new Map<string, boolean>();
        for(const key in locks){
            locksMap.set(key, locks[key]);
        }
        return locksMap;
    }
    private getLockTimes(dyUser: DyUser, busiessList: Business[]) {
        let lockTimes = dyUser.lockTimes || {};
        for(const busiess of busiessList){
            if(busiess.code == TaskType.DIGG){
                lockTimes[busiess.code] = dyUser.lockTime || 0;
                continue;
            }
            if(!lockTimes[busiess.code]){
                lockTimes[busiess.code] = 0;
            }
        }
        const lockTimesMap = new Map<string, number>();
        for(const key in lockTimes){
            lockTimesMap.set(key, lockTimes[key]);
        }
        return lockTimesMap;
    }
    private getSleepFlags(dyUser: DyUser, busiessList: Business[]) {
        //判断是不是map
        let sleepFlags = dyUser.sleepFlags || {};
        //判断sleepFlags是否为空
        for(const busiess of busiessList){
            if(busiess.code == TaskType.DIGG){
                sleepFlags[busiess.code] = dyUser.sleepFlag || false;
                continue;
            }
            if(!sleepFlags[busiess.code]){
                sleepFlags[busiess.code] = false;
            }
        }
        const sleepFlagsMap = new Map<string, boolean>();
        for(const key in sleepFlags){
            sleepFlagsMap.set(key, sleepFlags[key]);
        }
        return sleepFlagsMap;
    }
    private getSleepReasons(dyUser: DyUser, busiessList: Business[]) {
        let sleepReasons = dyUser.sleepReasons || {};
        for(const busiess of busiessList){
            if(busiess.code == TaskType.DIGG){
                sleepReasons[busiess.code] = dyUser.sleepReason || "";
                continue;
            }
            if(!sleepReasons[busiess.code]){
                sleepReasons[busiess.code] = "";
            }
        }
        const sleepReasonsMap = new Map<string, string>();
        for(const key in sleepReasons){
            sleepReasonsMap.set(key, sleepReasons[key]);
        }
        return sleepReasonsMap;
    }
    private getSleepTimes(dyUser: DyUser, busiessList: Business[]) {
        let sleepTimes = dyUser.sleepTimes || {};
        for(const busiess of busiessList){
            if(busiess.code == TaskType.DIGG){
                sleepTimes[busiess.code] = dyUser.sleepTime || 0;
                continue;
            }
            if(!sleepTimes[busiess.code]){
                sleepTimes[busiess.code] = 0;
            }
        }
        const sleepTimesMap = new Map<string, number>();
        for(const key in sleepTimes){
            sleepTimesMap.set(key, sleepTimes[key]);
        }
        return sleepTimesMap;
    }




    
    @InvokeType(Protocols.INVOKE)
    async runInstance(groupCode : string, port: string) {
        try {
            // const headless = getDyUserHeadless(port);
            const isLogin = await runByPort(groupCode, port, false);
            if(!isLogin){
                return {
                    success: false,
                    message: `用户信息已失效，请重新登录`
                };
            }
            return {
                success: true,
                message: `实例 [端口 ${port}] 运行成功`
            };
        } catch (error: any) {
            console.error('运行实例失败:', error);
            return { 
                success: false, 
                message: '运行实例失败: ' + error.message 
            };
        }
    }
    
    @InvokeType(Protocols.INVOKE)
    async stopInstance(groupCode : string, port: string) {
        try {
            stopByPort(groupCode, port);
            return {
                success: true,
                message: `实例 [端口 ${port}] 停止成功`
            };
        } catch (error: any) {
            console.error('停止实例失败:', error);
            return { 
                success: false, 
                message: '停止实例失败: ' + error.message 
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async setTaskTypeChoose(port: string, taskType: string, choose: boolean) {
        setPortTaskTypeChoose(port, taskType, choose);
        return {
            success: true,
            message: `实例 [端口 ${port}] 任务类型选择成功`
        };
    }

    @InvokeType(Protocols.INVOKE)
    async setLockTime(groupCode: string, port: string, lockTime: number) {
        try {
            const dyUser = getDyUser(groupCode, port);
            if(dyUser){
                dyUser.lockTime = lockTime;
                setDyUser(groupCode, port, dyUser);
            }
            return {
                success: true,
                message: `实例 [端口 ${port}] 封禁时间设置成功`
            };
        } catch (error: any) {
            return { 
                success: false, 
                message: '设置锁时间失败: ' + error.message 
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async clearSleepFlag(groupCode: string, port: string, businessCode: string) {
        try {
            const dyUser = getDyUser(groupCode, port);
            if(dyUser){
                if(businessCode == TaskType.DIGG){
                    dyUser.sleepFlag = false;
                    dyUser.sleepTime = 0;
                    dyUser.sleepReason = "";
                    setDyUser(groupCode, port, dyUser);
                    resetConsecutiveFailures(port, businessCode);
                    return {
                        success: true,
                        message: `实例 [端口 ${port}] 清除休眠标志成功`
                    }
                }
                if(dyUser.sleepFlags){
                    dyUser.sleepFlags[businessCode] = false;
                }
                if(dyUser.sleepTimes){
                    dyUser.sleepTimes[businessCode] = 0;
                }
                if(dyUser.sleepReasons){
                    dyUser.sleepReasons[businessCode] = "";
                }
                setDyUser(groupCode, port, dyUser);
                resetConsecutiveFailures(port, businessCode);
                return {
                    success: true,
                    message: `实例 [端口 ${port}] 清除休眠标志成功`
                };
            }
            return {
                success: false,
                message: `实例 [端口 ${port}] 清除休眠标志失败`
            };
        } catch (error: any) {
            console.error('清除休眠标志失败:', error);
            return { 
                success: false, 
                message: '清除休眠标志失败: ' + error.message 
            };
        }
    }
} 