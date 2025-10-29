import axios from "axios";
import { Page, Route } from "playwright";
import { Request } from "playwright";
import { DyEngine } from "../../dy.engine";
import { app } from "electron";
import path from "path";
import { sleep } from "@utils/index";
import log from "electron-log";
import { TaskResponse } from "@model/task.entity";
import { getEngineLegacy as getEngine } from "../../manager";
import { callbackDigg, callbackPlay } from "../../task/run";
import { TaskType } from "@model/task.entity";
import { requestLog } from "@src/door/model/log.request";
import { getDyUser, getWebDevice, setWebDevice } from "../../store/dy.store";
import { buildWebDevice, getSessionIdAndToken } from "@src/door/model/dy.web.device";


export class PlayMonitor {

    private portId: string;
    private taskResponse: TaskResponse | null = null;
    private startFlag: boolean = false;
    private page: Page | null = null;
    private logRequest: boolean = false;
    private headless: boolean = true;
    private cacheHeader: any = null;
    private cacheUrl : string | null = null;
    private cacheBody: any = null;
    private needLogin: boolean = false;
    private cacheUseNum: number = 0;

    constructor(portId: string, headless: boolean = true, needLogin: boolean = false) {
        this.portId = portId;
        this.headless = headless;
        this.needLogin = needLogin;
    }

    setLogRequest(logRequest: boolean){
        this.logRequest = logRequest;
    }

    setTaskResponse(taskResponse: TaskResponse | null){
        this.taskResponse = taskResponse;
    }

    getSessionDir() {
        const userDataPath = app.getPath('userData');
        const sessionDir = path.join(userDataPath, 'resource', 'dy', this.portId);
        return sessionDir;
    }

    async doPlay(request: Request, taskResponse: TaskResponse) :Promise<any>{
        const originalUrl = await request.url();
        const body = await request.postData();
        const headers = await request.headers();
        const params = new URLSearchParams(body || "");
        const bodyJson = Object.fromEntries(params.entries());
        this.cacheHeader = headers;
        this.cacheUrl = originalUrl;
        return this.playRequest(taskResponse, originalUrl, headers, bodyJson);
    }

    async playRequest(taskResponse: TaskResponse, originalUrl: string, headers: any, bodyJson: any){
        this.setTaskResponse(null);
        let axiosResponse: any = null;
        let successNum : number = 0;
        for(let i = 0; i < 1; i++){
            // 将其转换为对象
            bodyJson['aweme_id'] =  taskResponse.videoId;
            bodyJson['aweme_type'] = "0";
            bodyJson['play_delta'] = "1";
            bodyJson['source'] = "0";
            this.cacheBody = bodyJson;
            const bodyString = new URLSearchParams(bodyJson).toString();
            axiosResponse = await axios.post(originalUrl, bodyString, { headers: headers });
            const axiosResponseData = await axiosResponse.data;
            log.info("playRequest axiosResponseData is ", axiosResponseData);
            if(axiosResponseData.status_code == 0){
                successNum++;
            }else{
                return {axiosResponse, successNum};
            }
            await sleep(100);
        }
        return {axiosResponse, successNum};
    }

    public shouldInvoke(url: string, resourceType: string): boolean {
        // 图片和视频资源不使用代理
        if (resourceType === 'image') {
            return false;
        }
        if (resourceType === 'media') {
            return false;
        }

        // 字体文件不使用代理
        if (resourceType === 'font') {
            return false;
        }
        
        // 样式表可以选择性代理（通常不需要）
        if (resourceType === 'stylesheet') {
            return false;
        }
        
        if(url.endsWith(".css") || url.endsWith(".jpg") || url.endsWith(".png") || url.endsWith(".gif") || url.endsWith(".ico") || url.endsWith(".woff") || url.endsWith(".woff2") || url.endsWith(".ttf") || url.endsWith(".eot") || url.endsWith(".svg") || url.endsWith(".webp")) {
            return false;
        }
        if (resourceType === 'document') {
            return true;
        }
        
        if (resourceType === 'xhr' || resourceType === 'fetch') {
            return true;
        }
        return true;
    }

