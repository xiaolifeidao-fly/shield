import { MonitorRequest, MonitorResponse } from "@src/door/monitor/monitor";
import log from "electron-log";
import { Response } from "playwright-core";
import { DoorEntity } from "../entity";
    

export class SendSmsCodeMonitor extends MonitorResponse<{}>{
    
    async isMatch(url: string, method: string, headers: { [key: string]: string; }): Promise<boolean> {
        if(url.includes("/passport/web/send_code/")){
            return true;
        }
        return false;
    }


    getType(): string {
        return "sendSmsCode";
    }

    getKey(): string{
        return "sendSmsCode";
    }

    public async getResponseData(response: Response): Promise<DoorEntity<{}>> {
        const result =  await response.json();
        log.info("login sms monitor result is ", result);
        if(result.message == "error"){
            const messageContent = result.data?.description;
            return new DoorEntity<{}>(false, messageContent);
        }
        if(result.message == "success"){
            return new DoorEntity<{}>(true, result);
        }
        return new DoorEntity<{}>(false, "发送验证码失败");
    }
}



export class DyLoginSmsValidateMonitor extends MonitorResponse<{}>{
    
    async isMatch(url: string, method: string, headers: { [key: string]: string; }): Promise<boolean> {
        if(url.includes("/passport/web/validate_code/")){
            return true;
        }
        return false;
    }


    getType(): string {
        return "smsLoginValidate";
    }

    getKey(): string{
        return "smsLoginValidate";
    }

    public async getResponseData(response: Response): Promise<DoorEntity<{}>> {
        const result =  await response.json();
        log.info("login sms monitor result is ", result);
        if(result.message == "error"){
            const messageContent = result.data?.description;
            return new DoorEntity<{}>(false, messageContent);
        }
        if(result.message == "success"){
            return new DoorEntity<{}>(true, result);
        }
        return new DoorEntity<{}>(false, "验证码错误");
    }
}


export class DyLoginSmsMonitor extends MonitorResponse<{}>{
    
    async isMatch(url: string, method: string, headers: { [key: string]: string; }): Promise<boolean> {
        if(url.includes("/passport/web/sms_login/")){
            return true;
        }
        return false;
    }


    getType(): string {
        return "smsLogin";
    }

    getKey(): string{
        return "smsLogin";
    }

    public async getResponseData(response: Response): Promise<DoorEntity<{}>> {
        const contentType = response.headers()['content-type'];
        if(contentType.includes('application/json')){
            try{
                const result =  await response.json();
                log.info("login sms monitor result is ", result);
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
