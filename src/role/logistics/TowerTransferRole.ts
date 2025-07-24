import {CanWork, CanPutSource, CanGetSource} from "../../types";
import {EnergyRole} from "../core/EnergyRole";
import {
    closestEnergyNotEmptyStorableOutRangeController,
    closestEnergyNotEmptyStorage,
    closestNotFullTower,
    closestRuinRemnantTomb
} from "../utils/findUtils";

export class TowerTransferRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestNotFullTower(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyNotEmptyStorableOutRangeController(this.creep.pos);
    }
}