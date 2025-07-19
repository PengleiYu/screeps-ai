import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {closestCanSpawn, closestSourceAndCanWithdrawNoSpawn} from "../utils/findUtils";
import {EnergyRole} from "../core/EnergyRole";

export class SpawnSupplierRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestCanSpawn(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestSourceAndCanWithdrawNoSpawn(this.creep.pos);
    }
}