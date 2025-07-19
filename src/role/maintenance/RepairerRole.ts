import {EnergyRole} from "../core/EnergyRole";
import {CanGetSource, CanPutSource, CanWork} from "../../types";
import {closestHurtStructure, closestSourceAndCanWithdrawNoSpawn} from "../utils/findUtils";
import {EnergyAction, RepairAction} from "../base/actionTypes";

export class RepairerRole extends EnergyRole {
    protected findCanGetSource(): CanGetSource | null {
        return closestSourceAndCanWithdrawNoSpawn(this.creep.pos);
    }

    protected findCanWork(): CanWork | CanPutSource | null {
        return closestHurtStructure(this.creep.pos);
    }

    protected canWork2Action(canWork: CanWork | CanPutSource | null): EnergyAction<CanWork | CanPutSource> {
        if (canWork instanceof Structure) return new RepairAction(this.creep, canWork);
        return EnergyAction.invalidInstance;
    }
}