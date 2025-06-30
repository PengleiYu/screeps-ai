import {StatefulRole} from "./role2";
import {closestCanPutDown, closestCanSpawn, closestSourceAndCanWithdrawNoSpawn} from "./findUtils";
import {CanHarvest, CanPutDown, CanWithdraw} from "../types";
import {EnergyAction} from "./actions";

export class SpawnAssistantRole extends StatefulRole<CanHarvest | CanWithdraw, CanPutDown> {
    findSource(): EnergyAction<Source | CanWithdraw> {
        return closestSourceAndCanWithdrawNoSpawn(this.creep) ?? this.invalidAction;
    }

    findWorkTarget(): EnergyAction<CanPutDown> {
        return closestCanSpawn(this.creep) ?? this.invalidAction;
    }

    findEnergyStoreSite(): EnergyAction<CanPutDown> {
        return closestCanPutDown(this.creep) ?? this.invalidAction;
    }
}