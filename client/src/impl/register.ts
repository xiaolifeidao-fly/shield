import { ElectronApi } from "@eleapi/base";
import { UserImpl } from "@src/impl/user/user.impl";
import { SystemImpl } from "@src/impl/config/system.impl";

const register : { new(...args: any[]): ElectronApi }[] = [
]

export function registerApiImpl() {
    register.push(UserImpl);
    register.push(SystemImpl);
    return register;
}


