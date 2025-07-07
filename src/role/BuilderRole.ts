import {CanGetSource, CanPutSource, CanWork} from "../types";
import {EnergyRole} from "./EnergyRole";
import {closestSourceAndCanWithdrawNoSpawn} from "./findUtils";

export class BuilderRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return this.creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestSourceAndCanWithdrawNoSpawn(this.creep.pos);
    }
}