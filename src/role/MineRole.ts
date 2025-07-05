import {CanGetSource, CanPutSource, CanWork} from "../types";
import {closestCanPutDown, closestEnergy, closestMineral} from "./findUtils";
import {TypeUtils} from "../utils/TypeUtils";
import {EnergyAction} from "./actions";
import {actionOfGetSource, actionOfPutEnergy, actionOfPutMineral, actionOfWork2} from "./actionUtils";
import {MemoryRole} from "./role2";

/**
 * {@link MinerRole#getSourceType}没有可用类型时会退化成父类
 */
export class MinerRole extends MemoryRole {
    protected canGetSource2Action(canGet: CanGetSource | null): EnergyAction<CanGetSource> {
        return actionOfGetSource(this.creep, canGet);
    }

    protected canWork2Action(canWork: CanPutSource | null): EnergyAction<CanWork | CanPutSource> {
        const sourceType = this.getSourceType();
        if (!sourceType || !TypeUtils.isMineralConstant(sourceType)) return EnergyAction.invalidInstance;

        return actionOfPutMineral(this.creep, canWork, sourceType);
    }

    protected findCanGetSource(): CanGetSource | null {
        const sourceType = this.getSourceType();
        if (!sourceType || !TypeUtils.isMineralConstant(sourceType)) return null;

        return closestMineral(this.creep.pos, sourceType);
    }

    protected findCanWork(): CanWork | CanPutSource | null {
        const sourceType = this.getSourceType();
        if (!sourceType) return null;
        return closestCanPutDown(this.creep.pos, sourceType);
    }

    protected findEnergyPutDown(): EnergyAction<CanPutSource> {
        const sourceType = this.getSourceType();
        if (!sourceType) return EnergyAction.invalidInstance;
        return actionOfPutEnergy(this.creep, closestCanPutDown(this.creep.pos, sourceType));
    }

    protected isStoreFull(): boolean {
        const sourceType = this.getSourceType();
        if (!sourceType) return false;
        return this.creep.store.getFreeCapacity(sourceType) === 0;
    }

    protected isStoreEmpty(): boolean {
        const sourceType = this.getSourceType();
        if (!sourceType) return true;
        return this.creep.store.getUsedCapacity(sourceType) === 0;
    }

    private getSourceType(): ResourceConstant | null {
        return this.creep.memory.sourceType ?? null;
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