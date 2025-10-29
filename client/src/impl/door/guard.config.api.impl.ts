import { InvokeType, Protocols } from "@eleapi/base";
import { getCollectConditions, getFollowConditions, getLoveConditions, getPlayConditions, GuardConfig, GuardConfigApi } from "@eleapi/door/guard.config.api";
import { BusinessType } from "@model/business.entity";
import { getGlobal, setGlobal } from "@utils/store/electron";
import log from 'electron-log';


export class GuardConfigApiImpl extends GuardConfigApi {

    getKey() : string {
        return "guardConfig001";
    }

    @InvokeType(Protocols.INVOKE)
    async getGuardConfig(businessType : string) : Promise<GuardConfig | null> {
        let key = this.getKey();
        if(businessType == BusinessType.DIGG){
            const result = getGlobal(key);
            if(result){
                return result;
            }
            return {
                enabled: true,
                conditions: getLoveConditions()
            }
        }
        key = businessType + "_" + key;
        const result = getGlobal(key);
        if(result){
            return result;
        }
        if(businessType == BusinessType.COLLECT){
            return {
                enabled: true,
                conditions: getCollectConditions()
            }
        }
        if(businessType == BusinessType.FOLLOW){
            return {
                enabled: true,
                conditions: getFollowConditions()
            }
        }
        if(businessType == BusinessType.MI_PLAY || businessType == BusinessType.MI_PLAY_NO_CK){
            return {
                enabled: true,
                conditions: getPlayConditions()
            }
        }
        return {
            enabled: true,
            conditions: getLoveConditions()
        }
    }

    @InvokeType(Protocols.INVOKE)
    async setGuardConfig(config: GuardConfig, businessType : string) {
        log.info('[GuardConfigApiImpl] 设置守护配置', config, businessType);
        let key = this.getKey();
        if(businessType == BusinessType.DIGG){
            setGlobal(key, config);
            return;
        }
        key = businessType + "_" + key;
        setGlobal(key, config);
    }

}