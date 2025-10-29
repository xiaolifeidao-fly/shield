import axios from "axios";
import { TaskHandler } from "./task.handler";
import { TaskEntity, TaskResponse, TaskType } from "@model/task.entity";
import log from "electron-log";


export class NmTaskHandler extends TaskHandler {
    getTaskScale(): number {
        return 5;
    }

    getUrlPrefix(): string {
        return "https://api.ningmeng88.com"
    }

    getType(): string {
        return "nm";
    }

    defaultAllowGetTask(taskType: string): boolean {
        if (taskType == TaskType.DIGG) {
            return true;
        }
        return false;
    }

    defaultTaskWaitTimes(taskType: string): number {
        if(taskType == TaskType.DIGG){
            return 180;
        }
        return 0;
    }

    async getApikeyFromRemote(username: string, password: string): Promise<string | null> {
        const url = this.getUrl("/api/token/info");
        const postData = {
            "user_name": username,
        }
        const response = await axios.post(url, postData, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = response.data;
        if (data.status_code != 200) {
            return null;
        }
        return data.token;
    }

    buildUrl(taskEntity: TaskEntity, taskType: string): string {
        return this.getUrl("/api/douyin/task");
    }

    async getTaskByTaskType(port: string, taskEntity: TaskEntity, taskType: string): Promise<TaskResponse | null> {
        try {
            const url = this.buildUrl(taskEntity, taskType);
            const postData = { 
                "token": taskEntity.apiKey, 
                "platform_type": "dy", 
                "goods_type": "dz", 
                "platform_uid": taskEntity.uid, 
                "way": "xy", 
                "sec_uid": taskEntity.secUid, 
                "filter": "video" 
            }

            const response = await axios.post(url, postData, {
                headers: {
                    "pub_token": taskEntity.apiKey
                },
                timeout: 3000
            });
            const data = response.data;
            if (data.status_code != 200) {
                log.error("get nm task error: ", JSON.stringify(data), " with ", taskType);
                return null;
            }
            const dyData = data;
            const taskResponse = new TaskResponse(dyData.video_id, dyData.sn, taskEntity.secUid, taskEntity.uid, this.getType(), taskEntity.apiKey, port, taskEntity.oriApiKey);
            taskResponse.taskType = taskType;
            taskResponse.totalNum = 1;
            return taskResponse;
        } catch (e) {
            log.error("get nm task error with ", taskType);
            return null;
        }
    }

    async doAction(apiKey: string, taskResponse: TaskResponse): Promise<void> {
        const url = this.getUrl("/api/task/save");
        const response = await axios.post(url, {
            "sn": taskResponse.orderId,
        }, {
            headers: {
                "pub_token": apiKey,
                "Content-Type": "application/json"
            },
            timeout: 3000
        });
        const data = response.data;
        if (data.status != 200) {
            log.error("submit nm error: ", data);
            return;
        }
        log.info("submit nm success: ", data);
    }
}