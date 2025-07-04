import {CanGetSource, CanPutSource, CanWork} from "../types";
import {closestSourceAndCanWithdrawNoSpawn} from "./findUtils";
import {EnergyRole} from "./EnergyRole";

export class UpgradeRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return this.creep.room.controller ?? null;
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestSourceAndCanWithdrawNoSpawn(this.creep.pos);
    }
}