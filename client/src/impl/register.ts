import { ElectronApi } from "@eleapi/base";

const register : { new(...args: any[]): ElectronApi }[] = [
]

export function registerApiImpl() {
    return register;
}


