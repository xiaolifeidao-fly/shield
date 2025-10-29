import { ElectronApi } from "@eleapi/base";
import { StoreApi } from "@eleapi/store/store";
import { InstallerApi } from "./installer.api";
import { BasicConfigApi } from "./door/basic.config.api";
import { PlatformConfigApi } from "./door/platform.config.api";
import { LogApi } from "./door/log.api";
import { InstanceApi } from "./door/instance.api";
import { StatsApi } from "./door/stats.api";
import { ProxyConfigApi } from "./door/proxy.config.api";
import { ProcessDetectorApi } from "./door/process.detector.api";
import { GuardConfigApi } from "./door/guard.config.api";

const register : { new(...args: any[]): ElectronApi }[] = []

export function registerApi(){
    register.push(StoreApi);
    register.push(InstallerApi);
    register.push(BasicConfigApi);
    register.push(PlatformConfigApi);
    register.push(LogApi);
    register.push(InstanceApi);
    register.push(StatsApi);
    register.push(ProxyConfigApi);
    register.push(ProcessDetectorApi as any); // Cast to any to avoid abstract class error
    register.push(GuardConfigApi);
    return register;
}