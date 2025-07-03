import {StatefulRole} from "./role2";
import {CanGetEnergy, CanWithdraw, CanWork} from "../types";
import {EnergyAction, UpgradeAction} from "./actions";

import {actionOfGetEnergy, actionOfWork, sourceAndCanWithdrawAction} from "./actionUtils";
import {closestSourceAndCanWithdrawNoSpawn} from "./findUtils";

export class UpgradeRole extends StatefulRole<CanGetEnergy, CanWork> {
    findSource(): EnergyAction<CanGetEnergy> {
        return actionOfGetEnergy(this.creep, closestSourceAndCanWithdrawNoSpawn(this.creep.pos));
    }

    findWorkTarget(): EnergyAction<CanWork> {
        const memoryWork = this.getMemoryWork();
        if (memoryWork) {
            return actionOfWork(this.creep, memoryWork);
        }
        const controller = this.creep.room.controller;
        if (controller) {
            this.setMemoryWorkTarget(controller);
            return actionOfWork(this.creep, controller);
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