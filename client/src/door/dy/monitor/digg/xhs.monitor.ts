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
import { requestLog } from "@src/door/model/log.request";
import { getConsecutiveFailures, getDyUser, getWebDevice, setWebDevice } from "../../store/dy.store";
import { buildWebDevice, getSessionIdAndToken } from "@src/door/model/dy.web.device";
import { AbsMonitor } from "./abs.monitor";
import { TaskResult } from "./monitor.manager";

const XHS_JAVASCRIPT_CODE = ['f','u','n','c','t','i','o','n',' ','r','e','g','i','s','t','e','r','H','t','t','p','(','e',')','{','c','=','e','}','(','r','(','9','8','8','9','6',')','.','d','J',')'].join('');
const XHS_WINDOWS_CODE = ['_','_','x','2','$','g','r','e','r','e','r','2','x','2','1','2','_','_'].join('');
const XHS_JAVASCRIPT_CODE_REPLACE = ['f','u','n','c','t','i','o','n',' ','r','e','g','i','s','t','e','r','H','t','t','p','(','e',')','{','w','i','n','d','o','w','.',XHS_WINDOWS_CODE,'=','e',';','c','=','e','}','(','r','(','9','8','8','9','6',')','.','d','J',')'].join('');

export class XhsMonitor extends AbsMonitor{

    constructor(groupCode : string, portId: string, headless: boolean = true) {
        super(groupCode, portId, headless);
    }
    
    async doInit(route: Route, request: Request): Promise<void> {
        const originalUrl = request.url();
        const headers = request.headers();
        try {
            const axiosResponse: any = await axios.get(originalUrl, { headers: headers });
            // 响应是 js 文件内容 
            let axiosResponseDataString = await axiosResponse.data;
            if(axiosResponseDataString.includes("function registerHttp(e){c=e}(r(98896).dJ)")){
                axiosResponseDataString = axiosResponseDataString.replace("function registerHttp(e){c=e}(r(98896).dJ)", "function registerHttp(e){window.__x24grereer2x212__=e;c=e}(r(98896).dJ)");
            }
            const axiosResponseHeaders = await axiosResponse.headers;
            await route.fulfill({
                status: 200,
                headers: axiosResponseHeaders as any,
                contentType: 'application/json',
                body: axiosResponseDataString,
            });
        } catch (e) {
            await route.abort();
            log.info("diggIntercept error", e);
        }

    }



    async doClickLike(taskResponse: TaskResponse, page : Page){
        const noteOid = "68f3a9f10000000004011955";
        const javascriptCode = `
        (function(){
            window.doPost.post("/api/sns/web/v1/note/like", {
            "note_oid": "${noteOid}",
            }, {})
        })();
        `
        await page.evaluate(javascriptCode);
    }


    async actionClick(taskResponse: TaskResponse){
       
    }

    getInitUrl(): string {
        return "https://www.xiaohongshu.com/explore";
    }

    afterInit(page: Page): Promise<void> {
        return Promise.resolve();
    }
    
    getTaskResult(taskResponse: TaskResponse, data: { [key: string]: any; }): TaskResult {
        return TaskResult.SUCCESS;
    }

    public async start(headless: boolean): Promise<boolean> {
        headless = false;
        log.info("diggMonitor start headless is ", headless);
        this.headless = headless;
        const engine = await getEngine(this.portId, headless);
        let page = engine.getPage();
        let isCachePage = false;
        this.setLogRequest(false);
        const url = "https://www.xiaohongshu.com/explore/68f3a9f10000000004011955?xsec_token=ABTNZ0hQOJL6S1yyg_GGaOaEsKpOSM1517Y0VhdVZdgbs=&xsec_source=pc_feed";
        if(page){
            if(page.isClosed()){
                log.info("page is closed");
                page = await engine.init(url);
            }else{
                const url = await page.url();
                log.info("page is not close url is ", url);
                if(url.includes(url)){
                    isCachePage = true;
                }else{
                    await page.goto(url);
                    log.info("page goto end");
                }
            }
        }else{
            page = await engine.init(url);
        }
        if (!page) {
            return false;
        }
        this.page = page;
        // const isLogin = await this.checkAndInit(engine, page);
        // if(!isLogin){
        //     return false;
        // }
        if(isCachePage){
            log.info("isCachePage is true");
            return true;
        }
        this.actionMonitor(page);
        // await this.stopVideo(page);
        // await sleep(5000);
        this.startFlag = true;
        return true;
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

    async collectIntercept(route: Route, request: Request) {
        if (!this.taskResponse) {
            return;
        }
        const originalUrl = await request.url();
        const headers = await request.headers();
        try {
            const body = await request.postData();
            const params = new URLSearchParams(body || "");
            // 将其转换为对象
            const bodyJson = Object.fromEntries(params.entries());
            bodyJson['aweme_id'] = this.taskResponse.videoId;
            bodyJson['aweme_type'] = "0";
            bodyJson['action'] = "0";
            const bodyString = new URLSearchParams(bodyJson).toString();
            const axiosResponse: any = await axios.post(originalUrl, bodyString, { headers: headers });
            const axiosResponseData = await axiosResponse.data;
            const axiosResponseDataString = JSON.stringify(axiosResponseData);
            const axiosResponseHeaders = await axiosResponse.headers;
            await route.fulfill({
                status: 200,
                headers: axiosResponseHeaders as any,
                contentType: 'application/json',
                body: axiosResponseDataString,
            });
            log.info("collectIntercept end ", axiosResponse.data, "taskResponse is ", this.taskResponse);
            if(this.doCallback){
                await this.doCallback(this.taskResponse, axiosResponse.data);
            }
        } catch (e) {
            await route.abort();
            log.info("collectIntercept error", e);
        }
    }

    async doRequest(url: string, body: any, headers: any, taskType : string) {
        let axiosResponse: any = await axios.post(url, body, { headers: headers });
        let axiosResponseData = await axiosResponse.data;
        // if(taskType == TaskType.COLLECT){
        //     if(axiosResponseData.status_code == 0 && axiosResponseData.collects_flag == undefined){
        //         await sleep(3000 + Math.random() * 2000);
        //         const params = new URLSearchParams(body || "");
        //         const bodyJson = Object.fromEntries(params.entries());
        //         bodyJson['action'] = "0";
        //         const bodyString = new URLSearchParams(bodyJson).toString();
        //         axiosResponse = await axios.post(url, bodyString, { headers: headers });
        //         axiosResponseData = await axiosResponse.data;
        //         axiosResponseData['collects_flag'] = true;
        //         await sleep(3000 + Math.random() * 2000);
        //     }
        // }
        const axiosResponseHeaders = await axiosResponse.headers;
        return {
            responseHeaders: axiosResponseHeaders as any,
            responseBody: axiosResponseData
        };
    }

    async doIntercept(route: Route, request: Request) {
        // 获取请求对象
        const requestUrl = request.url();
        if(requestUrl.includes("vendor-dynamic") && requestUrl.endsWith(".js")){
            log.info("doInit start requestUrl is ", requestUrl);
            await this.doInit(route, request);
            return true;
        }
        return false;
    }

}