    async playIntercept(route: Route, request: Request) {
        try {
            const taskResponse = this.taskResponse;
            if(!taskResponse){
                await route.continue();
                return;
            }
            const {axiosResponse, successNum} = await this.doPlay(request, taskResponse);
            log.info("playIntercept videoId is ", taskResponse.videoId, " totalNum is ", taskResponse.totalNum, " successNum is ", successNum);
            const axiosResponseData = await axiosResponse.data;
            const axiosResponseDataString = JSON.stringify(axiosResponseData);
            const axiosResponseHeaders = await axiosResponse.headers;
            await route.fulfill({
                status: 200,
                headers: axiosResponseHeaders as any,
                contentType: 'application/json',
                body: axiosResponseDataString,
                });
            log.info("diggIntercept end ", axiosResponse.data, "taskResponse is ", this.taskResponse);
            if(this.doCallback){
                await this.doCallback(taskResponse, axiosResponseData, successNum);
            }
        } catch (e) {
            await route.abort();
            log.info("playIntercept error", e);
        }
    }

    async actionMonitor(page: Page) {
        await page.route('**/*', async (route) => {
            // 获取请求对象
            const request = route.request();
            if(!this.shouldInvoke(request.url(), request.resourceType())){
                // log.info("playIntercept not invoke ", request.url());
                await route.abort();
                return;
            }
            const requestUrl = await request.url();
            if (request.resourceType() == 'xhr') {
                const playUrl = "v2/web/aweme/stats";
                if (requestUrl.includes(playUrl)) {
                    if(!this.logRequest){
                        const headers = await request.headers();
                        const originalUrl = await request.url();
                        const dyUser = getDyUser(this.portId);
                        if(dyUser){
                            const webDevice = buildWebDevice(originalUrl, headers, "");
                            setWebDevice(this.portId, webDevice);
                        }
                        this.setLogRequest(true);
                    }
                }
            }
            await route.continue();
        });

        await page.on("response", async (response : any) => {
            if(!this.taskResponse){
                return;
            }
            const responseUrl = await response.request().url();
            if(responseUrl.includes("web/aweme/stats")){
                const responseBody = await response.json();
                // log.info("play no ck responseBody is ", responseBody);
                if(this.doCallback){
                    await this.doCallback(this.taskResponse, responseBody, 1);
                }
            }
        });
    }

    async confirmWindow(page: Page) {
        await sleep(2000);
        log.info("confirmWindow start");
        const confirmWindow = page.locator('#douyin-web-recommend-guide-mask');
        if(!confirmWindow){
            return;
        }
        log.info("confirmWindow found confirmWindow");
        const confirmWindowVisible = await confirmWindow.isVisible();
        log.info("confirmWindow is ", confirmWindowVisible);
        let num = 30;
        while(confirmWindowVisible && num > 0){
            const confirmButton = page.locator('#douyin-web-recommend-guide-mask button').first();
            log.info("confirmButton is found ");
            if(confirmButton){
                const confirmButtonVisible = await confirmButton.isVisible();
                log.info("confirmButton is ", confirmButtonVisible);
                if(confirmButtonVisible){
                    log.info("confirmButton click start");
                    await confirmButton.click();
                    log.info("confirmButton click end");
                    return;
                }
            }
            await sleep(1000);
            num--;
        }
    }



    public async start(headless: boolean = true): Promise<boolean> {
        if(this.startFlag){
            return true;
        }
        log.info("playMonitor start headless is ", headless);
        this.headless = headless;
        const engine = await getEngine(this.portId, headless);
        let page = engine.getPage();
        this.setLogRequest(false);
        const url = "https://www.douyin.com/?recommend=1";
        if(page){
            if(page.isClosed()){
                log.info("page is closed");
                page = await engine.init(url);
            }else{
                try{
                    await page.goto(url);
                }catch(error){
                    log.error("page goto error", error);
                }
            }
        }else{
            page = await engine.init(url);
        }
        if (!page) {
            return false;
        }
        if(this.needLogin){
            const isLogin = await this.checkAndInit(engine, page);
            if(!isLogin){
                return false;
            }
        }
        this.page = page;
        this.actionMonitor(page);
        this.startFlag = true;
        return true;
    }

