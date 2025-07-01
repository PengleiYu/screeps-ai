import {StatefulRole} from "./role2";
import {CanWithdraw} from "../types";
import {EnergyAction, UpgradeAction} from "./actions";
import {closestSourceAndCanWithdrawNoSpawn} from "./findUtils";

export class UpgradeRole extends StatefulRole<Source | CanWithdraw, StructureController> {
    findSource(): EnergyAction<Source | CanWithdraw> {
        return closestSourceAndCanWithdrawNoSpawn(this.creep) ?? this.invalidAction;
    }

    findWorkTarget(): EnergyAction<StructureController> {
        const memoryWork = this.getMemoryWork();
        if (memoryWork) {
            return new UpgradeAction(this.creep, memoryWork);
        }
        const controller = this.creep.room.controller;
        if (controller) {
            this.setMemoryWorkTarget(controller);
            return new UpgradeAction(this.creep, controller);
        }
        return this.invalidAction;
    }

    getMemoryWork(): StructureController | null {
        const lastSourceId = this.creep.memory.lastWorkId;
        if (!lastSourceId) return null;
        return Game.getObjectById(lastSourceId as Id<StructureController>);
    }

    setMemoryWorkTarget(workTarget: StructureController) {
        this.log('setMemoryWorkTarget', workTarget, 'called');
        this.creep.memory.lastWorkId = workTarget.id as Id<Structure>;
    }
}