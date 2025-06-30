import {StatefulRole} from "./role2";
import {CanHarvest, CanPutDown, CanWithdraw, StructureHaveStore} from "../types";
import {EnergyAction, HarvestAction} from "./actions";
import {closestCanPutDown, closestSource} from "./findUtils";

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

export class FixedSourceHarvestRole extends HarvestRole {

    constructor(creep: Creep, source?: Source) {
        super(creep);
        if (source) this.setMemorySource(source);
    }

    findSource(): EnergyAction<Source | CanWithdraw> {
        // 读取记忆的source
        let source = this.getMemorySource();
        if (source) {
            this.log('回忆source', source);
            return new HarvestAction(this.creep, source);
        }

        // 重新寻找source，并记忆
        const result = closestSource(this.creep);
        if (result) {
            this.setMemorySource(result.target);
            this.log('记忆source', result.target);
        }
        return result ?? this.invalidAction;
    }

    getMemorySource(): Source | null {
        const lastSourceId = this.creep.memory.lastSourceId;
        if (!lastSourceId) return null;
        return Game.getObjectById(lastSourceId as Id<Source>);
    }

    setMemorySource(source: Source) {
        this.log('setMemorySource', source, 'called');
        this.creep.memory.lastSourceId = source.id;
    }
}