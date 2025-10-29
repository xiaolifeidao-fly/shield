import { TaskEntity, TaskResponse, TaskType } from "@model/task.entity";
import { sleep } from "@utils/index";
import log from "electron-log";
import { getLastTaskTimeByType, PlatformUser, setLastTaskTimeByType, setLastTaskTimeByUid } from "../dy/store/dy.store";
import { AssignConfig, getAssignConfigs } from "../dy/store/sys.store";


const apiKeyMap = new Map<string, string>();

export function getApiKeyByUsername(type: string, username : string):string|null{
    const key = type + "_" + username;
    const apiKey = apiKeyMap.get(key);
    if(!apiKey){
        return null;
    }
    return apiKey;
}

export function setApiKeyByUsername(type: string, username : string, apiKey: string){
    const key = type + "_" + username;
    apiKeyMap.set(key, apiKey);
}

const platform = new Map<string, PlatformUser>();

export function getPlatformUserByApiKey(type: string, apiKey : string):PlatformUser|null{
    const key = type + "_" + apiKey;
    const platformUser = platform.get(key);
    if(!platformUser){   
        return null;
    }   
    return platformUser;
}

export function setPlatformUserByApiKey(type: string, apiKey : string, platformUser : PlatformUser){
    const key = type + "_" + apiKey;
    platform.set(key, platformUser);
}

export abstract class TaskHandler {


    constructor() {
    }

    allowGetTask(taskType: string): boolean {
        const allowTaskTypes = this.getAllowTaskTypes();
        if(allowTaskTypes.length == 0){
            return this.defaultAllowGetTask(taskType);
        }
        if(allowTaskTypes.includes(taskType.toUpperCase())){
            return true;
        }
        return false;
    }

    getTaskWaitTimes(taskType: string): number {
        const assignConfig = this.getAssignConfig();
        if(!assignConfig){
            return this.defaultTaskWaitTimes(taskType);
        }
        const taskTypeUpperCase = taskType.toUpperCase();
        if(taskTypeUpperCase in assignConfig.waitTimes){
            const waitTime = assignConfig.waitTimes[taskTypeUpperCase];
            return waitTime;
        }
        return this.defaultTaskWaitTimes(taskType);
    }

    abstract defaultTaskWaitTimes(taskType: string) : number;

    abstract defaultAllowGetTask(taskType: string) : boolean;
    
    getAllowTaskTypes() : string[] {
        const assignConfigs = getAssignConfigs();
        for(const assignConfig of assignConfigs){
            if(assignConfig.code == this.getType()){
                return assignConfig.allowTaskTypes;
            }
        }
        return [];
    }

    getAssignConfig() : AssignConfig | null {
        const assignConfigs = getAssignConfigs();
        for(const assignConfig of assignConfigs){
            if(assignConfig.code == this.getType()){
                return assignConfig;
            }
        }
        return null;
    }

    abstract getUrlPrefix() : string;

    abstract getType() : string;

    public async getApiKey(platformUser : PlatformUser) : Promise<string|null>{
        const apiKey = getApiKeyByUsername(this.getType(), platformUser.username);
        if(apiKey){
            return apiKey;
        }
        const newApiKey = await this.getApikeyFromRemote(platformUser.username, platformUser.password);
        if(!newApiKey){
            return null;
        }
        setPlatformUserByApiKey(platformUser.type, newApiKey, platformUser);
        setApiKeyByUsername(this.getType(), platformUser.username, newApiKey);
        return newApiKey;
    }

    abstract getApikeyFromRemote(username: string, password: string) : Promise<string|null>;

    getUrl(url: string) : string {
        return this.getUrlPrefix() + url;
    }

    abstract buildUrl(taskEntity: TaskEntity, taskType: string) : string;


    async getTask(port: string, taskEntity: TaskEntity, taskType: string) : Promise<TaskResponse | null>{
        const lastTaskTime = getLastTaskTimeByType(taskEntity.uid, taskType, this.getType());
        const now = Date.now();
        if(lastTaskTime){
            const waitTime = this.getTaskWaitTimes(taskType);
            const currentWaitTime = waitTime * 1000;
            const hadWaitTime = now - lastTaskTime;
            if(hadWaitTime < currentWaitTime){
                log.info(taskType, " ", this.getType(), " get task wait time: ", waitTime, " seconds, had wait time: ", hadWaitTime/1000, " seconds");
                return null;
            }
        }
        const task = await this.getTaskByTaskType(port, taskEntity, taskType);
        if(!task){
            return null;
        }
        setLastTaskTimeByType(taskEntity.uid, taskType, this.getType(), now);
        setLastTaskTimeByUid(taskEntity.uid, now);
        return task;
    }


    abstract getTaskByTaskType(port: string, taskEntity: TaskEntity, taskType: string) : Promise<TaskResponse | null>;

    async doSubmit(apiKey: string, taskResponse: TaskResponse) : Promise<void>{
        let retryCount = 10;
        while(retryCount > 0){
            try{
                await this.doAction(apiKey, taskResponse);
                return;
            }catch(e){
                log.error("submit error by {} ", taskResponse);
                await sleep(100);
                retryCount--;
            }
        }
    }

    abstract doAction(apiKey: string, taskResponse: TaskResponse) : Promise<void>;

}