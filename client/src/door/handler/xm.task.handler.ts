import axios from "axios";
import { TaskHandler } from "./task.handler";
import { TaskEntity, TaskResponse, TaskType } from "@model/task.entity";
import log from "electron-log";

export class XmTaskHandler extends TaskHandler {

    defaultTaskWaitTimes(taskType: string): number {
        if(taskType == TaskType.DIGG){
            return 60;
        }
        return 0;
    }

    getType(): string {
        return "xm";
    }

    defaultAllowGetTask(taskType: string): boolean {
        if(taskType == TaskType.MI_PLAY || taskType == TaskType.MI_PLAY_NO_CK){
            return false;
        }
        return true;
    }

    async getApikeyFromRemote(username: string, password: string): Promise<string | null> {
        try{
            const url = this.getUrl("/apikey?account=" + username + "&pwd=" + password);
            const response = await axios.get(url);
            const data = response.data;
            if(!data.success){
                return null;
            }
            return data.data.accesskey;
        }catch(e){
            log.error("getApikeyFromRemote from xiongmao error");
            return null;
        }
    }

    getUrlPrefix(): string {
        return "https://api.xfqtm.top"
    }

    async getTaskByTaskType(port: string, taskEntity: TaskEntity, taskType: string) : Promise<TaskResponse | null> {
        try{
            const taskUrl = this.buildUrl(taskEntity, taskType);
            const response = await axios.get(taskUrl,
                {
                    timeout : 3000
                }
            );
            const data = response.data;
            if(!data.success){
                log.error("getTask from xiongmao error: ", JSON.stringify(data), " by ", taskType);
                return null;
            }
            const dyData = data.data;
            const params = dyData.params;
            let videoId = params.video_id;
            if(taskType == TaskType.FOLLOW){
                videoId = params.uid;
            }
            const taskResponse = new TaskResponse(videoId, dyData.studiotask_id, taskEntity.secUid, taskEntity.uid, this.getType(), taskEntity.apiKey, port, taskEntity.oriApiKey);
            taskResponse.taskType = taskType;
            return taskResponse;
        }catch(e){
            log.error("getTask from xiongmao error");
            return null;
        }   
        
    }

    buildUrl(taskEntity: TaskEntity, taskType: string): string {
        let url = this.getUrl("/studio/api/task/get?key=" + taskEntity.apiKey + "&platform=dy&uid=" + taskEntity.uid + "&sec_uid=" + taskEntity.secUid + "&filter=video");
        if(taskType == TaskType.DIGG){
            url += "&type=dz";
        }else if(taskType == TaskType.COLLECT){
            url += "&type=sc";
            // url += "&type=dz";
        }else if(taskType == TaskType.FOLLOW){
            url += "&type=gz";
        }
        return url;
    }

    async doAction(apiKey: string, taskResponse: TaskResponse) : Promise<void> {
        let type = "dz";
        if(taskResponse.taskType == TaskType.COLLECT){
            type = "sc";
            // type = "dz";
        }else if(taskResponse.taskType == TaskType.FOLLOW){
            type = "gz";
        }
        const url = this.getUrl("/studio/api/task/submit?key=" + apiKey + "&platform=dy&type="+type+"&studiotask_id=" + taskResponse.orderId);
        const response = await axios.get(url,{
            timeout : 3000,
        });
        const data = response.data;
        if(!data.success){
            return;
        }
    }
}