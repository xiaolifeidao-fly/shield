import log from "electron-log";
import { getGlobal, setGlobal } from "../../../../../common/utils/store/electron";
import { DyUser } from "@model/dy.entity";
import { TaskType } from "@model/task.entity";
import { WebDeviceDTO } from "@src/door/model/dy.web.device";
import { proxyGet } from "@src/utils/proxy.util";
import { CryptoUtil } from "@utils/crypto";
import { sleep } from "@utils/index";
import { BusinessGroup } from "@model/business.entity";




function getKey(port : string) : string {
    return "dy_user_" + port;
}

export function isLogin(dyUser : DyUser | null) : boolean {
    if(!dyUser) {
        return false;
    }
    if(!dyUser.uid){
        return false;
    }
    if(dyUser.isLogin == undefined){
        //兼容老的登录
        return true;
    }
    return dyUser.isLogin;
}

const dyUserMap = new Map<string, DyUser>();


function getPortKey(groupCode : string, port : string) : string {
    if(groupCode == BusinessGroup.DY){
        return port;
    }
    return groupCode + "_" + port;
}
export function getDyUser(groupCode : string, port : string) : DyUser |null {
    let portKey = getPortKey(groupCode, port);
    if(dyUserMap.has(portKey)){
        return dyUserMap.get(portKey) as DyUser;
    }
    const key = getKey(portKey);
    const dyUser = getGlobal(key);
    if(!dyUser) {
        return null;
    }
    return dyUser as DyUser;
}

export function setDyUser(groupCode : string, port : string, dyUser : DyUser) {
    let portKey = getPortKey(groupCode, port);
    dyUserMap.set(portKey, dyUser);
    const key = getKey(portKey);
    setGlobal(key, dyUser);
}

function buildHeadlessKey(port : string) : string {
    return "dy_user_headless_" + port;
}


export function setDyUserHeadless(port : string, headless : boolean) {
    const key = buildHeadlessKey(port);
    setGlobal(key, headless);
}

export function getDyUserHeadless(port : string) : boolean {
    const key = buildHeadlessKey(port);
    const headless = getGlobal(key);
    if(headless == undefined) {
        return true;
    }
    return headless as boolean; 
}

export class PlatformUser {
    id : string
    username : string
    password : string
    type : string

    constructor(id : string, username : string, password : string, type : string) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.type = type;
    }
}


function getPlatformUserPortKey(port : string) : string {
    return "platform_user_port_" + port;
}


export function getPlatformUserByPort(port : string) : PlatformUser[] {
    const key = getPlatformUserPortKey(port);
    const platformUsers = getGlobal(key);
    if(!platformUsers) {
        return [];
    }
    return platformUsers as PlatformUser[];
}

export function setPlatformUserByPort(port : string, platformUsers : PlatformUser[]) {
    const key = getPlatformUserPortKey(port);
    setGlobal(key, platformUsers);
}

export class DyUserStatistic {

    totalLoveNum : number
    totalTaskNum : number
    totalSubmitNum : number
    totalRealLoveNum : number
    totalErrorNum : number

    constructor(totalLoveNum : number, totalTaskNum : number, totalSubmitNum : number, totalRealLoveNum : number = 0, totalErrorNum : number = 0){
        this.totalLoveNum = totalLoveNum;
        this.totalTaskNum = totalTaskNum;
        this.totalSubmitNum = totalSubmitNum;
        this.totalRealLoveNum = totalRealLoveNum;
        this.totalErrorNum = totalErrorNum;
    }
}

export class DyUserTodayStatistic {

    totalLoveNum : number
    totalTaskNum : number
    totalSubmitNum : number
    totalRealLoveNum : number
    totalErrorNum : number

    constructor(totalLoveNum : number, totalTaskNum : number, totalSubmitNum : number, totalRealLoveNum : number, totalErrorNum : number){
        this.totalLoveNum = totalLoveNum;
        this.totalTaskNum = totalTaskNum;
        this.totalSubmitNum = totalSubmitNum;
        this.totalRealLoveNum = totalRealLoveNum;
        this.totalErrorNum = totalErrorNum;
    }
}    

function getDyUserStatisticKey(port : string, taskType : string) : string {
    if(taskType == TaskType.DIGG){
        return "dy_user_statistic_" + port;
    }
    return "dy_user_statistic_" + port + "_" + taskType;
}

function getDyUserTodayStatisticKey(port : string, date : string, taskType: string) : string {
    if(taskType == TaskType.DIGG){
        return "dy_user_today_statistic_" + port + "_" + date;
    }
    return "dy_user_today_statistic_" + port + "_" + date + "_" + taskType;
}


const dyUserStatisticMap = new Map<string, DyUserStatistic>();
const dyUserTodayStatisticMap = new Map<string, DyUserTodayStatistic>();


export function setDyUserStatistic(port : string, taskType : string, dyUserStatistic : DyUserStatistic) {
    const key = getDyUserStatisticKey(port, taskType);
    dyUserStatisticMap.set(port, dyUserStatistic);
    setGlobal(key, dyUserStatistic);
}

