import {
    ROLE_BUILDER,
    ROLE_CONTAINER_2_STORAGE_TRANSFER,
    ROLE_HARVESTER,
    ROLE_HARVESTER_FAR,
    ROLE_MINER,
    ROLE_REPAIRER,
    ROLE_SOLDER,
    ROLE_SPAWN_ASSISTANT,
    ROLE_STORAGE_2_CONTROLLER_CONTAINER_TRANSFER,
    ROLE_SWEEP_2_STORAGE_TRANSFER,
    ROLE_TOWER_TRANSFER,
    ROLE_UPGRADER
} from "../constants";
import {CreepState, StatefulRole} from "../role/base/baseRoles";
import {SpawnSupplierRole} from "../role/logistics/SpawnSupplierRole";
import {getAllCreeps, getAvailableSpawn, getClosestCmpFun, trySpawn} from "../utils";
import {HarvestRole} from "../role/core/HarvestRole";
import {UpgradeRole} from "../role/core/UpgradeRole";
import {MinerRole} from "../role/core/MinerRole";
import {
    closestEnergyNotEmptyStorableOutRangeController,
    closestEnergyNotFullContainerNearController,
    closestHaveEnergyTower,
    closestHighPriorityConstructionSite,
    closestHurtStructure,
    closestMineral,
    closestNotFullStorage,
    closestNotFullTower,
    getEnergyMineralContainerUsedCapacity,
    getRuinTombResourceCount
} from "../role/utils/findUtils";
import {ContainerToStorageRole} from "../role/logistics/ContainerToStorageRole";
import {SweepToStorageRole} from "../role/logistics/SweepToStorageRole";
import {StorageToContainerRole} from "../role/logistics/StorageToContainerRole";
import {TowerTransferRole} from "../role/logistics/TowerTransferRole";
import {BuilderRole} from "../role/core/BuilderRole";
import {RepairerRole} from "../role/maintenance/RepairerRole";
import {getRoomCenter, getRoomCenterWalkablePos} from "../utils/PositionUtils";
import {TowerController} from "../army";
import {LinkManager} from "../link/LinkManager";
import {BodyConfigManager} from "../body/BodyConfigManager";
import {SolderRole} from "../role/core/SolderRole";
import profiler from "screeps-profiler";

// 返回房间描述：是我的还是敌人（包括名字）还是中立，controller级别，房间名
function getRoomDes(room: Room) {
    const controller = room.controller;
    const roomName = room.name;

    if (!controller) {
        return `${roomName}: 中立房间 (无控制器)`;
    }

    const level = controller.level;

    if (controller.my) {
        return `${roomName}: 我的房间 (等级${level})`;
    } else if (controller.owner) {
        return `${roomName}: 敌人房间 (${controller.owner.username}, 等级${level})`;
    } else if (controller.reservation) {
        return `${roomName}: 预定房间 (${controller.reservation.username}, 等级${level})`;
    } else {
        return `${roomName}: 中立房间 (等级${level})`;
    }
}

export function runRoom(room: Room) {
    console.log('运行', getRoomDes(room),);
    room.find(FIND_MY_CREEPS).forEach(runCreep);

    new TowerController(room).run();
    spawnIfNeed(room, SPAWN_CONFIGS);
    LinkManager.manageLinkNetwork(room.name);
}

export function runCreep(creep: Creep) {
    roleFactory(creep)?.dispatch();
}

function harvesterRoleFactory(creep: Creep): StatefulRole<any, any> | null {
    const role = creep.memory.role;
    const harHarvester = new HarvestRole(creep);
    if (!harHarvester.isJustBorn) return harHarvester;

    // 刚出生时设置移动目标
    let mainSpawn = getRoomCenter(creep.room);
    if (!mainSpawn) return null;
    const sources = creep.room.find(FIND_SOURCES).sort(getClosestCmpFun(mainSpawn));
    let source: Source;
    // todo 应该想办法把两个role合并
    switch (role) {
        case ROLE_HARVESTER:
            source = sources[0];
            break
        case ROLE_HARVESTER_FAR:
            source = sources[sources.length - 1];
            break
        default:
            throw new Error(`非法角色${role}`);
    }
    harHarvester.initialWithPosition(source.pos);
    return harHarvester;
}

