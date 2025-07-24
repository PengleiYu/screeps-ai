import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {closestCanSpawn} from "../utils/findUtils";
import {EnergyRole} from "../core/EnergyRole";
import {closestEnergyProviderForWork} from "../utils/closestEnergyProviderForWork";

export class SpawnSupplierRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestCanSpawn(this.creep.pos);
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyProviderForWork(this.creep.pos);
    }
}