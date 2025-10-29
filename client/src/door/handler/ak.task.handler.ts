import axios from "axios";
import { TaskHandler } from "./task.handler";
import { TaskEntity, TaskResponse, TaskType } from "@model/task.entity";
import log from "electron-log";
import { getPlatformManger } from "../dy/store/dy.store";


export class AkTaskHandler extends TaskHandler {

    getUrlPrefix(): string {
        return "http://47.110.54.97:9999"
    }

    getType(): string {
        return "ak";
    }

    defaultTaskWaitTimes(taskType: string): number {
        return 0;
    }

    defaultAllowGetTask(taskType: string): boolean {
        if(taskType == TaskType.DIGG){
            return true;
        }
        if(taskType == TaskType.MI_PLAY || taskType == TaskType.MI_PLAY_NO_CK){
            return true;
        }
        return false;
    }

    async getApikeyFromRemote(username: string, password: string) : Promise<string|null>{
        const url = this.getUrl("/appUser/pubToken?username=" + username + "&password=" + password);
        const response = await axios.get(url);
        const data = response.data;
        if(data.status != 0){
            return null;
        }
        return data.data.pubToken;
    }

    buildUrl(taskEntity: TaskEntity, taskType: string): string {
        let code = "MI_MIN_LOVE"
        if(taskType == TaskType.DIGG){
            code = "MI_MIN_LOVE";
        }else if(taskType == TaskType.MI_PLAY){
            code = TaskType.MI_PLAY;
        }else if(taskType == TaskType.MI_PLAY_NO_CK){
            code = TaskType.MI_PLAY_NO_CK;
        }
        const url = this.getUrl("/batch/tasks/get?uid=" + taskEntity.uid + "&uidType=DY&code="+code+"&secUid=" + taskEntity.secUid);
        return url;
    }

    async getApiKeyByTaskType(apiKey: string, taskType: string) : Promise<string | null> {
        if(taskType == TaskType.MI_PLAY || taskType == TaskType.MI_PLAY_NO_CK){
            const platformManger = getPlatformManger(this.getType());
            if(!platformManger){
                return null;
            }
            return await super.getApiKey(platformManger);
        }
        return apiKey;
    }

    async getTaskByTaskType(port: string, taskEntity: TaskEntity, taskType: string) : Promise<TaskResponse | null> {
        try{
            const url = this.buildUrl(taskEntity, taskType);
            const response = await axios.get(url, {
                headers: {
                    "pub_token": await this.getApiKeyByTaskType(taskEntity.apiKey, taskType)
                },
                timeout : 3000
            });
            const data = response.data;
            if(data.status != 0){
                // log.error("get ak task error: ", JSON.stringify(data), " with ", taskType);
                return null;
            }
            const dyData = data.data;
            const taskResponse = new TaskResponse(dyData.videoId, dyData.orderId, taskEntity.secUid, taskEntity.uid, this.getType(), taskEntity.apiKey, port, taskEntity.oriApiKey);
            taskResponse.taskType = taskType;
            taskResponse.totalNum = dyData.totalNum || 1;
            return taskResponse;
        }catch(e){
            log.error("get ak task error with ", taskType);
            return null;
        }
    }

    async doAction(apiKey: string, taskResponse: TaskResponse) : Promise<void> {
        const url = this.getUrl("/batch/tasks/submit");
        const response = await axios.post(url, {
            "orderId": taskResponse.orderId,
        }, {
            headers: {
                "pub_token": await this.getApiKeyByTaskType(apiKey, taskResponse.taskType),
                "Content-Type": "application/json"
            },
            timeout : 3000
        });
        const data = response.data;
        if(data.status != 0){
            log.error("submit ak error: ", data);
            return;
        }
        log.info("submit ak success: ", data);
    }
}