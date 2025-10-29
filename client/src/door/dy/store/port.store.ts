import { BusinessGroup } from "@model/business.entity";
import { TaskType } from "@model/task.entity";
import { sleep } from "@utils/index";
import { getGlobal, setGlobal } from "@utils/store/electron";
import log from 'electron-log';
export class PortInstance {

    port : string;
    uid : string;
    createTime : string;
    runningStatus : string;
    totalLoveNum : number;
    todayTotalLoveNum : number;

    constructor(port : string, uid : string, createTime : string, runningStatus : string, totalLoveNum : number,todayTotalLoveNum : number ){
        this.port = port;
        this.uid = uid;
        this.createTime =createTime;
        this.runningStatus = runningStatus;
        this.totalLoveNum = totalLoveNum;
        this.todayTotalLoveNum = todayTotalLoveNum;
    }
}

function buildPortInstanceKey(port : string) : string {
    return `port_instance_${port}`;
}

export function createInstance(groupCode : string) : PortInstance {
    const instance = new PortInstance("", "", new Date().toISOString(), "stopped", 0, 0);
    const instances = getAllInstances(groupCode);
    let maxPort = 1;
    for(const instance of instances){
        const portNumber = Number(instance.port);
        if(portNumber > maxPort){
            maxPort = portNumber;
        }
    }
    instance.port = String(maxPort + 1);
    instances.push(instance);
    setGlobal(buildPortInstancesKey(groupCode), instances);
    return instance;
}

function buildLastPortKey() : string {
    return "last_port";
}

export function getLastPort() : string {
    const key = buildLastPortKey();
    const lastPort = getGlobal(key);
    if(!lastPort){
        return "0";
    }
    try{
        return String(Number(lastPort));
    }catch(error: any){
        log.error("getLastPort error ", error);
        return "0";
    }
}

export function setLastPort(port : string) {
    const key = buildLastPortKey();
    setGlobal(key, port);
}

export async function removeInstance(groupCode : string, port : string) {
    try{
        let instances = getAllInstances(groupCode);
        const newInstances : PortInstance[] = [];
        for(const instance of instances){
            if(String(instance.port) !== String(port)){
                newInstances.push(instance);
            }
        }
        setGlobal(buildPortInstancesKey(groupCode), newInstances);
    }catch(error){
        log.error("removeInstance error ", error);
    }
}

function buildPortInstancesKey(groupCode : string) : string {
    if(groupCode == BusinessGroup.DY){
        return "port_instances";
    }
    return "port_instances_" + groupCode;
}

function buildPortInstancesNoCkKey() : string {
    return "port_instances_no_ck_1";
}

export function getAllInstances(groupCode : string) : PortInstance[] {
    const key = buildPortInstancesKey(groupCode);
    const instances = getGlobal(key);
    if(!instances){
        return [];
    }
    return instances;
}

export function getAllNoCkInstances() : PortInstance[] {
    const key = buildPortInstancesNoCkKey();
    const instances = getGlobal(key);
    if(!instances){
        return [];
    }
    return instances;
}

export function setAllNoCkInstances(instances : PortInstance[]) {
    const key = buildPortInstancesNoCkKey();
    setGlobal(key, instances);
}

export function addNoCkInstance(instance : PortInstance) {
    const instances = getAllNoCkInstances();
    //如果实例的port 和 cacheInstance的port相同，则进行覆盖，否则添加到newInstances中
    let isExist = false;
    log.info("addNoCkInstance instances is ", instances.length);
    for(let i = 0; i < instances.length; i++){
        const cacheInstance = instances[i];
        if(instance.port == cacheInstance.port){
            instances[i] = instance;
            isExist = true;
            break;
        }
    }
    if(!isExist){
        instances.push(instance);
    }
    log.info("addNoCkInstance newInstances is ", instances.length);
    setAllNoCkInstances(instances);
}

export function getInstance(port : string) : PortInstance | null {
    const key = buildPortInstanceKey(port);
    const instance = getGlobal(key);
    return instance;
}

const statusMap = new Map<string, string>();

export function getStatusByPort(port : string) : string {
    const status = statusMap.get(String(port));
    if(!status){
        return "stopped";
    }else{
        return status;
    }
}

export function setStatusByPort(port : string, status : string) {
    statusMap.set(String(port), status);
}

function buildNoCkPortKey(num : number) : string {
    //日期年月日
    const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    return "no_ck_port_" + num + "_" + date;
}

export function getNoCkPort(num : number){
    const noCkPortKey = buildNoCkPortKey(num);
    const noCkPort = getGlobal(noCkPortKey);
    if(noCkPort){
        return noCkPort;
    }
    const port = generateRandomString(20);
    setGlobal(noCkPortKey, port);
    return port;
}

//随机生成20位字母和数字
export function generateRandomString(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for(let i = 0; i < length; i++){
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}


const portTaskTypeChooseMap = new Map<string, boolean>();

export function getPortTaskTypeChoose(port : string, taskType : string) : boolean {
    if(taskType == TaskType.MI_PLAY_NO_CK || taskType == TaskType.MI_PLAY){
        return true;
    }
    const key = port + "_" + taskType;
    const choose = portTaskTypeChooseMap.get(key);
    if(choose == undefined){
        const cacheChoose = getGlobal(key);
        if(cacheChoose == undefined){
            if(taskType == TaskType.DIGG){
                return true;
            }
            return false;
        }
        portTaskTypeChooseMap.set(key, cacheChoose);
        return cacheChoose;
    }
    return choose;
}

export function setPortTaskTypeChoose(port : string, taskType : string, choose : boolean) {
    const key = port + "_" + taskType;
    portTaskTypeChooseMap.set(key, choose);
    setGlobal(key, choose);
}