import axios from "axios";
import { BrowserContext, Page, Route } from "playwright";
import { Request } from "playwright";
import { DyEngine } from "../../dy.engine";
import { app } from "electron";
import path from "path";
import { sleep } from "@utils/index";
import log from "electron-log";
import { TaskResponse } from "@model/task.entity";
import { getEngineLegacy as getEngine } from "../../manager";
import { BusinessGroup } from "@model/business.entity";
import { TaskResult } from "./monitor.manager";
import { doActionCallback } from "../../task/run";



export abstract class AbsMonitor {

    protected groupCode: string;
    protected portId: string;
    protected taskResponse: TaskResponse | null = null;
    protected startFlag: boolean = false;
    protected page: Page | null = null;
    protected logRequest: boolean = false;
    public headless: boolean = true;

    constructor(groupCode : string, portId: string, headless: boolean = true) {
        this.groupCode = groupCode;
        this.portId = portId;
        this.headless = headless;
    }

    setLogRequest(logRequest: boolean){
        this.logRequest = logRequest;
    }

    setTaskResponse(taskResponse: TaskResponse){
        this.taskResponse = taskResponse;
    }

    getSessionDir() {
        const userDataPath = app.getPath('userData');
        let key = this.portId;
        if(this.groupCode != BusinessGroup.DY){
            key = this.groupCode + "-" + this.portId;
        }
        const sessionDir = path.join(userDataPath, 'resource', 'dy', key);
        return sessionDir;
    }

    abstract doInit(route: Route, request: Request): Promise<void>;

    async actionMonitor(page: Page) {
        await page.route('**/*', async (route) => {
            // 获取请求对象
            const request = route.request();
            const isIntercept = await this.doIntercept(route, request);
            if(isIntercept){
                return;
            }
            route.continue();
        });
    }

    abstract doIntercept(route: Route, request: Request): Promise<boolean>;


    async actionClick(taskResponse: TaskResponse){
       
    }

    abstract getInitUrl(): string;

    async initPage(context: BrowserContext): Promise<boolean> {
        if(!this.page){
            this.page = await context.newPage();
        }
        let page = this.page;
        if(page.isClosed()){
            log.info("page is closed");
            page = await context.newPage();
        }else{
            const url = page.url();
            log.info("page is not close url is ", url);
            if(url.includes(url)){
                return false;
            }
            await page.goto(this.getInitUrl());
        }
        this.page = page;
        log.info("page goto end");
        if (!page) {
            return false;
        }
        return true;
    }

    public async start(headless: boolean): Promise<boolean> {
        headless = false;
        log.info("diggMonitor start headless is ", headless);
        this.headless = headless;
        const engine = await getEngine(this.portId, headless);
        const context = await engine.initContext();
        if(!context){
            return false;
        }
        this.setLogRequest(false);
        const initFlag = await this.initPage(context);
        if (!initFlag) {
            return false;
        }
        if(!this.page){
            return false;
        }
        const isLogin = await this.checkAndInit(engine, this.page);
        if(!isLogin){
            return false;
        }
        this.actionMonitor(this.page);
        await this.afterInit(this.page);
        this.startFlag = true;
        return true;
    }

    abstract checkAndInit(engine: DyEngine<{}>, page: Page): Promise<boolean>;

    abstract afterInit(page: Page): Promise<void>;


    async stop(): Promise<void> {
        this.startFlag = false;
    }


    async doCallback(taskResponse: TaskResponse, data: { [key: string]: any }){
        const taskResult = this.getTaskResult(taskResponse, data);
        await doActionCallback(this.groupCode, taskResponse, data, taskResult);
    }

    abstract getTaskResult(taskResponse: TaskResponse, data: { [key: string]: any }): TaskResult;

}





