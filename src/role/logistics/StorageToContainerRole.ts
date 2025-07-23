import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {EnergyRole} from "../core/EnergyRole";
import {
    closestEnergyNotEmptyStorableOutRangeController,
    closestEnergyNotEmptyStorage,
    closestEnergyNotFullContainerNearController
} from "../utils/findUtils";

export class StorageToContainerRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestEnergyNotFullContainerNearController(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyNotEmptyStorableOutRangeController(this.creep.pos);
    }
}