    async doClickPlay(taskResponse: TaskResponse, page : Page){
        const webDevice = getWebDevice(this.portId);
        if(!webDevice){
            return;
        }
        const url = `https://www.douyin.com/aweme/v2/web/aweme/stats/?device_platform=webapp&aid=${webDevice.aid}&channel=${webDevice.channel}&pc_client_type=${webDevice.pcClientType}&pc_libra_divert=${webDevice.pcLibraDivert}&update_version_code=${webDevice.updateVersionCode}&support_h265=1&support_dash=1&version_code=${webDevice.versionCode}&version_name=${webDevice.versionName}&cookie_enabled=true&screen_width=${webDevice.screenWidth}&screen_height=${webDevice.screenHeight}&browser_language=${webDevice.browserLanguage}&browser_platform=${webDevice.browserPlatform}&browser_name=${webDevice.browserName}&browser_version=${webDevice.browserVersion}&browser_online=${webDevice.browserOnline}&engine_name=${webDevice.engineName}&engine_version=${webDevice.engineVersion}&os_name=${webDevice.osName}&os_version=${webDevice.osVersion}&cpu_core_num=${webDevice.cpuCoreNum}&device_memory=${webDevice.deviceMemory}&platform=${webDevice.platform}&downlink=${webDevice.downlink}&effective_type=${webDevice.effectiveType}&round_trip_time=${webDevice.roundTripTime}&webid=${webDevice.webid}`;
        const javascriptCode = `
        (function(){
                var url = "${url}";
                var params = new URLSearchParams();
                params.set("aweme_type","0");
                params.set("item_id","${taskResponse.videoId}");
                params.set("play_delta","1");
                params.set("source","0");
                var xhr = new XMLHttpRequest();
                xhr.open("POST", url, true);
                xhr.withCredentials = true;
                xhr.setRequestHeader("accept", "application/json, text/plain, */*");
                xhr.setRequestHeader("Accept-Language", "zh-CN,zh;q=0.9");
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                xhr.send(params.toString());
            })();
        `
        await page.evaluate(javascriptCode);
    }

    async actionClick(taskResponse: TaskResponse){
        this.setTaskResponse(taskResponse);
        if(!this.page){
            return;
        }
        await this.doClickPlay(taskResponse, this.page);
        await sleep(3000 + Math.random() * 7000);
    }

    async isLogin(page: Page){
        const loginText = await page.locator("#douyin_login_comp_flat_panel").first();
        if(loginText){
            let num = 10;
            let loginTextVisible = await loginText.isVisible();
            while(num > 0 && !loginTextVisible){
                await sleep(1000);
                loginTextVisible = await loginText.isVisible();
                log.info("is need login ", loginTextVisible);
                if(loginTextVisible){
                   return false;
                }
                num--;
            }
        }
        return true;
    }

    async checkAndInit(engine: DyEngine<{}>, page: Page){
        const isLogin = await this.isLogin(page);
        if(isLogin){
            log.info("isLogin is true");
            return true;
        }
        const loginButton = page.locator("#douyin-login-new-id .VWgr3GWj").first();
        if(loginButton){
            log.info("loginButton is found");
            let num = 30;
            let loginButtonVisible = await loginButton.isVisible();
            while(num > 0 && !loginButtonVisible){
                await sleep(1000);
                loginButtonVisible = await loginButton.isVisible();
                log.info("loginButton is ", loginButtonVisible);
                num--;
            }
            if(loginButtonVisible){
                const text = await loginButton.textContent();
                if(text && text.includes("一键登录")){
                    log.info("one loginButton click start");
                    await loginButton.click();
                    await sleep(5000);
                    log.info("one loginButton click end");
                    engine.saveContextState();
                    return true;
                }
                return false;
            }else{
                log.error("loginButton not visible");
            }
        }
        log.info("loginButton not need to login");
        return false;
    }

    async stop(): Promise<void> {
        this.startFlag = false;
    }

    async doCallback(taskResponse: TaskResponse, data: { [key: string]: any }, successNum: number){
        await callbackPlay(taskResponse, data, successNum);
    }
}





const diggMonitorManager = new Map<string, PlayMonitor>();

export function getPlayMonitor(port: string, headless: boolean = true, needLogin: boolean = false): PlayMonitor {
    if (!diggMonitorManager.has(port)) {
        diggMonitorManager.set(port, new PlayMonitor(port, headless, needLogin));
    }
    return diggMonitorManager.get(port)!;
}

export function removePlayMonitor(resourceId: string) {
    diggMonitorManager.delete(resourceId);
}