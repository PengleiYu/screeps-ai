import {StatefulRole} from "./role2";
import {CanHarvest, CanPutDown, CanWithdraw} from "../types";
import {EnergyAction} from "./actions";
import {canSpawnAction, sourceAndCanWithdrawAction} from "./actionUtils";

export class SpawnAssistantRole extends StatefulRole<CanHarvest | CanWithdraw, CanPutDown> {
    findSource(): EnergyAction<Source | CanWithdraw> {
        return sourceAndCanWithdrawAction(this.creep) ?? this.invalidAction;
    }

    findWorkTarget(): EnergyAction<CanPutDown> {
        return canSpawnAction(this.creep) ?? this.invalidAction;
    }
}