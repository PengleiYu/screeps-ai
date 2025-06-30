import {StatefulRole} from "./role2";
import {CanHarvest, CanPutDown, CanWithdraw, StructureHaveStore} from "../types";
import {EnergyAction} from "./actions";
import {closestCanPutDown, closestSource} from "./utils";

export class HarvestRole extends StatefulRole<CanHarvest | CanWithdraw, CanPutDown> {
    findSource(): EnergyAction<Source | CanWithdraw> {
        return closestSource(this.creep) ?? this.invalidAction;
    }

    findWorkTarget(): EnergyAction<StructureHaveStore> {
        return closestCanPutDown(this.creep) ?? this.invalidAction;
    }

    findEnergyStoreSite(): EnergyAction<CanPutDown> {
        return closestCanPutDown(this.creep) ?? this.invalidAction;
    }
}