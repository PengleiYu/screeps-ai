import {getClosestCmpFun,} from "../utils";
import {
    CanPutDown,
    CanWithdraw,
    STRUCTURE_HAVE_STORE_CONST,
    STRUCTURE_HAVE_STORE_NO_SPAWN_CONST,
    StructureHaveStore
} from "../types";
import {EnergyAction, HarvestAction, TransferAction, WithdrawAction} from "./actions";

type CanWithdrawFilter = (it: CanWithdraw) => boolean;

function findCloseStructure(creep: Creep, constantArr: StructureConstant[], storeFilter: CanWithdrawFilter): StructureHaveStore | null {
    return creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (it: StructureHaveStore/*这里忽略类型推断*/) => {
            return constantArr.includes(it.structureType)
                && storeFilter(it);
        }
    });
}

// 最近可获取资源的地方，孵化建筑除外
export function closestSourceAndCanWithdrawNoSpawn(creep: Creep): EnergyAction<Source | CanWithdraw> | null {
    const pos = creep.pos;
    const filter: CanWithdrawFilter = it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    const haveStore = findCloseStructure(creep, STRUCTURE_HAVE_STORE_NO_SPAWN_CONST, filter);
    const tombstone = pos.findClosestByPath(FIND_TOMBSTONES, {filter: filter});
    const ruin: Ruin | null = pos.findClosestByPath(FIND_RUINS, {filter});

    // 优先墓碑、遗址、建筑
    const result = [tombstone, ruin, haveStore]
        .filter(it => !!it).sort(getClosestCmpFun(pos))[0];
    if (result) return new WithdrawAction(creep, result);
    //其次能量点
    return closestSource(creep);
}

// 最近的能量点
export function closestSource(creep: Creep): EnergyAction<Source> | null {
    const source = creep.pos.findClosestByPath(FIND_SOURCES, {filter: it => it.energy > 0});
    if (source) return new HarvestAction(creep, source);
    return null;
}

// 最近的孵化建筑
export function closestCanSpawn(creep: Creep): EnergyAction<CanPutDown> | null {
    const center = creep.pos;
    // 优先extension
    const extension: StructureExtension | null = center.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: obj =>
            obj.structureType === STRUCTURE_EXTENSION && obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    })
    if (extension) return new TransferAction(creep, extension);
    // 其次spawn
    const spawn = center.findClosestByRange(FIND_MY_SPAWNS, {
        filter: obj => obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
    if (spawn) return new TransferAction(creep, spawn);
    return null;
}

// 最近的可放置能量的地方
export function closestCanPutDown(creep: Creep): EnergyAction<CanPutDown> | null {
    const haveStore = findCloseStructure(creep, STRUCTURE_HAVE_STORE_CONST,
        it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
    if (!haveStore) return null;
    return new TransferAction(creep, haveStore);
}