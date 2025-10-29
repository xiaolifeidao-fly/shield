/**
 * 生成随机浏览器版本号
 * 区间: 130.0.0.0 到 139.0.0.0
 * 只随机第一个数字
 */
export function randomBrowserVersion(): string {
    // 生成 130-139 之间的随机数
    const majorVersion = Math.floor(Math.random() * 10) + 130;
    
    // 返回格式化的版本号
    return `${majorVersion}.0.0.0`;
}

/**
 * 生成指定范围的随机版本号
 * @param min 最小版本号 (默认 130)
 * @param max 最大版本号 (默认 139)
 */
export function randomBrowserVersionInRange(min: number = 130, max: number = 140): string {
    // 确保参数有效
    if (min > max) {
        throw new Error('最小值不能大于最大值');
    }
    
    // 生成指定范围内的随机数
    const majorVersion = Math.floor(Math.random() * (max - min + 1)) + min;
    
    // 返回格式化的版本号
    return `${majorVersion}.0.0.0`;
}



/**
 * 生成多个随机版本号
 * @param count 生成数量
 * @param min 最小版本号 (默认 130)
 * @param max 最大版本号 (默认 139)
 */
export function generateMultipleBrowserVersions(count: number, min: number = 130, max: number = 139): string[] {
    const versions: string[] = [];
    
    for (let i = 0; i < count; i++) {
        versions.push(randomBrowserVersionInRange(min, max));
    }
    
    return versions;
}

/**
 * 随机生成CPU核数
 * 返回数字 4-20
 */
export function cpu_core_num(): number {
    // 生成 4-20 之间的随机数
    return Math.floor(Math.random() * 17) + 4;
}

/**
 * 生成指定范围的随机CPU核数
 * @param min 最小核数 (默认 4)
 * @param max 最大核数 (默认 20)
 */
