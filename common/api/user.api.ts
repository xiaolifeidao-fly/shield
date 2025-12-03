import { ElectronApi, InvokeType, Protocols } from "./electron.base";
import type { UserInfo } from "../model/user.types";

export class UserApi extends ElectronApi {

  getApiName(): string {
    return "user";
  }

  @InvokeType(Protocols.INVOKE)
  async getUserInfo(username: string): Promise<UserInfo> {
    return this.invokeApi("getUserInfo", username);
  }

  @InvokeType(Protocols.INVOKE)
  async getUserInfoList(): Promise<UserInfo[]> {
    return this.invokeApi("getUserInfoList");
  }

  @InvokeType(Protocols.INVOKE)
  async addUser(userInfo: UserInfo): Promise<void> {
    return this.invokeApi("addUser", userInfo);
  }

  @InvokeType(Protocols.INVOKE)
  async updateUser(userInfo: UserInfo): Promise<void> {
    return this.invokeApi("updateUser", userInfo);
  }

  @InvokeType(Protocols.INVOKE)
  async deleteUser(username: string): Promise<void> {
    return this.invokeApi("deleteUser", username);
  }

  @InvokeType(Protocols.INVOKE)
  async runUser(username: string, enableDeduplication: boolean = true, enableResume: boolean = false): Promise<void> {
    return this.invokeApi("runUser", username, enableDeduplication, enableResume);
  }

  @InvokeType(Protocols.INVOKE)
  async stopUser(username: string): Promise<void> {
    return this.invokeApi("stopUser", username);
  }

}

