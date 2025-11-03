import { ElectronApi, InvokeType, Protocols } from "../base";

import type { BusinessType } from "@eleapi/user/user.api";

export interface SyncTimeConfig {
    type: 'daily' | 'monthly';  // Daily or monthly
    hour: number;                // Hour (0-23)
    minute: number;              // Minute (0-59)
    day?: number;                // Day of month (1-31, only used when type is monthly)
    businessType?: BusinessType; // Business type (adapundi or singa)
}

export class SystemApi extends ElectronApi {    

    getApiName(): string {
        return "system";
    }

    @InvokeType(Protocols.INVOKE)
    async getSyncTimeConfig(): Promise<SyncTimeConfig> {
        return this.invokeApi("getSyncTimeConfig");
    }

    @InvokeType(Protocols.INVOKE)
    async saveSyncTimeConfig(config: SyncTimeConfig): Promise<void> {
        return this.invokeApi("saveSyncTimeConfig", config);
    }

    @InvokeType(Protocols.INVOKE)
    async getSyncTimeConfigByBusiness(businessType: BusinessType): Promise<SyncTimeConfig> {
        return this.invokeApi("getSyncTimeConfigByBusiness", businessType);
    }

    @InvokeType(Protocols.INVOKE)
    async saveSyncTimeConfigByBusiness(businessType: BusinessType, config: SyncTimeConfig): Promise<void> {
        return this.invokeApi("saveSyncTimeConfigByBusiness", businessType, config);
    }

}