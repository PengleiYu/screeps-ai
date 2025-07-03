import {StatefulRole} from "./role2";
import {CanGetEnergy, CanPutEnergy} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutEnergy} from "./actionUtils";
import {closestCanSpawn, closestSourceAndCanWithdrawNoSpawn} from "./findUtils";

export class SpawnAssistantRole extends StatefulRole<CanGetEnergy, CanPutEnergy> {
    findSource(): EnergyAction<CanGetEnergy> {
        return actionOfGetEnergy(this.creep, closestSourceAndCanWithdrawNoSpawn(this.creep.pos));
    }

    findWorkTarget(): EnergyAction<CanPutEnergy> {
        return actionOfPutEnergy(this.creep, closestCanSpawn(this.creep.pos));
    }
}