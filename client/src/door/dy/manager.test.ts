// 测试新的 engineMap 映射逻辑
import { getEngine, getAllEnginesInfo, clearAllMappings } from './manager';

async function testEngineMapping() {
    console.log('=== 测试新的 engineMap 映射逻辑 ===');
    
    // 清理所有映射
    clearAllMappings();
    
    // 测试场景1：相同 port + groupCode 应该返回同一个 engine
    console.log('\n1. 测试相同 port + groupCode 映射:');
    const engine1 = await getEngine('8080', 'group1', true);
    const engine2 = await getEngine('8080', 'group1', true);
    console.log('engine1 === engine2:', engine1 === engine2); // 应该为 true
    
    // 测试场景2：不同 groupCode 但相同 port，应该复用同一个 engine
    console.log('\n2. 测试不同 groupCode 复用 engine:');
    const engine3 = await getEngine('8080', 'group2', true);
    console.log('engine1 === engine3:', engine1 === engine3); // 应该为 true
    
    // 测试场景3：不同 port，应该创建新的 engine
    console.log('\n3. 测试不同 port 创建新 engine:');
    const engine4 = await getEngine('8081', 'group1', true);
    console.log('engine1 === engine4:', engine1 === engine4); // 应该为 false
    
    // 测试场景4：查看所有 engine 信息
    console.log('\n4. 所有 engine 信息:');
    const allEngines = getAllEnginesInfo();
    allEngines.forEach((info, index) => {
        console.log(`Engine ${index + 1}:`, {
            uuid: info.uuid,
            groupCodes: info.groupCodes
        });
    });
    
    // 预期结果：
    // - 应该有2个 engine
    // - 第一个 engine 对应 group1 和 group2
    // - 第二个 engine 对应 group1
}

// 导出测试函数
export { testEngineMapping };
