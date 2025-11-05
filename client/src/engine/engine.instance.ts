import { DoorEngine } from "./engine";


export class EngineInstance extends DoorEngine{

    getNamespace(): string {
        return "instance";
    }
}