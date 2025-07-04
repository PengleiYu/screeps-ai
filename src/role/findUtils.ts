import {getClosestCmpFun,} from "../utils";
import {
    CanPutSource,
    CanWithdraw,
    STRUCTURE_HAVE_STORE_CONST,
    STRUCTURE_HAVE_STORE_NO_SPAWN_CONST,
    StructureHaveStore
} from "../types";

type CanWithdrawFilter = (it: CanWithdraw) => boolean;

function findCloseStructure(pos: RoomPosition, constantArr: StructureConstant[], storeFilter: CanWithdrawFilter): StructureHaveStore | null {
    return pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (it: StructureHaveStore/*这里忽略类型推断*/) => {
            return constantArr.includes(it.structureType)
                && storeFilter(it);
        }
    });
}

// 最近可获取能量的地方，除了孵化建筑
export function closestSourceAndCanWithdrawNoSpawn(pos: RoomPosition): Source | CanWithdraw | null {
    const filter: CanWithdrawFilter = it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    const haveStore = findCloseStructure(pos, STRUCTURE_HAVE_STORE_NO_SPAWN_CONST, filter);
    const tombstone = pos.findClosestByPath(FIND_TOMBSTONES, {filter: filter});
    const ruin: Ruin | null = pos.findClosestByPath(FIND_RUINS, {filter});

    // 优先墓碑、遗址、建筑
    const result = [tombstone, ruin, haveStore]
        .filter(it => !!it).sort(getClosestCmpFun(pos))[0];
    if (result) return result;
    //其次能量点
    return closestEnergy(pos);
}

// 最近的能量点
export function closestEnergy(pos: RoomPosition): Source | null {
    return pos.findClosestByPath(FIND_SOURCES, {filter: it => it.energy > 0});
}

// 最近的矿点
export function closestMineral(pos: RoomPosition): Mineral | null {
    return pos.findClosestByPath(FIND_MINERALS, {filter: it => it.mineralAmount > 0})
}

// 最近的可放置的地方
export function closestCanPutDown(pos: RoomPosition, resType: ResourceConstant) {
    return findCloseStructure(pos, STRUCTURE_HAVE_STORE_CONST,
        it => (it.store.getFreeCapacity(resType) ?? 0) > 0);
}

// 最近的孵化建筑
export function closestCanSpawn(center: RoomPosition): CanPutSource | null {
    // 优先extension
    const extension: StructureExtension | null = center.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: obj =>
            obj.structureType === STRUCTURE_EXTENSION && obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    })
    if (extension) return extension;
    // 其次spawn
    return center.findClosestByRange(FIND_MY_SPAWNS, {
        filter: obj => obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
}