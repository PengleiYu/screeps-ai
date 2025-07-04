import {CanGetSource, CanPutSource, CanWork} from "../types";
import {EnergyAction} from "./actions";

import {actionOfGetEnergy, actionOfWork} from "./actionUtils";
import {closestSourceAndCanWithdrawNoSpawn} from "./findUtils";
import {EnergyRole} from "./EnergyRole";

export class UpgradeRole extends EnergyRole {
    protected findCanWork2(): CanWork | CanPutSource | null {
        return this.creep.room.controller ?? null;
    }

    protected findCanGetSource2(): CanGetSource | null {
        return closestSourceAndCanWithdrawNoSpawn(this.creep.pos);
    }

    findCanGetEnergy(): EnergyAction<CanGetSource> {
        return actionOfGetEnergy(this.creep, closestSourceAndCanWithdrawNoSpawn(this.creep.pos));
    }

    findCanWork(): EnergyAction<CanWork> {
        const controller = this.creep.room.controller ?? null;
        return actionOfWork(this.creep, controller);
    }
}