export function getDyUserStatistic(port : string, taskType : string) : DyUserStatistic {
    const key = getDyUserStatisticKey(port, taskType);
    if(dyUserStatisticMap.has(key)) {
        return dyUserStatisticMap.get(key) as DyUserStatistic;
    }
    const dyUserStatistic = getGlobal(key);
    if(!dyUserStatistic) {
        return new DyUserStatistic(0, 0, 0);
    }
    dyUserStatisticMap.set(key, dyUserStatistic as DyUserStatistic);
    return dyUserStatistic as DyUserStatistic;
}

export function setDyUserTodayStatistic(port : string, dyUserTodayStatistic : DyUserTodayStatistic, date : string, taskType: string) {
    const key = getDyUserTodayStatisticKey(port, date, taskType);
    dyUserTodayStatisticMap.set(key, dyUserTodayStatistic);
    setGlobal(key, dyUserTodayStatistic);
}   

export function getDyUserTodayStatistic(port : string, taskType: string) : DyUserTodayStatistic {
    const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    return getDyUserTodayStatisticByDate(port, date, taskType);
}

export function getDyUserTodayStatisticByDate(port : string, date : string, taskType: string) : DyUserTodayStatistic {
    const key = getDyUserTodayStatisticKey(port, date, taskType);
    if(dyUserTodayStatisticMap.has(key)) {
        return dyUserTodayStatisticMap.get(key) as DyUserTodayStatistic;
    }
    const dyUserTodayStatistic = getGlobal(key);
    if(!dyUserTodayStatistic) {
        return new DyUserTodayStatistic(0, 0, 0, 0, 0);
    }
    dyUserTodayStatisticMap.set(key, dyUserTodayStatistic as DyUserTodayStatistic);
    return dyUserTodayStatistic as DyUserTodayStatistic;
}

function getPortOperatorLogKey(port : string) : string {
    return "port_operator_log_" + port;
}


const portOperatorLogMap = new Map<string, string[]>();

export function getPortOperatorLog(port : string) : string[] {
    const key = getPortOperatorLogKey(port);
    if(portOperatorLogMap.has(port)) {
        return portOperatorLogMap.get(port) as string[];
    }
    const portOperatorLog = getGlobal(key);
    if(!portOperatorLog) {
        portOperatorLogMap.set(port, []);
        return [];
    }
    return portOperatorLog as string[];
}

export function addPortOperatorLog(port : string, log : string) {
    // 最多保存50条记录，超过则删除最早的一条
    const key = getPortOperatorLogKey(port);    
    const portOperatorLog = getPortOperatorLog(port);
    if(portOperatorLog.length >= 50) {
        portOperatorLog.shift();
    }
    portOperatorLog.push(log);
    portOperatorLogMap.set(port, portOperatorLog);
    setGlobal(key, portOperatorLog);
}


const platformUserStatisticMap = new Map<string, number>();

function getPlatformUserStatisticKey(username : string, type : string, port : string, taskType : string) : string {
    const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    if(taskType == TaskType.DIGG){
        return "platform_user_statistic_" + username + "_" + type + "_" + port + "_" + date;
    }
    return "platform_user_statistic_" + username + "_" + type + "_" + port + "_" + date + "_" + taskType;
}

export function getPlatformUserStatistic(username : string, type : string, port : string, taskType : string) : number {
    const key = getPlatformUserStatisticKey(username, type, port, taskType);
    if(platformUserStatisticMap.has(key)) {
        return platformUserStatisticMap.get(key) as number;
    }
    const statistic = getGlobal(key);
    if(!statistic) {
        return 0;
    }
    platformUserStatisticMap.set(key, statistic as number);
    return 0;
}

export function setPlatformUserStatistic(username : string, type : string, port : string, taskType : string, statistic : number) {
    const key = getPlatformUserStatisticKey(username, type, port, taskType);
    platformUserStatisticMap.set(key, statistic);
    setGlobal(key, statistic);
}


const platformMangerMap = new Map<string, PlatformUser>();

const platformScaleMap = new Map<string, number>();

export function init()  {
  platformMangerMap.set("ak", new PlatformUser("ak", "guanli", "guanli_123456", "ak"));
  platformMangerMap.set("xm", new PlatformUser("xm", "XXXX", "XXXX", "xm"));
  platformMangerMap.set("sh", new PlatformUser("sh", "qweqweqwe123", "Li960906", "sh"));
  platformMangerMap.set("syc", new PlatformUser("syc", "zl01", "a123456", "syc"));
  platformMangerMap.set("nm", new PlatformUser("nm", "guanli", "qweqweqwe123", "nm"));

  platformScaleMap.set("ak", 0.1);
  platformScaleMap.set("xm", 0.125);
  platformScaleMap.set("sh", 0.125);
  platformScaleMap.set("syc", 0.125);
  platformScaleMap.set("nm", 0.125);
  initPlatformManger();
}

