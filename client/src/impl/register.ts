import { ElectronApi } from "@eleapi/base";
import { StoreApiImpl } from "@src/impl/store/store";
import { BasicConfigApiImpl } from "@src/impl/door/basic.config.api.impl";
import { PlatformConfigApiImpl } from "@src/impl/door/platform.api.impl";
import { LogApiImpl } from "@src/impl/door/log.api.impl";
import { InstanceApiImpl } from "@src/impl/door/instance.api.impl";
import { InstallerImpl } from "./installer/installer.impl";
import { StatsApiImpl } from './door/stats.api.impl';
import { ProxyConfigApiImpl } from './door/proxy.api.impl';
import { ProcessDetectorApiImpl } from './door/process.detector.api.impl';
import { GuardConfigApiImpl } from "./door/guard.config.api.impl";

const register : { new(...args: any[]): ElectronApi }[] = [
]

export function registerApiImpl() {
    register.push(StoreApiImpl);
    register.push(BasicConfigApiImpl);
    register.push(PlatformConfigApiImpl);
    register.push(LogApiImpl);
    register.push(InstanceApiImpl);
    register.push(InstallerImpl);
    register.push(StatsApiImpl);
    register.push(ProxyConfigApiImpl);
    register.push(ProcessDetectorApiImpl);
    register.push(GuardConfigApiImpl);
    return register;
}


