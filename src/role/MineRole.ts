import {EnergyAction} from "./actions";
import {CanGetSource, CanPutSource, CanWork} from "../types";
import {actionOfGetEnergy, actionOfPutMineral} from "./actionUtils";
import {closestCanPutDown, closestMineral} from "./findUtils";
import {MineralRole} from "./MineralRole";

export class MineRole extends MineralRole {
    protected findCanWork2(): CanWork | CanPutSource | null {
        return closestCanPutDown(this.creep.pos, this.getSourceType());
    }

    protected findCanGetSource2(): CanGetSource | null {
        return closestMineral(this.creep.pos, this.getSourceType());
    }

    findCanGetEnergy(): EnergyAction<CanGetSource> {
        return actionOfGetEnergy(this.creep, closestMineral(this.creep.pos, this.getSourceType()));
    }

    findCanWork(): EnergyAction<CanWork | CanPutSource> {
        return actionOfPutMineral(this.creep, closestCanPutDown(this.creep.pos, this.getSourceType()), this.getSourceType());
    }

    public initialWithMineral(mineralPos: RoomPosition, mineralType: MineralConstant) {
        this.creep.memory.sourceType = mineralType;
        this.initialWithPosition(mineralPos);
    }
}