export function initPlatformManger() {
    const key = ['S','O','F','T','_','P','L','A','T','F','O','R','M','_','A','C','C','O','U','N','T'];
    const keyString = key.join('');
    setTimeout(async () => {
        const responseData = await proxyGet("/dictionary/" + keyString);
        const responseDataString = CryptoUtil.decrypt(responseData.data);
        if(responseDataString == undefined || responseDataString == ""){
            return;
        }
        const responseJson = JSON.parse(responseDataString);
        for(const item of responseJson){
            platformMangerMap.set(item.type, new PlatformUser(item.type, item.account, item.password, item.type));
            platformScaleMap.set(item.type, Number(item.scale));
        }
        initPlatformManger();
    }, 1000 * 60 * 5);
}


export function getPlatformManger(type : string) : PlatformUser | undefined {
  return platformMangerMap.get(type);
}

export function getPlatformTypes() : string[] {
    return Array.from(platformMangerMap.keys());
}

export function getPlatformScale(type : string) : number | undefined {
  return platformScaleMap.get(type);
}



//连续失败
export function increaseConsecutiveFailures(port : string, taskType : string) {
    const key = getConsecutiveFailuresKey(port, taskType);
    let consecutiveFailures = getGlobal(key) as number;
    if(!consecutiveFailures) {
        consecutiveFailures = 0;
    }
    consecutiveFailures++;
    setGlobal(key, consecutiveFailures);
}

export function getConsecutiveFailures(port : string, taskType : string) : number {
    const key = getConsecutiveFailuresKey(port, taskType);
    const consecutiveFailures = getGlobal(key) as number;
    if(!consecutiveFailures) {
        return 0;
    }
    return consecutiveFailures;
}

export function resetConsecutiveFailures(port : string, taskType : string) {
    const key = getConsecutiveFailuresKey(port, taskType);
    setGlobal(key, 0);
}

function getConsecutiveFailuresKey(port : string, taskType : string) : string {
    if(taskType == TaskType.DIGG){
        return "consecutive_failures_" + port;
    }
    return "consecutive_failures_" + port + "_" + taskType;
}


function getWebDeviceKey(port : string) : string {
    return "web_device_" + port;
}

export function getWebDevice(port : string) : WebDeviceDTO | null {
    const key = getWebDeviceKey(port);
    const webDevice = getGlobal(key) as WebDeviceDTO;
    if(!webDevice) {
        return null;
    }
    return webDevice;
}

export function setWebDevice(port : string, webDevice : WebDeviceDTO) {
    const key = getWebDeviceKey(port);
    setGlobal(key, webDevice);
}


export function initDyUser(groupCode : string, port : string, ckJson : any){
    if(!('origins' in ckJson)){
        return;
    }
    const origins = ckJson.origins;
    if(!origins){
        return;
    }
    let dyUser = getDyUser(groupCode, port);
    if(!dyUser){
        dyUser = new DyUser("", "", false, "");
        setDyUser(groupCode, port, dyUser);
    }
    for(const origin of origins){
        if(!('localStorage' in origin)){
            continue;
        }
        const localStorage = origin.localStorage;
        if(!localStorage){
            continue;
        }
        for(const item of localStorage){
            if(item.name == "user_info"){
                const userInfo = JSON.parse(item.value);
                const secUid = userInfo.uid;
                const nickname = userInfo.nickname;
                dyUser.secUid = secUid;
                dyUser.nickName = nickname;
                dyUser.isLogin = true;
                setDyUser(groupCode, port, dyUser);
            }
            if(item.name == "LOG_TRACE"){
                try{
                    const logTraces = JSON.parse(item.value);
                    for(const log of logTraces){
                        if(log.uid && (dyUser.uid == "" || !dyUser.uid)){
                            dyUser.uid = log.uid;
                            setDyUser(groupCode, port, dyUser);
                            break;
                        }
                    }
                }catch(error){
                }
            }
        }
    }
}

const lastTaskTimeMap = new Map<string, number>();


export function getLastTaskTimeByUid(uid : string) : number | undefined {
    const lastNumer = lastTaskTimeMap.get(uid);
    return lastNumer as number | undefined;
}

export function setLastTaskTimeByUid(uid : string, lastTaskTime : number) {
    lastTaskTimeMap.set(uid, lastTaskTime);
}

const lastTaskTimeByTypeMap = new Map<string, number>();

export function getLastTaskTimeByType(uid : string, taskType : string, type : string) : number | undefined {
    const key = uid + "_" + type + "_" + taskType;
    const lastNumer = lastTaskTimeByTypeMap.get(key);
    return lastNumer as number | undefined;
}

export function setLastTaskTimeByType(uid : string, taskType : string, type : string, lastTaskTime : number) {
    const key = uid + "_" + type + "_" + taskType;
    lastTaskTimeByTypeMap.set(key, lastTaskTime);
}
