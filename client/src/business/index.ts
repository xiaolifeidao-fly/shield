/**
 * 业务模块统一导出和初始化
 */
import { registerAdapundiBusiness } from './adapundi/adapundi.register';
import { registerSingaBusiness } from './singa/singa.register';

/**
 * 初始化所有业务类型
 * 在应用启动时调用此函数注册所有业务
 */
export function initializeBusinesses(): void {
  registerAdapundiBusiness();
  registerSingaBusiness();
}

// 导出业务工厂注册表
export { businessFactoryRegistry } from './common/factory';

// 导出公共类型
export * from './common/entities';
export * from './common/base.api';
export * from './common/base.sync';

