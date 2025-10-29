import axios from "axios";
import { TaskHandler } from "./task.handler";
import log from "electron-log";
import FormData from "form-data";
import { TaskEntity, TaskResponse, TaskType } from "@model/task.entity";

export class ShTaskHandler extends TaskHandler {

    
    defaultTaskWaitTimes(taskType: string): number {
        if(taskType == TaskType.DIGG){
            return 120;
        }
        return 0;
    }

    getType(): string {
        return "sh";
    }

    getUrlPrefix(): string {
        // 四海平台API地址
        return "http://meetspace.top:2095";
    }

    // 获取提交任务的URL（与主API地址不同）
    getSubmitUrl(): string {
        return "http://meetspace.top";
    }

    defaultAllowGetTask(taskType: string): boolean {
        if(taskType == TaskType.DIGG){
            return true;
        }
        return false;
    }


    async getApikeyFromRemote(username: string, password: string): Promise<string | null> {
        try {
            const url = this.getUrl("/order/login");
            
            // 创建FormData对象
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            
            // 发送POST请求
            const response = await axios.post(url, formData, {
                headers: {
                    ...formData.getHeaders()
                }
            });
            
            const data = response.data;
            
            if (data.code !== 1) {
                return null;
            }
            
            // 假设token在data.data.token中，根据实际响应结构调整
            return data.token;
        } catch (e) {
            log.error(`[ShTaskHandler] 获取API密钥异常:`, e);
            return null;
        }
    }

    buildUrl(taskEntity: TaskEntity, taskType: string): string {
        return this.getUrl("/order/selectOneTask");
    }

    async getTaskByTaskType(port: string, taskEntity: TaskEntity, taskType: string): Promise<TaskResponse | null> {
        try {
            const url = this.buildUrl(taskEntity, taskType);
            // 创建FormData对象
            const formData = new FormData();
            formData.append('platform', '2');
            formData.append('platformType', '11');
            formData.append('uid', taskEntity.uid);
            formData.append('uidType', '2');
            formData.append('isPhoto', '2');
            
            // 发送POST请求
            const response = await axios.post(url, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'token': taskEntity.apiKey
                },
                timeout : 3000
            });
            
            const data = response.data;
            
            if (data.code !== 1) {
                return null;
            }
            
            const taskData = data.data;
            const taskResponse = new TaskResponse(
                taskData.video_id, 
                taskData.taskLogId, 
                taskData.secUid, 
                taskEntity.uid, 
                this.getType(), 
                taskEntity.apiKey, 
                port,
                taskEntity.oriApiKey
            );
            taskResponse.taskType = taskType;
            return taskResponse;
        } catch (e) {
            log.error(`[ShTaskHandler] 获取任务异常:`);
            return null;
        }
    }

    async doAction(apiKey: string, taskResponse: TaskResponse): Promise<void> {
            // 使用不同的提交URL
        const url = `${this.getSubmitUrl()}/order/taskSubmit`;
        
        // 创建FormData对象
        const formData = new FormData();
        formData.append('taskLogId', taskResponse.orderId);
        formData.append('status', '1');
        
        // 发送POST请求
        const response = await axios.post(url, formData, {
            headers: {
                ...formData.getHeaders(),
                'token': apiKey
            },
            timeout : 3000
        });
        
        const data = response.data;
        
        if (data.code !== 1) {
            log.error(`[ShTaskHandler] 提交任务失败: ${data.msg}`);
            return;
        }
    }
} 