import {StatefulRole} from "./role2";
import {closestCanPutDown, closestCanSpawn, closestSourceAndCanWithdrawNoSpawn} from "./utils";
import {CanHarvest, CanPutDown, CanWithdraw} from "../types";
import {EnergyAction} from "./actions";

export class SpawnAssistantRole extends StatefulRole<CanHarvest | CanWithdraw, CanPutDown> {
    findSource(): EnergyAction<Source | CanWithdraw> {
        return closestSourceAndCanWithdrawNoSpawn(this.creep) ?? this.invalidAction;
    }

    findWorkTarget(): EnergyAction<CanPutDown> {
        return closestCanSpawn(this.creep) ?? this.invalidAction;
    }

    findSourceStoreSite(): EnergyAction<CanPutDown> {
        return closestCanPutDown(this.creep) ?? this.invalidAction;
    }
}