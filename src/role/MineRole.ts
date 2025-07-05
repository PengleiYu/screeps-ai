import {CanGetSource, CanPutSource, CanWork} from "../types";
import {closestMineral} from "./findUtils";
import {TypeUtils} from "../utils/TypeUtils";
import {EnergyAction} from "./actions";
import {actionOfPutMineral} from "./actionUtils";
import {HarvestRole} from "./HarvestRole";

/**
 * {@link MinerRole#getSourceType}没有可用类型时会退化成父类
 */
export class MinerRole extends HarvestRole {
    protected getSourceType(): ResourceConstant {
        return this.creep.memory.sourceType ?? super.getSourceType();
    }

    protected canWork2Action(canWork: CanPutSource | null): EnergyAction<CanWork | CanPutSource> {
        const sourceType = this.getSourceType();
        if (TypeUtils.isMineralConstant(sourceType)) return actionOfPutMineral(this.creep, canWork, sourceType);
        return super.canWork2Action(canWork);
    }

    protected findCanGetSource(): CanGetSource | null {
        const sourceType = this.getSourceType();
        if (TypeUtils.isMineralConstant(sourceType)) return closestMineral(this.creep.pos, sourceType);
        return super.findCanGetSource();
    }

    /**
     * 若不通过此方法初始化，会退化成harvester
     */
    public initialWithMineral(mineralPos: RoomPosition, mineralType: MineralConstant) {
        this.log('initialWithMineral', mineralPos, mineralType);
        this.creep.memory.sourceType = mineralType;
        this.initialWithPosition(mineralPos);
    }
}