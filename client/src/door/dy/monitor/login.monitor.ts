import log from "electron-log";
import { Response } from "playwright-core";
import { DoorEntity } from "../entity";
import { MonitorResponse } from "@src/door/monitor/monitor";
    
export class DyLoginMonitor extends MonitorResponse<{}>{
    
    async isMatch(url: string, method: string, headers: { [key: string]: string; }): Promise<boolean> {
        if(url.includes("web/aweme/favorite/")){
            return true;
        }
        return false;
    }


    getType(): string {
        return "login";
    }

    getKey(): string{
        return "loginData";
    }

    public async getResponseData(response: Response): Promise<DoorEntity<{}>> {
        const result =  await response.json();
        return new DoorEntity<{}>(true, result);
    }

    public needHeaderData(): boolean {
        return true;
    }
}


export class OneLoginMonitor extends MonitorResponse<{}>{
    
    async isMatch(url: string, method: string, headers: { [key: string]: string; }): Promise<boolean> {
        if(url.includes("passport/web/one_login/")){
            return true;
        }
        return false;
    }


    getType(): string {
        return "onelogin";
    }

    getKey(): string{
        return "onelogin";
    }

    public needHeaderData(): boolean {
        return true;
    }

    public async getResponseData(response: Response): Promise<DoorEntity<{}>> {
        const contentType = response.headers()['content-type'];
        if(contentType.includes('application/json')){
            try{
                const result =  await response.json();
                log.info("oneLogin result is ", result);
                if(result.message == "error"){
                    const messageContent = result.data?.description;
                    return new DoorEntity<{}>(false, messageContent);
                }
                if(result.message == "success"){
                    return new DoorEntity<{}>(true, result);
                }
                return new DoorEntity<{}>(false, result);
            }catch(error){
                return new DoorEntity<{}>(true, "登录成功");
            }
        }
        if (contentType && contentType.includes('text/html')) {
            return new DoorEntity<{}>(true, "登录成功");
        }
        return new DoorEntity<{}>(false, "登录失败,请尝试扫码登录");
    }
}


