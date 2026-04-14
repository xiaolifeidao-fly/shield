import { EngineInstance } from "@src/engine/engine.instance";
import { Page } from "playwright";
import log from "electron-log"

const engineInstances: Map<string, EngineInstance> = new Map();
const pageInstances: Map<string, Page> = new Map();

// Promise cache to prevent race conditions
const enginePromises: Map<string, Promise<EngineInstance>> = new Map();
const pagePromises: Map<string, Promise<Page | undefined>> = new Map();


export async function getEngineInstance(resourceId: string): Promise<EngineInstance> {
    if (engineInstances.has(resourceId)) {
        return engineInstances.get(resourceId)!;
    }

    // If already creating, wait for that promise
    if (enginePromises.has(resourceId)) {
        return enginePromises.get(resourceId)!;
    }

    const promise = (async () => {
        const engine = new EngineInstance(resourceId);
        log.info("getEngineInstance headless is", engine.headless);
        engineInstances.set(resourceId, engine);
        return engine;
    })();

    enginePromises.set(resourceId, promise);
    return promise;
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
    // Clean up promises
    enginePromises.delete(resourceId);
    pagePromises.delete(resourceId);
}


export async function getPage(resourceId: string, url: string): Promise<Page | undefined> {
    // If already creating, wait for that promise
    if (pagePromises.has(resourceId)) {
        const page = await pagePromises.get(resourceId)!;
        if (page && !page.isClosed()) {
            await page.goto(url);
            return page;
        }
    }

    let page = pageInstances.get(resourceId);
    if (page) {
        if(page.isClosed()) {
            const engine = await getEngineInstance(resourceId);
            const promise = engine.init(url);
            pagePromises.set(resourceId, promise);
            page = await promise;
            if(page) {
                pageInstances.set(resourceId, page);
            }
            pagePromises.delete(resourceId);
            return page;
        }
        await page.goto(url);
        return page;
    }

    const engine = await getEngineInstance(resourceId);
    const promise = engine.init(url);
    pagePromises.set(resourceId, promise);
    page = await promise;
    if(page) {
        pageInstances.set(resourceId, page);
    }
    pagePromises.delete(resourceId);
    return page;
}

