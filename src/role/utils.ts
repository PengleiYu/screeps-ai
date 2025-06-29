import {getClosestCmpFun,} from "../utils";
import {
    CanPutDown,
    CanWithdraw,
    STRUCTURE_HAVE_STORE_CONST,
    STRUCTURE_HAVE_STORE_NO_SPAWN_CONST,
    StructureHaveStore
} from "../types";
import {EnergyAction, HarvestAction, TransferAction, WithdrawAction} from "./actions";

type StoreFilter = (store: StoreDefinition | Store<any, any>) => boolean;

function findCloseStructure(creep: Creep, constantArr: StructureConstant[], storeFilter: (store: (StoreDefinition | Store<any, any>)) => boolean): StructureHaveStore | null {
    return creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (it: StructureHaveStore/*这里忽略类型推断*/) => {
            return constantArr.includes(it.structureType)
                && 'store' in it
                && storeFilter(it.store);
        }
    });
}

export function findSourceAndCanWithdrawNoSpawn(creep: Creep): EnergyAction<Source | CanWithdraw> | null {
    const pos = creep.pos;

    const source = pos.findClosestByPath(FIND_SOURCES, {filter: it => it.energy > 0});

    const filter: StoreFilter = it => it.getUsedCapacity(RESOURCE_ENERGY) > 0;
    const haveStore = findCloseStructure(creep, STRUCTURE_HAVE_STORE_NO_SPAWN_CONST, filter);
    const tombstone = pos.findClosestByPath(FIND_TOMBSTONES, {filter});
    const ruin = pos.findClosestByPath(FIND_RUINS, {filter});

    const result = [source, tombstone, ruin, haveStore]
        .filter(it => !!it).sort(getClosestCmpFun(pos))[0];

    if (!result) return null;
    if (result instanceof Source) return new HarvestAction(creep, result);
    return new WithdrawAction(creep, result);
}

export function findCanSpawn(creep: Creep): EnergyAction<CanPutDown> | null {
    const center = creep.pos;
    const extension: StructureExtension | null = center.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: obj =>
            obj.structureType === STRUCTURE_EXTENSION && obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    })
    if (extension) return new TransferAction(creep, extension);
    const spawn = center.findClosestByRange(FIND_MY_SPAWNS, {
        filter: obj => obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
    if (spawn) return new TransferAction(creep, spawn);
    return null;
}

export function findCanPutDown(creep: Creep): EnergyAction<CanPutDown> | null {
    const haveStore = findCloseStructure(creep, STRUCTURE_HAVE_STORE_CONST,
        it => it.getFreeCapacity(RESOURCE_ENERGY) > 0);
    if (!haveStore) return null;
    return new TransferAction(creep, haveStore);
}