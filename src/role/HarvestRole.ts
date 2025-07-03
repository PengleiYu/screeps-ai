import {StatefulRole} from "./role2";
import {CanGetEnergy, CanPutEnergy} from "../types";
import {EnergyAction} from "./actions";
import {actionOfGetEnergy, actionOfPutEnergy} from "./actionUtils";
import {closestCanPutDown, closestSource} from "./findUtils";

export class HarvestRole extends StatefulRole<CanGetEnergy, CanPutEnergy> {
    findSource(): EnergyAction<CanGetEnergy> {
        return actionOfGetEnergy(this.creep, closestSource(this.creep.pos));
    }

    findWorkTarget(): EnergyAction<CanPutEnergy> {
        return actionOfPutEnergy(this.creep, closestCanPutDown(this.creep.pos));
    }
}

export class FixedSourceHarvestRole extends HarvestRole {

    constructor(creep: Creep, source?: Source) {
        super(creep);
        if (source) this.setMemorySource(source);
    }

    findSource(): EnergyAction<CanGetEnergy> {
        // 读取记忆的source
        let source = this.getMemorySource();
        // todo 这里是不是要检查类型必须为Source
        if (source) {
            this.log('回忆source', source);
            return actionOfGetEnergy(this.creep,source);
        }

        // 重新寻找source，并记忆
        const result = super.findSource();
        if (result) {
            this.setMemorySource(result.target);
            this.log('记忆source', result.target);
            return result;
        }
        return this.invalidAction;
    }

    getMemorySource(): CanGetEnergy | null {
        const lastSourceId = this.creep.memory.lastSourceId;
        if (!lastSourceId) return null;
        return Game.getObjectById(lastSourceId);
    }

    setMemorySource(source: CanGetEnergy) {
        this.log('setMemorySource', source, 'called');
        this.creep.memory.lastSourceId = source.id;
    }
}