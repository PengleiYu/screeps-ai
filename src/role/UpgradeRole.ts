import {MemoryRole} from "./role2";
import {CanGetEnergy, CanWork} from "../types";
import {EnergyAction} from "./actions";

import {actionOfGetEnergy, actionOfWork} from "./actionUtils";
import {closestSourceAndCanWithdrawNoSpawn} from "./findUtils";

export class UpgradeRole extends MemoryRole {
    findCanGetEnergy(): EnergyAction<CanGetEnergy> {
        return actionOfGetEnergy(this.creep, closestSourceAndCanWithdrawNoSpawn(this.creep.pos));
    }

    findCanWork(): EnergyAction<CanWork> {
        const controller = this.creep.room.controller ?? null;
        return actionOfWork(this.creep, controller);
    }
}