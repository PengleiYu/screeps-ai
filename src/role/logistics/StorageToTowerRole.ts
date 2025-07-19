import {CanWork, CanPutSource, CanGetSource} from "../../types";
import {EnergyRole} from "../core/EnergyRole";
import {closestEnergyNotEmptyStorage, closestNotFullTower, closestRuinRemnantTomb} from "../utils/findUtils";

export class StorageToTowerRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestNotFullTower(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyNotEmptyStorage(this.creep.pos);
    }
}