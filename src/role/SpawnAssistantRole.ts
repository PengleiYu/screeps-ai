import {MemoryRole} from "./role2";
import {CanGetSource, CanPutSource} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutEnergy} from "./actionUtils";
import {closestCanSpawn, closestSourceAndCanWithdrawNoSpawn} from "./findUtils";

export class SpawnAssistantRole extends MemoryRole {
    findCanGetEnergy(): EnergyAction<CanGetSource> {
        return actionOfGetEnergy(this.creep, closestSourceAndCanWithdrawNoSpawn(this.creep.pos));
    }

    findCanWork(): EnergyAction<CanPutSource> {
        return actionOfPutEnergy(this.creep, closestCanSpawn(this.creep.pos));
    }
}