import { DyEngine } from "./dy.engine";
import { generateRandomString } from "./store/port.store";

// UUID -> Engine 映射
const engineMap : Map<string, DyEngine<{}>> = new Map();

// port + groupCode -> UUID 映射
const portGroupToUuidMap : Map<string, string> = new Map();

// UUID -> groupCode 集合映射（一个 engine 可以对应多个 groupCode）
const uuidToGroupCodesMap : Map<string, Set<string>> = new Map();

function buildPortGroupKey(port : string, groupCode : string) : string {
    return `${port}_${groupCode}`;
}

function buildHeadlessKey(port : string, headless : boolean) : string {
    return "dy_user_headless_" + port + "_" + headless;
}

// 生成 UUID
function generateUuid() : string {
    return generateRandomString(32);
}

// 查找指定 groupCode 是否有可用的 engine
function findAvailableEngineForGroup(groupCode : string) : string | null {
    for (const [uuid, groupCodes] of uuidToGroupCodesMap) {
        if (!groupCodes.has(groupCode)) {
            return uuid;
        }
    }
    return null;
}

export async function getEngine(port : string, groupCode : string, headless : boolean = true) : Promise<DyEngine<{}>> {
    const portGroupKey = buildPortGroupKey(port, groupCode);
    
    // 1. 先查直接映射
    let uuid = portGroupToUuidMap.get(portGroupKey);
    
    if (uuid && engineMap.has(uuid)) {
        return engineMap.get(uuid)!;
    }
    
    // 2. 如果直接映射不存在，查找是否有针对这个 groupCode 待映射的 engine
    if (!uuid) {
        const availableUuid = findAvailableEngineForGroup(groupCode);
        
        if (availableUuid && engineMap.has(availableUuid)) {
            uuid = availableUuid;
            // 找到可用的 engine，建立映射
            portGroupToUuidMap.set(portGroupKey, uuid);
            
            // 更新 groupCode 映射
            if (!uuidToGroupCodesMap.has(uuid)) {
                uuidToGroupCodesMap.set(uuid, new Set());
            }
            uuidToGroupCodesMap.get(uuid)!.add(groupCode);
            
            return engineMap.get(uuid)!;
        }
    }
    
    // 3. 如果都找不到，创建新的 UUID 和 engine
    uuid = generateUuid();
    const engine = new DyEngine<{}>(port, headless);
    
    // 建立映射关系
    engineMap.set(uuid, engine);
    portGroupToUuidMap.set(portGroupKey, uuid);
    
    // 初始化 groupCode 映射
    uuidToGroupCodesMap.set(uuid, new Set([groupCode]));
    
    return engine;
}

export function hasEngine(port : string, groupCode : string, headless : boolean = true) : boolean {
    const portGroupKey = buildPortGroupKey(port, groupCode);
    const uuid = portGroupToUuidMap.get(portGroupKey);
    return uuid ? engineMap.has(uuid) : false;
}

export function removeEngine(port : string, groupCode : string) {
    const portGroupKey = buildPortGroupKey(port, groupCode);
    const uuid = portGroupToUuidMap.get(portGroupKey);
    
    if (uuid) {
        // 从 groupCode 映射中移除
        const groupCodes = uuidToGroupCodesMap.get(uuid);
        if (groupCodes) {
            groupCodes.delete(groupCode);
            
            // 如果该 engine 没有其他 groupCode 映射，则删除 engine
            if (groupCodes.size === 0) {
                engineMap.delete(uuid);
                uuidToGroupCodesMap.delete(uuid);
            }
        }
        
        // 删除 port + groupCode 映射
        portGroupToUuidMap.delete(portGroupKey);
    }
}

export function setEngine(port : string, groupCode : string, engine : DyEngine<{}>) {
    const portGroupKey = buildPortGroupKey(port, groupCode);
    const uuid = generateUuid();
    
    engineMap.set(uuid, engine);
    portGroupToUuidMap.set(portGroupKey, uuid);
    
    // 初始化 groupCode 映射
    uuidToGroupCodesMap.set(uuid, new Set([groupCode]));
}

// 获取所有 engine 信息（用于调试）
export function getAllEnginesInfo() {
    const result = [];
    for (const [uuid, engine] of engineMap) {
        const groupCodes = uuidToGroupCodesMap.get(uuid) || new Set();
        result.push({
            uuid,
            groupCodes: Array.from(groupCodes),
            engine
        });
    }
    return result;
}

// 兼容旧版本的函数（使用默认 groupCode）
export async function getEngineLegacy(port : string, headless : boolean = true) : Promise<DyEngine<{}>> {
    // 使用默认的 groupCode
    const defaultGroupCode = "default";
    return getEngine(port, defaultGroupCode, headless);
}

// 为了向后兼容，保留原来的函数名但指向新函数
export const getEngineOld = getEngineLegacy;