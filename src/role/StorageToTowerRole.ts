import {CanWork, CanPutSource, CanGetSource} from "../types";
import {EnergyRole} from "./EnergyRole";
import {closestEnergyNotEmptyStorage, closestNotFullTower, closestRuinRemnantTomb} from "./findUtils";

export class StorageToTowerRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestNotFullTower(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyNotEmptyStorage(this.creep.pos);
    }
}