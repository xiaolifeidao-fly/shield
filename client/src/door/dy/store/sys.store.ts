import { CryptoUtil } from "@src/utils/crypto.util";
import { proxyGet, proxyGetDataList } from "@src/utils/proxy.util";
import { getGlobal, setGlobal } from "@utils/store/electron";
import { plainToInstance } from "class-transformer";
import log from "electron-log";


export class AssignConfig{
    code : string;
    waitTimes : {
        [key: string]: number;
    } = {};
    allowTaskTypes : string[] = [];

    constructor(code: string, waitTimes: {
        [key: string]: number;
    } = {}, allowTaskTypes: string[] = []){
        this.code = code;
        this.waitTimes = waitTimes;
        this.allowTaskTypes = allowTaskTypes;
    }
}

export let assignConfigsList : AssignConfig[] | undefined = undefined;

export const getAssignConfigs = () : AssignConfig[] => {
    if(assignConfigsList != undefined){
        return assignConfigsList;
    }
    const assignConfigs = getGlobal("assign_config");
    if(assignConfigs == undefined){
        return [];
    }
    assignConfigsList = [];
    for(const assignConfig of assignConfigs){
        const assignConfigInstance = new AssignConfig(assignConfig.code, assignConfig.waitTimes, assignConfig.allowTaskTypes);
        assignConfigsList.push(assignConfigInstance);
    }
    assignConfigsList = assignConfigsList;
    return assignConfigsList;
}

const saveAssignConfigs = async (assignConfigs: AssignConfig[]) => {
    assignConfigsList = assignConfigs;
    setGlobal("assign_config", assignConfigs);
}

export const initAssignConfigs = async () => {
    const key = ['S','O','F','T','_','P','L','A','T','F','O','R','M','_','A','S','S','I','G','N','_','C','O','N','F','I','G'];
    const keyString = key.join('');
    const responseData = await proxyGet("/dictionary/" + keyString);
    const responseDataString = CryptoUtil.decrypt(responseData.data);    
    if(responseDataString == undefined || responseDataString == ""){
        return;
    }
    const responseJson = JSON.parse(responseDataString);
    const dataList : AssignConfig[] = []
    responseJson.forEach((item: {}) => {
        const itemInstance = plainToInstance(AssignConfig, item);
        dataList.push(itemInstance);
    })
    saveAssignConfigs(dataList);
}


export const guardAssignConfigs = async () => {
    setTimeout(async () => {
        initAssignConfigs();
        guardAssignConfigs();
    }, 1000 * 60 * 5);
}



