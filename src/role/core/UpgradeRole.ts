import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {EnergyRole} from "./EnergyRole";
import {closestEnergyProviderForWork} from "../utils/closestEnergyProviderForWork";

export class UpgradeRole extends EnergyRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return this.creep.room.controller ?? null;
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestEnergyProviderForWork(this.creep.pos);
    }
}