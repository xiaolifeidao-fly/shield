import { EngineInstance } from "@src/engine/engine.instance";
import { Page } from "playwright";
import log from "electron-log"

const engineInstances: Map<string, EngineInstance> = new Map();

const pageInstances: Map<string, Page> = new Map();


export async function getEngineInstance(resourceId: string): Promise<EngineInstance> {
    if (engineInstances.has(resourceId)) {
        return engineInstances.get(resourceId)!;
    }
    const engine = new EngineInstance(resourceId);
    log.info("getEngineInstance headless is false");
    engineInstances.set(resourceId, engine);
    return engine;
}

export async function releaseEngineInstance(resourceId: string): Promise<void> {
    if (engineInstances.has(resourceId)) {
        const engine = engineInstances.get(resourceId)!;
        await engine.release(); 
        engineInstances.delete(resourceId);
        if(pageInstances.has(resourceId)) {
            const page = pageInstances.get(resourceId)!;
            await page.close();
            pageInstances.delete(resourceId);
        }
    }
}


export async function getPage(resourceId: string, url: string): Promise<Page | undefined> {
    let page = pageInstances.get(resourceId);
    if (page) {
        if(page.isClosed()) {
            const engine = await getEngineInstance(resourceId);
            page = await engine.init(url);
            if(page) {
                pageInstances.set(resourceId, page);
            }
            return page;
        }
        await page.goto(url);
        return page;
    }
    const engine = await getEngineInstance(resourceId);
    page = await engine.init(url);
    if(page) {  
        pageInstances.set(resourceId, page);
    }
    return page;
}

