import { DoorEngine } from "./engine";


export class EngineInstance extends DoorEngine{

    constructor(resourceId: string, headless: boolean = false) {
        super(resourceId, headless);
    }

    getNamespace(): string {
        return "instance_" + this.headless;
    }
}