import {StatefulRole} from "../base/baseRoles";
import {AttachAction, EnergyAction} from "../base/actionTypes";
import {CanPutSource} from "../../types";
import {closestHostileUnit} from "../utils/findUtils";

// TODO 需要重构
export class SolderRole extends StatefulRole<any, Creep | Structure> {
    protected findEnergyPutDown(): EnergyAction<CanPutSource> {
        return EnergyAction.invalidInstance;
    }

    protected findSource(): EnergyAction<any> {
        return EnergyAction.invalidInstance;
    }

    protected findWorkTarget(): EnergyAction<Creep | Structure> {
        let pos = this.creep.pos;
        let hostileCreep = closestHostileUnit(pos);
        if (hostileCreep != null) return new AttachAction(this.creep, hostileCreep);
        return EnergyAction.invalidInstance;
    }

    protected isStoreEmpty(): boolean {
        return false;
    }

    protected isStoreFull(): boolean {
        return true;
    }

    dispatch() {
        super.dispatch();
    }
}