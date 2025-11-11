import { EngineInstance } from "@src/engine/engine.instance";
import { Page } from "playwright";


const engineInstances: Map<string, EngineInstance> = new Map();

const pageInstances: Map<string, Page> = new Map();


export async function getEngineInstance(resourceId: string): Promise<EngineInstance> {
    if (engineInstances.has(resourceId)) {
        return engineInstances.get(resourceId)!;
    }
    const engine = new EngineInstance(resourceId, false);
    engineInstances.set(resourceId, engine);
    return engine;
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