function roleFactory(creep: Creep): StatefulRole<any, any> | null {
    const role = creep.memory.role;
    switch (role) {
        case ROLE_SPAWN_ASSISTANT:
            return new SpawnSupplierRole(creep);
        case ROLE_SOLDER:
            return new SolderRole(creep);
        case ROLE_REPAIRER:
            return new RepairerRole(creep);
        case ROLE_BUILDER:
            return new BuilderRole(creep);
        case ROLE_CONTAINER_2_STORAGE_TRANSFER:
            return new ContainerToStorageRole(creep);
        case ROLE_SWEEP_2_STORAGE_TRANSFER:
            return new SweepToStorageRole(creep);
        case ROLE_STORAGE_2_CONTROLLER_CONTAINER_TRANSFER:
            return new StorageToContainerRole(creep);
        case ROLE_TOWER_TRANSFER:
            return new TowerTransferRole(creep);
        case ROLE_HARVESTER:
        case ROLE_HARVESTER_FAR:
            return harvesterRoleFactory(creep);
        case ROLE_UPGRADER:
            const upgradeRole = new UpgradeRole(creep);
            if (upgradeRole.isJustBorn) {
                const controller = creep.room.controller;
                if (controller) {
                    upgradeRole.initialWithPosition(controller.pos);
                }
            }
            return upgradeRole;
        case ROLE_MINER:
            const mineRole = new MinerRole(creep);
            if (mineRole.isJustBorn) {
                const mineral = closestMineral(creep.pos);
                console.log('find mineral', mineral);
                if (mineral) {
                    mineRole.initialWithMineral(mineral.pos, mineral.mineralType);
                }
            }
            return mineRole;
        default:
            return null;
    }
}

function spawnIfNeed(room: Room, configs: SpawnConfig[]) {
    if (!(room.controller?.my ?? false)) return;
    let spawn = getAvailableSpawn(room);
    if (!spawn) return;

    let allCreeps = getAllCreeps(room);
    const map = allCreeps
        .map(it => it.memory.role)
        .reduce((map, key) =>
                key ? map.set(key, (map.get(key) || 0) + 1) : map,
            new Map<string, number>());

    for (const config of configs) {
        if (!shouldSpawn(room, config)) continue;
        const expectCnt = config.maxCnt - (map.get(config.role) || 0);
        if (expectCnt <= 0) continue;
        console.log(room.name, spawn, config.role, '还差', expectCnt);
        // 动态生成body配置
        const dynamicBody = BodyConfigManager.getOptimalBody(config.role, config.body, room);
        if (dynamicBody.length === 0) {
            console.log(`⚠️ 房间 ${room.name} 无法为角色 ${config.role} 生成body，跳过孵化`);
            break;
        }

        const memory: CreepMemory = {
            role: config.role,
            lifeState: CreepState.INITIAL,
            logging: false,
            isJustBorn: true,
        };
        trySpawn(spawn, config.role + Date.now(), dynamicBody, memory);
        break;
    }
}

