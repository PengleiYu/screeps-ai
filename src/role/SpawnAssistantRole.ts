import {StatefulRole} from "./role2";
import {findCanPutDown, findCanSpawn, findSourceAndCanWithdrawNoSpawn} from "./utils";
import {CanHarvest, CanPutDown, CanWithdraw} from "../types";
import {EnergyAction} from "./actions";

export class SpawnAssistantRole extends StatefulRole<CanHarvest | CanWithdraw, CanPutDown> {
    findSource(): EnergyAction<Source | CanWithdraw> {
        return findSourceAndCanWithdrawNoSpawn(this.creep) ?? this.invalidAction;
    }

    findWorkTarget(): EnergyAction<CanPutDown> {
        return findCanSpawn(this.creep) ?? this.invalidAction;
    }

    findSourceStoreSite(): EnergyAction<CanPutDown> {
        return findCanPutDown(this.creep) ?? this.invalidAction;
    }
}