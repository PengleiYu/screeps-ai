import {
    ROLE_HARVESTER,
    ROLE_HARVESTER_FAR,
    ROLE_MINER,
    ROLE_SPAWN_ASSISTANT,
    ROLE_CONTAINER_2_STORAGE_TRANSFER,
    ROLE_UPGRADER,
    ROLE_SWEEP_2_STORAGE_TRANSFER,
    ROLE_STORAGE_2_CONTROLLER_CONTAINER_TRANSFER,
    ROLE_STORAGE_2_TOWER_TRANSFER, ROLE_BUILDER
} from "../constants";
import {CreepState, StatefulRole} from "../role/baseRoles";
import {EnergySupplierRole} from "../role/EnergySupplierRole";
import {getClosestCmpFun, getSpawn, trySpawn} from "../utils";
import {HarvestRole} from "../role/HarvestRole";
import {UpgradeRole} from "../role/UpgradeRole";
import {MinerRole} from "../role/MinerRole";
import {closestConstructionSite, closestMineral, closestNotFullTower} from "../role/findUtils";
import {ContainerToStorageRole} from "../role/ContainerToStorageRole";
import {SweepToStorageRole} from "../role/SweepToStorageRole";
import {StorageToContainerRole} from "../role/StorageToContainerRole";
import {StorageToTowerRole} from "../role/StorageToTowerRole";
import {BuilderRole} from "../role/BuilderRole";

export function loop2() {
    Object.values(Game.creeps).map(roleFactory).forEach(it => it?.dispatch())

    spawnIfNeed(Object.values(Game.creeps), SPAWN_CONFIGS);
}

function harvesterRoleFactory(creep: Creep): StatefulRole<any, any> | null {
    const role = creep.memory.role;
    const harHarvester = new HarvestRole(creep);
    if (!harHarvester.isJustBorn) return harHarvester;

    // 刚出生时设置移动目标
    const sources = getSpawn().room.find(FIND_SOURCES).sort(getClosestCmpFun(getSpawn()));
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
            return new EnergySupplierRole(creep);
        case ROLE_BUILDER:
            return new BuilderRole(creep);
        case ROLE_CONTAINER_2_STORAGE_TRANSFER:
            return new ContainerToStorageRole(creep);
        case ROLE_SWEEP_2_STORAGE_TRANSFER:
            return new SweepToStorageRole(creep);
        case ROLE_STORAGE_2_CONTROLLER_CONTAINER_TRANSFER:
            return new StorageToContainerRole(creep);
        case ROLE_STORAGE_2_TOWER_TRANSFER:
            return new StorageToTowerRole(creep);
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

function spawnIfNeed(creeps: Creep[], configs: SpawnConfig[]) {
    const map = creeps.map(it => it.memory.role)
        .reduce((map, key) =>
                key ? map.set(key, (map.get(key) || 0) + 1) : map,
            new Map<string, number>());
    // console.log('role数量统计', JSON.stringify(mapToObj(map)));

    for (const config of configs) {
        const expectCnt = config.maxCnt - (map.get(config.role) || 0);
        if (expectCnt > 0 && shouldSpawn(config)) {
            const memory: CreepMemory = {
                role: config.role,
                lifeState: CreepState.INITIAL,
                logging: false,
                isJustBorn: true,
            };
            trySpawn(config.role + Date.now(), config.body, memory);
        }
    }
}

function shouldSpawn(config: SpawnConfig): boolean {
    switch (config.role) {
        case ROLE_MINER:
            return !!closestMineral(getSpawn().pos);
        case ROLE_STORAGE_2_TOWER_TRANSFER:
            return !!closestNotFullTower(getSpawn().pos);
        case ROLE_BUILDER:
            return !!closestConstructionSite(getSpawn().pos);
    }
    return true;
}

interface SpawnConfig {
    role: string;
    body: BodyPartConstant[],
    maxCnt: number;
}

const BODY_WORKER = [
    WORK, WORK, WORK, WORK, WORK,
    MOVE, MOVE, MOVE, MOVE, MOVE,
    CARRY,
];
const BODY_TRANSFER = [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY,];

const SPAWN_CONFIGS: SpawnConfig[] = [
    {
        role: ROLE_SPAWN_ASSISTANT,
        body: [MOVE, MOVE, CARRY, CARRY, WORK],
        maxCnt: 2,
    },
    {
        role: ROLE_UPGRADER,
        body: BODY_WORKER,
        maxCnt: 1,
    },
    {
        role: ROLE_HARVESTER,
        body: BODY_WORKER,
        maxCnt: 1,
    },
    {
        role: ROLE_BUILDER,
        body: [WORK, CARRY, CARRY, MOVE],
        maxCnt: 3,
    },
    {
        role: ROLE_CONTAINER_2_STORAGE_TRANSFER,
        body: BODY_TRANSFER,
        maxCnt: 2,
    },
    {
        role: ROLE_HARVESTER_FAR,
        body: BODY_WORKER,
        maxCnt: 1,
    },
    {
        role: ROLE_MINER,
        body: BODY_WORKER,
        maxCnt: 3,
    },
    {
        role: ROLE_SWEEP_2_STORAGE_TRANSFER,
        body: BODY_TRANSFER,
        maxCnt: 1,
    },
    {
        role: ROLE_STORAGE_2_TOWER_TRANSFER,
        body: BODY_TRANSFER,
        maxCnt: 1,
    },
    {
        role: ROLE_STORAGE_2_CONTROLLER_CONTAINER_TRANSFER,
        body: BODY_TRANSFER,
        maxCnt: 1,
    }
] as const;