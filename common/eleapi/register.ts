import { ElectronApi } from "@eleapi/base";
import { UserApi } from "@eleapi/user/user.api";
import { SystemApi } from "./config/system.api";

const register : { new(...args: any[]): ElectronApi }[] = []

export function registerApi(){
    register.push(UserApi);
    register.push(SystemApi);
    return register;
}