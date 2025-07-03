import {WorkMemoryRole} from "./role2";
import {CanGetEnergy, CanPutEnergy} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutEnergy} from "./actionUtils";
import {closestCanSpawn, closestSourceAndCanWithdrawNoSpawn} from "./findUtils";

export class SpawnAssistantRole extends WorkMemoryRole {
    findCanGetEnergy(): EnergyAction<CanGetEnergy> {
        return actionOfGetEnergy(this.creep, closestSourceAndCanWithdrawNoSpawn(this.creep.pos));
    }

    findCanWork(): EnergyAction<CanPutEnergy> {
        return actionOfPutEnergy(this.creep, closestCanSpawn(this.creep.pos));
    }
}