export function randomCpuCoreNumInRange(min: number = 4, max: number = 20): number {
    // 确保参数有效
    if (min > max) {
        throw new Error('最小值不能大于最大值');
    }
    
    // 生成指定范围内的随机数
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成多个随机CPU核数
 * @param count 生成数量
 * @param min 最小核数 (默认 4)
 * @param max 最大核数 (默认 20)
 */
export function generateMultipleCpuCoreNums(count: number, min: number = 4, max: number = 20): number[] {
    const coreNums: number[] = [];
    
    for (let i = 0; i < count; i++) {
        coreNums.push(randomCpuCoreNumInRange(min, max));
    }
    
    return coreNums;
}

/**
 * 随机生成屏幕宽度
 * 返回数字 700-2000
 */
export function screen_width(): number {
    // 生成 700-2000 之间的随机数
    return Math.floor(Math.random() * 1301) + 700;
}

/**
 * 随机生成屏幕高度
 * 返回数字 500-2000
 */
export function screen_height(): number {
    // 生成 500-2000 之间的随机数
    return Math.floor(Math.random() * 1501) + 500;
}

/**
 * 生成指定范围的随机屏幕宽度
 * @param min 最小宽度 (默认 700)
 * @param max 最大宽度 (默认 2000)
 */
export function randomScreenWidthInRange(min: number = 700, max: number = 2000): number {
    // 确保参数有效
    if (min > max) {
        throw new Error('最小值不能大于最大值');
    }
    
    // 生成指定范围内的随机数
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成指定范围的随机屏幕高度
 * @param min 最小高度 (默认 500)
 * @param max 最大高度 (默认 2000)
 */
export function randomScreenHeightInRange(min: number = 500, max: number = 2000): number {
    // 确保参数有效
    if (min > max) {
        throw new Error('最小值不能大于最大值');
    }
    
    // 生成指定范围内的随机数
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机屏幕尺寸对象
 * @returns {width: number, height: number}
 */
export function randomScreenSize(): { width: number; height: number } {
    return {
        width: screen_width(),
        height: screen_height()
    };
}

/**
 * 生成多个随机屏幕尺寸
 * @param count 生成数量
 */
export function generateMultipleScreenSizes(count: number): Array<{ width: number; height: number }> {
    const sizes: Array<{ width: number; height: number }> = [];
    
    for (let i = 0; i < count; i++) {
        sizes.push(randomScreenSize());
    }
    
    return sizes;
}

/**
 * 随机生成设备内存
 * 返回数字 4-16 (单位: GB)
 */
export function device_memory(): number {
    // 生成 4-16 之间的随机数
    return Math.floor(Math.random() * 13) + 4;
}

/**
 * 生成指定范围的随机设备内存
 * @param min 最小内存 (默认 4)
 * @param max 最大内存 (默认 16)
 */
export function randomDeviceMemoryInRange(min: number = 4, max: number = 16): number {
    // 确保参数有效
    if (min > max) {
        throw new Error('最小值不能大于最大值');
    }
    
    // 生成指定范围内的随机数
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成多个随机设备内存
 * @param count 生成数量
 * @param min 最小内存 (默认 4)
 * @param max 最大内存 (默认 16)
 */
export function generateMultipleDeviceMemories(count: number, min: number = 4, max: number = 16): number[] {
    const memories: number[] = [];
    
    for (let i = 0; i < count; i++) {
        memories.push(randomDeviceMemoryInRange(min, max));
    }
    
    return memories;
}

/**
 * 随机生成版本信息
 * 区间: 16.5.0 到 17.4.0
 * 返回包含 update_version_code, version_code, version_name 的对象
 */
export function randomVersionInfo(): { update_version_code: number; version_code: number; version_name: string } {
    // 随机选择主版本号 (16 或 17)
    const majorVersion = Math.random() < 0.5 ? 16 : 17;
    
    let minorVersion: number;
    let patchVersion: number;
    
    if (majorVersion === 16) {
        // 16.x.x: 次版本号 5-9
        minorVersion = Math.floor(Math.random() * 5) + 5;
        patchVersion = Math.floor(Math.random() * 10);
    } else {
        // 17.x.x: 次版本号 0-4
        minorVersion = Math.floor(Math.random() * 5);
        patchVersion = Math.floor(Math.random() * 10);
    }
    
    // 计算版本代码: 主版本号 * 10000 + 次版本号 * 100 + 补丁版本号
    const versionCode = majorVersion * 10000 + minorVersion * 100 + patchVersion;
    
    return {
        update_version_code: versionCode,
        version_code: versionCode,
        version_name: `${majorVersion}.${minorVersion}.${patchVersion}`
    };
}

/**
 * 生成指定范围的随机版本信息
 * @param minMajor 最小主版本号 (默认 16)
 * @param maxMajor 最大主版本号 (默认 17)
 * @param minMinor 最小次版本号 (默认 0)
 * @param maxMinor 最大次版本号 (默认 9)
 * @param minPatch 最小补丁版本号 (默认 0)
 * @param maxPatch 最大补丁版本号 (默认 9)
 */
export function randomVersionInfoInRange(
    minMajor: number = 16, 
    maxMajor: number = 17,
    minMinor: number = 0,
    maxMinor: number = 9,
    minPatch: number = 0,
    maxPatch: number = 9
): { update_version_code: number; version_code: number; version_name: string } {
    // 确保参数有效
    if (minMajor > maxMajor || minMinor > maxMinor || minPatch > maxPatch) {
        throw new Error('最小值不能大于最大值');
    }
    
    const majorVersion = Math.floor(Math.random() * (maxMajor - minMajor + 1)) + minMajor;
    const minorVersion = Math.floor(Math.random() * (maxMinor - minMinor + 1)) + minMinor;
    const patchVersion = Math.floor(Math.random() * (maxPatch - minPatch + 1)) + minPatch;
    
    const versionCode = majorVersion * 10000 + minorVersion * 100 + patchVersion;
    
    return {
        update_version_code: versionCode,
        version_code: versionCode,
        version_name: `${majorVersion}.${minorVersion}.${patchVersion}`
    };
}

/**
 * 生成多个随机版本信息
 * @param count 生成数量
 */
export function generateMultipleVersionInfos(count: number): Array<{ update_version_code: number; version_code: number; version_name: string }> {
    const versions: Array<{ update_version_code: number; version_code: number; version_name: string }> = [];
    
    for (let i = 0; i < count; i++) {
        versions.push(randomVersionInfo());
    }
    
    return versions;
}

/**
 * 随机生成操作系统版本
 * 返回数字 8-11
 */
export function os_version(): number {
    // 生成 8-11 之间的随机数
    return Math.floor(Math.random() * 4) + 8;
}

/**
 * 生成指定范围的随机操作系统版本
 * @param min 最小版本 (默认 8)
 * @param max 最大版本 (默认 11)
 */
export function randomOsVersionInRange(min: number = 8, max: number = 11): number {
    // 确保参数有效
    if (min > max) {
        throw new Error('最小值不能大于最大值');
    }
    
    // 生成指定范围内的随机数
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成多个随机操作系统版本
 * @param count 生成数量
 * @param min 最小版本 (默认 8)
 * @param max 最大版本 (默认 11)
 */
export function generateMultipleOsVersions(count: number, min: number = 8, max: number = 11): number[] {
    const versions: number[] = [];
    
    for (let i = 0; i < count; i++) {
        versions.push(randomOsVersionInRange(min, max));
    }
    
    return versions;
}




/**
 * 检测当前操作系统类型
 * @returns 'mac' | 'windows'
 */
export function detectOS(): 'mac' | 'windows' {
    const platform = process.platform;
    if (platform === 'darwin') {
        return 'mac';
    }
    return 'windows';
}

/**
 * 获取操作系统名称
 * @returns 'Mac' | 'Windows'
 */
export function getOsName(): 'Mac' | 'Windows' {
    return detectOS() === 'mac' ? 'Mac' : 'Windows';
}

/**
 * 获取浏览器平台标识
 * @returns 'mac' | 'win32'
 */
export function getBrowserPlatform(): 'mac' | 'win32' {
    return detectOS() === 'mac' ? 'mac' : 'win32';
}

/**
 * 生成 sec-ch-ua 参数（支持 Mac 和 Windows）
 * Mac 格式: "Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"
 * Windows 格式: "Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"
 */
export function generateSecChUa(): string {
    const chromeVersion = randomBrowserVersion();
    // 提取主版本号（去掉 .0.0.0）
    const majorVersion = chromeVersion.split('.')[0];
    
    // sec-ch-ua 格式在 Mac 和 Windows 上是相同的
    return `"Chromium";v="${majorVersion}", "Not=A?Brand";v="24", "Google Chrome";v="${majorVersion}"`;
}

/**
 * 生成 User-Agent 字符串（支持 Mac 和 Windows）
 * Mac 格式: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
 * Windows 格式: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
 */
export function generateUserAgent(): string {
    const chromeVersion = randomBrowserVersion();
    const os = detectOS();
    
    if (os === 'mac') {
        // Mac 格式：随机生成 macOS 版本 10.15.7 到 14.0.0
        const macMajor = Math.floor(Math.random() * 4) + 10; // 10-13
        const macMinor = macMajor === 10 ? Math.floor(Math.random() * 6) + 15 : Math.floor(Math.random() * 10); // 10.15-10.20 或 11.0-13.9
        const macPatch = macMajor === 10 && macMinor === 15 ? 7 : Math.floor(Math.random() * 10);
        
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macMajor}_${macMinor}_${macPatch}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    } else {
        // Windows 格式
        const osVersion = os_version();
        return `Mozilla/5.0 (Windows NT ${osVersion}.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    }
}

/**
 * 生成指定范围的 sec-ch-ua 参数（支持 Mac 和 Windows）
 * @param min 最小版本号 (默认 130)
 * @param max 最大版本号 (默认 139)
 */
export function generateSecChUaInRange(min: number = 130, max: number = 139): string {
    const chromeVersion = randomBrowserVersionInRange(min, max);
    // 提取主版本号（去掉 .0.0.0）
    const majorVersion = chromeVersion.split('.')[0];
    
    // sec-ch-ua 格式在 Mac 和 Windows 上是相同的
    return `"Chromium";v="${majorVersion}", "Not=A?Brand";v="24", "Google Chrome";v="${majorVersion}"`;
}

/**
 * 生成指定范围的 User-Agent 字符串（支持 Mac 和 Windows）
 * @param min 最小版本号 (默认 130)
 * @param max 最大版本号 (默认 139)
 * @param minOs 最小操作系统版本 (默认 8) - 仅对 Windows 有效
 * @param maxOs 最大操作系统版本 (默认 11) - 仅对 Windows 有效
 */
export function generateUserAgentInRange(min: number = 130, max: number = 139, minOs: number = 8, maxOs: number = 11): string {
    const chromeVersion = randomBrowserVersionInRange(min, max);
    const os = detectOS();
    
    if (os === 'mac') {
        // Mac 格式：随机生成 macOS 版本 10.15.7 到 14.0.0
        const macMajor = Math.floor(Math.random() * 4) + 10; // 10-13
        const macMinor = macMajor === 10 ? Math.floor(Math.random() * 6) + 15 : Math.floor(Math.random() * 10); // 10.15-10.20 或 11.0-13.9
        const macPatch = macMajor === 10 && macMinor === 15 ? 7 : Math.floor(Math.random() * 10);
        
        return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${macMajor}_${macMinor}_${macPatch}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    } else {
        // Windows 格式
        const osVersion = randomOsVersionInRange(minOs, maxOs);
        return `Mozilla/5.0 (Windows NT ${osVersion}.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    }
}

/**
 * 生成多个随机 sec-ch-ua 参数
 * @param count 生成数量
 * @param min 最小版本号 (默认 130)
 * @param max 最大版本号 (默认 139)
 */
export function generateMultipleSecChUa(count: number, min: number = 130, max: number = 139): string[] {
    const secChUaList: string[] = [];
    
    for (let i = 0; i < count; i++) {
        secChUaList.push(generateSecChUaInRange(min, max));
    }
    
    return secChUaList;
}

/**
 * 生成多个随机 User-Agent 字符串
 * @param count 生成数量
 * @param min 最小版本号 (默认 130)
 * @param max 最大版本号 (默认 139)
 * @param minOs 最小操作系统版本 (默认 8)
 * @param maxOs 最大操作系统版本 (默认 11)
 */
export function generateMultipleUserAgents(count: number, min: number = 130, max: number = 139, minOs: number = 8, maxOs: number = 11): string[] {
    const userAgentList: string[] = [];
    
    for (let i = 0; i < count; i++) {
        userAgentList.push(generateUserAgentInRange(min, max, minOs, maxOs));
    }
    
    return userAgentList;
}

// 使用示例
if (require.main === module) {
    console.log('=== 随机版本号示例 ===');
    console.log('单个版本号:', randomBrowserVersion());
    console.log('指定范围版本号:', randomBrowserVersionInRange(130, 139));
    console.log('多个版本号:', generateMultipleBrowserVersions(5));
    
    console.log('\n=== 随机CPU核数示例 ===');
    console.log('单个CPU核数:', cpu_core_num());
    console.log('指定范围CPU核数:', randomCpuCoreNumInRange(4, 20));
    console.log('多个CPU核数:', generateMultipleCpuCoreNums(5));
    
    console.log('\n=== 随机屏幕尺寸示例 ===');
    console.log('屏幕宽度:', screen_width());
    console.log('屏幕高度:', screen_height());
    console.log('屏幕尺寸对象:', randomScreenSize());
    console.log('指定范围宽度:', randomScreenWidthInRange(700, 2000));
    console.log('指定范围高度:', randomScreenHeightInRange(500, 2000));
    console.log('多个屏幕尺寸:', generateMultipleScreenSizes(3));
    
    console.log('\n=== 随机设备内存示例 ===');
    console.log('设备内存:', device_memory(), 'GB');
    console.log('指定范围内存:', randomDeviceMemoryInRange(4, 16), 'GB');
    console.log('多个设备内存:', generateMultipleDeviceMemories(5), 'GB');
    
    console.log('\n=== 随机版本信息示例 ===');
    console.log('版本信息:', randomVersionInfo());
    console.log('指定范围版本信息:', randomVersionInfoInRange(16, 17, 0, 9, 0, 9));
    console.log('多个版本信息:', generateMultipleVersionInfos(3));
    
    console.log('\n=== 随机操作系统版本示例 ===');
    console.log('操作系统版本:', os_version());
    console.log('指定范围版本:', randomOsVersionInRange(8, 11));
    console.log('多个操作系统版本:', generateMultipleOsVersions(5));
    
    console.log('\n=== 操作系统检测示例 ===');
    console.log('当前操作系统:', detectOS());
    console.log('操作系统名称:', getOsName());
    console.log('浏览器平台:', getBrowserPlatform());
    
    console.log('\n=== sec-ch-ua 参数示例 ===');
    console.log('单个 sec-ch-ua:', generateSecChUa());
    console.log('指定范围 sec-ch-ua:', generateSecChUaInRange(130, 139));
    console.log('多个 sec-ch-ua:', generateMultipleSecChUa(3));
    
    console.log('\n=== User-Agent 字符串示例 ===');
    console.log('单个 User-Agent:', generateUserAgent());
    console.log('指定范围 User-Agent:', generateUserAgentInRange(130, 139, 8, 11));
    console.log('多个 User-Agent:', generateMultipleUserAgents(3));
}
