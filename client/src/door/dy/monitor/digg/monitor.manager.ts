import { BusinessGroup } from "@model/business.entity";
import { AbsMonitor } from "./abs.monitor";
import { DiggMonitor } from "./monitor";
import { XhsMonitor } from "./xhs.monitor";

//任务结果 枚举 
export enum TaskResult {
    SUCCESS = "success",
    SLEEP = "sleep",
    LOCK = "lock",
    FAIL = "fail",
    LOGIN_EXPIRED = "login_expired",
}

const absMonitorManager = new Map<string, AbsMonitor>();

export function getAbsMonitor(groupCode : string, port: string, headless: boolean = true): AbsMonitor | null {
    const key = `${groupCode}-${port}`;
    if (!absMonitorManager.has(key)) { 
        const monitor = getMonitor(groupCode, port, headless);
        if(monitor){
            absMonitorManager.set(key, monitor);
        }
        return monitor;
    }
    return absMonitorManager.get(key)!;
}


function getMonitor(groupCode : string, port: string, headless: boolean = true): AbsMonitor | null {
    if(groupCode == BusinessGroup.DY){
        return new DiggMonitor(groupCode, port, headless);
    }
    if(groupCode == BusinessGroup.XHS){
        return new XhsMonitor(groupCode, port, headless);
    }
    return null;
}
