import {getClosestCmpFun,} from "../../utils";
import {
    CanGetSource,
    CanPutSource,
    CanWithdraw,
    STRUCTURE_HAVE_STORE_CONST,
    STRUCTURE_HAVE_STORE_NO_SPAWN_CONST,
    StructureHaveStore
} from "../../types";

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
export function closestMineral(pos: RoomPosition, mineralType?: MineralConstant): Mineral | null {
    if (mineralType) return pos.findClosestByPath(FIND_MINERALS, {
        filter: it => it.mineralType === mineralType && it.mineralAmount > 0
    })
    else return pos.findClosestByPath(FIND_MINERALS, {
        filter: it => it.mineralAmount > 0
    });
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

// 最近的可获取资源的container，优先返回装载能量的，其次返回装载其他的
export function closestEnergyMineralStructure(pos: RoomPosition): CanWithdraw | null {
    const room = Game.rooms[pos.roomName];
    const sourcePosArr = room.find(FIND_SOURCES).map(it => it.pos);
    const mineralPosArr = room.find(FIND_MINERALS).map(it => it.pos);
    const containers = [...sourcePosArr, ...mineralPosArr]
        .reduce((arr, cur) => {
            const containers: StructureContainer[] = cur.findInRange(FIND_STRUCTURES, 3, {
                filter: it =>
                    it.structureType === STRUCTURE_CONTAINER
                    && it.store.getUsedCapacity() > 0
            });
            arr.push(...containers);
            return arr;
        }, new Array<StructureContainer>());
    const links = room.find(FIND_MY_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_STORAGE
    })
        .map(it => it.pos)
        .reduce((arr, cur) => {
            const links: StructureLink[] = cur.findInRange(FIND_MY_STRUCTURES, 3, {
                filter: it => it.structureType === STRUCTURE_LINK && it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            });
            arr.push(...links);
            return arr;
        }, new Array<StructureLink>());
    return [...containers, ...links].sort(getClosestCmpFun(pos)) [0] ?? null;
}

// 最近的未满storage，包括任意种类资源
export function closestNotFullStorage(pos: RoomPosition): StructureStorage | null {
    return pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_STORAGE && it.store.getFreeCapacity() > 0
    });
}

// 最近的能量不空的storage
export function closestEnergyNotEmptyStorage(pos: RoomPosition): StructureStorage | null {
    return pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_STORAGE && it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });
}

// 最近的残渣、墓碑、废墟
export function closestRuinRemnantTomb(pos: RoomPosition): CanGetSource | null {
    const remnant = pos.findClosestByRange(FIND_DROPPED_RESOURCES);
    const ruin = pos.findClosestByPath(FIND_RUINS, {
        filter: it => it.store.getUsedCapacity() > 0
    });
    const tomb = pos.findClosestByPath(FIND_TOMBSTONES, {
        filter: it => it.store.getUsedCapacity() > 0
    });
    return [remnant, ruin, tomb]
        .filter(it => !!it)
        .sort(getClosestCmpFun(pos))
        [0];
}

// 最近的controller附近的能量未满的Container
export function closestEnergyNotFullContainerNearController(pos: RoomPosition): StructureContainer | null {
    const controllerPos = Game.rooms[pos.roomName].controller?.pos;
    if (!controllerPos) return null;
    const containers: StructureContainer[] = controllerPos.findInRange(FIND_STRUCTURES, 3, {
        filter: it => it.structureType === STRUCTURE_CONTAINER && it.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
    return containers.sort(getClosestCmpFun(pos)) [0];
}

// 最近的tower
export function closestNotFullTower(pos: RoomPosition): StructureTower | null {
    return pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: it => it.structureType === STRUCTURE_TOWER && it.store.getFreeCapacity(RESOURCE_ENERGY) > 50
    })
}

export function closestHighPriorityConstructionSite(pos: RoomPosition): ConstructionSite | null {
    function findSiteByType(structureType: StructureConstant): ConstructionSite | null {
        return pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
            filter: it => it.structureType === structureType,
        })
    }

    return findSiteByType(STRUCTURE_SPAWN)
        ?? findSiteByType(STRUCTURE_EXTENSION)
        ?? findSiteByType(STRUCTURE_CONTAINER)
        ?? findSiteByType(STRUCTURE_STORAGE)
        ?? pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
}

export function closestHurtStructure(pos: RoomPosition): Structure | null {
    return pos.findClosestByRange(FIND_STRUCTURES, {
        filter: it => (it.structureType !== STRUCTURE_WALL && it.hits < it.hitsMax),
    })
}

export function closestHaveEnergyTower(pos: RoomPosition): StructureTower | null {
    return pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: it =>
            // todo 暂定tower有能量即可，后续再改
            it.structureType === STRUCTURE_TOWER && it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });
}