function shouldSpawn(room: Room, config: SpawnConfig): boolean {
    let pos = getRoomCenterWalkablePos(room);
    switch (config.role) {
        case ROLE_SOLDER:
            return room.find(FIND_HOSTILE_CREEPS).length > 0 && room.find(FIND_MY_STRUCTURES, {
                filter: it => it.structureType === STRUCTURE_TOWER && it.store.getUsedCapacity(RESOURCE_ENERGY) > 50
            }).length < 3;
        case ROLE_MINER:
            return !!closestMineral(pos) && !!closestNotFullStorage(pos);
        case ROLE_TOWER_TRANSFER:
            return !!closestNotFullTower(pos);
        case ROLE_BUILDER:
            return !!closestHighPriorityConstructionSite(pos);
        case ROLE_REPAIRER:
            return !closestHaveEnergyTower(pos) && !!closestHurtStructure(pos);
        case ROLE_CONTAINER_2_STORAGE_TRANSFER:
            // todo 待简化
            let storeExist = !!closestNotFullStorage(pos);
            if (!storeExist) return false;
            let capacity = getEnergyMineralContainerUsedCapacity(room);
            let cnt = Math.min(5, Math.ceil(capacity / 2000));
            config.maxCnt = cnt;
            return cnt > 0;
        case ROLE_STORAGE_2_CONTROLLER_CONTAINER_TRANSFER:
            return !!closestEnergyNotFullContainerNearController(pos) && !!closestEnergyNotEmptyStorableOutRangeController(pos);
        case ROLE_HARVESTER_FAR:
            return room.find(FIND_SOURCES).length > 1;
        case ROLE_SWEEP_2_STORAGE_TRANSFER:
            // todo 待简化
            let storageExist = closestNotFullStorage(pos);
            if (!storageExist) return false;
            let ruinTombResourceCount = getRuinTombResourceCount(room);
            let count = Math.min(4, Math.ceil(ruinTombResourceCount / 450));
            config.maxCnt = count;
            return count > 0;
    }
    return true;
}

interface SpawnConfig {
    role: string;
    body: BodyPartConstant[],
    maxCnt: number;
}

const BODY_MID_WORKER = [
    WORK, WORK, WORK, WORK, WORK,
    MOVE, MOVE, MOVE, MOVE, MOVE,
    CARRY,
];
export const BODY_SMALL_WORKER = [MOVE, MOVE, WORK, CARRY, CARRY];

const BODY_TRANSFER = [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY,];

const SPAWN_CONFIGS: SpawnConfig[] = [
    {
        role: ROLE_SPAWN_ASSISTANT,
        body: BODY_SMALL_WORKER,
        maxCnt: 2,
    },
    {
        role: ROLE_SOLDER,
        body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK,],
        maxCnt: 4,
    },
    // 孵化助手之后优先建造extension、container等
    {
        role: ROLE_BUILDER,
        body: [WORK, CARRY, CARRY, MOVE],
        maxCnt: 3,
    },
    {
        role: ROLE_UPGRADER,
        body: BODY_MID_WORKER,
        maxCnt: 3,
    },
    {
        role: ROLE_HARVESTER,
        body: BODY_MID_WORKER,
        maxCnt: 1,
    },
    {
        role: ROLE_CONTAINER_2_STORAGE_TRANSFER,
        body: BODY_TRANSFER,
        maxCnt: 1,
    },
    {
        role: ROLE_SWEEP_2_STORAGE_TRANSFER,
        body: BODY_TRANSFER,
        maxCnt: 1,
    },
    {
        role: ROLE_REPAIRER,
        body: BODY_SMALL_WORKER,
        maxCnt: 1,
    },
    {
        role: ROLE_HARVESTER_FAR,
        body: BODY_MID_WORKER,
        maxCnt: 1,
    },
    {
        role: ROLE_MINER,
        body: BODY_MID_WORKER,
        maxCnt: 3,
    },
    {
        role: ROLE_TOWER_TRANSFER,
        body: BODY_TRANSFER,
        maxCnt: 1,
    },
    {
        role: ROLE_STORAGE_2_CONTROLLER_CONTAINER_TRANSFER,
        body: BODY_TRANSFER,
        maxCnt: 1,
    }
] as const;

// 注册性能监测（在函数声明后）
if (typeof profiler !== 'undefined') {
    profiler.registerFN(runRoom, 'controller.runRoom');
    profiler.registerFN(runCreep, 'controller.runCreep');
    profiler.registerFN(spawnIfNeed, 'controller.spawnIfNeed');
    profiler.registerFN(shouldSpawn, 'controller.shouldSpawn');
}