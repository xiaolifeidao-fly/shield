import axios from "axios";
import { TaskHandler } from "./task.handler";
import { TaskEntity, TaskResponse, TaskType } from "@model/task.entity";
import log from "electron-log";

export class SycTaskHandler extends TaskHandler {

    getTaskScale(): number {
        return 10;
    }

    defaultAllowGetTask(taskType: string): boolean {
        if(taskType == TaskType.MI_PLAY || taskType == TaskType.MI_PLAY_NO_CK){
            return false;
        }
        if(taskType == TaskType.DIGG){
            return true;
        }
        return true;
    }

    getType(): string {
        return "syc";
    }

    getUrlPrefix(): string {
        return "http://www.sanyecao.co:98";
    }

    defaultTaskWaitTimes(taskType: string): number {
        if(taskType == TaskType.DIGG){
            return 120;
        }
        return 0;
    }

    async getApikeyFromRemote(username: string, password: string): Promise<string | null> {
        const url = this.getUrl(`/keys?account=${username}&password=${password}`);
        
        const response = await axios.get(url);
        const data = response.data;
        if (data.code !== 0) {
            log.error(`[SycTaskHandler] 获取API密钥失败: ${data.msg}`);
            return null;
        }
        
        return data.data.accesskey;
    }

    async getTaskByTaskType(port: string, taskEntity: TaskEntity, taskType : string): Promise<TaskResponse | null> {
        try {
            const taskUrl = this.buildUrl(taskEntity, taskType);
            log.info(`[SycTaskHandler] 获取任务: ${taskUrl}`);
            const response = await axios.get(taskUrl,{
                timeout : 3000
            });
            const data = response.data;
            if (data.code !== 0) {
                log.error(`[SycTaskHandler] 获取任务失败: ${JSON.stringify(data)} by ${taskType}`);
                return null;
            }
            
            const taskData = data.data;
            let videoId = taskData.video_id;
            if(taskType == TaskType.FOLLOW){
                videoId = taskData.uid;
            }
            const taskResponse = new TaskResponse(
                videoId.toString(), 
                taskData.task_id.toString(), 
                taskEntity.secUid, 
                taskEntity.uid, 
                this.getType(), 
                taskEntity.apiKey, 
                port,
                taskEntity.oriApiKey
            );
            taskResponse.taskType = taskType;
            return taskResponse;
        } catch (e) {
            log.error(`[SycTaskHandler] 获取任务异常:`);
            return null;
        }
    }

    buildUrl(taskEntity: TaskEntity, taskType: string): string {
        let url = this.getUrl("/pull?key=" + taskEntity.apiKey + "&uid=" + taskEntity.uid + "&sec_uid=" + taskEntity.secUid);
        if(taskType == TaskType.DIGG){
            url += "&type=sp";
        }else if(taskType == TaskType.COLLECT){
            url += "&type=sc";
        }else if(taskType == TaskType.FOLLOW){
            url += "&type=gz";
        }
        return url;
    }

    async doAction(apiKey: string, taskResponse: TaskResponse): Promise<void> {
        try {
            let type = "sp";
            if(taskResponse.taskType == TaskType.COLLECT){
                type = "sc";
            }else if(taskResponse.taskType == TaskType.FOLLOW){
                type = "gz";
            }
            const url = this.getUrl(`/push?key=${apiKey}&uid=${taskResponse.uid}&sec_uid=${taskResponse.secUid}&type=${type}&task_id=${taskResponse.orderId}`);
            const response = await axios.get(url,{
                timeout : 3000,
            });
            const data = response.data;
            if (data.code !== 0) {
                log.error(`[SycTaskHandler] 提交任务失败:`, JSON.stringify(data));
                return;
            }
            log.info(`[SycTaskHandler] 提交任务成功: ${data.msg} by ${taskResponse.apiKey}`);
        } catch (e) {
            log.error(`[SycTaskHandler] 提交任务异常:`, e);
        }
    }
} 