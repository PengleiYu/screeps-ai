import {CanGetSource, CanPutSource, CanWork} from "../types";
import {closestCanPutDown, closestMineral} from "./findUtils";
import {MineralRole} from "./MineralRole";

export class MineRole extends MineralRole {
    protected findCanWork(): CanWork | CanPutSource | null {
        return closestCanPutDown(this.creep.pos, this.getSourceType());
    }

    protected findCanGetSource(): CanGetSource | null {
        return closestMineral(this.creep.pos, this.getSourceType());
    }

    public initialWithMineral(mineralPos: RoomPosition, mineralType: MineralConstant) {
        this.creep.memory.sourceType = mineralType;
        this.initialWithPosition(mineralPos);
    }
}