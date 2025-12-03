import { ElectronApi, InvokeType, Protocols } from "./electron.base";
import type { BusinessType } from "../model/user.types";
import type { SyncTimeConfig } from "../model/system.types";

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

