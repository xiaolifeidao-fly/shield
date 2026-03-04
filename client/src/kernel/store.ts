import { initStore, preloadMySQLStore } from "../../../common/utils/store/electron";
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

export async function init(store: any) {
    // 根据 USE_MYSQL 环境变量决定使用哪种存储
    const useMySQL = process.env.USE_MYSQL === 'true';

    if (useMySQL) {
        console.log('[Store] Using MySQL storage');
        initStore(store, true);
        // 预加载 MySQL 数据到缓存
        await preloadMySQLStore();
    } else {
        console.log('[Store] Using electron-store');
        initStore(store, false);
    }
}
