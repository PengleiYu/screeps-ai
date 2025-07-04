import {ROLE_HARVESTER, ROLE_HARVESTER_FAR, ROLE_MINE, ROLE_SPAWN_ASSISTANT, ROLE_UPGRADER} from "../constants";
import {CreepState, StatefulRole} from "../role/role2";
import {SpawnAssistantRole} from "../role/SpawnAssistantRole";
import {getClosestCmpFun, getSpawn, trySpawn} from "../utils";
import {HarvestRole} from "../role/HarvestRole";
import {UpgradeRole} from "../role/UpgradeRole";
import {MineRole} from "../role/MineRole";
import {closestMineral} from "../role/findUtils";

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
            return new SpawnAssistantRole(creep);
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
        case ROLE_MINE:
            const mineRole = new MineRole(creep);
            if (mineRole.isJustBorn) {
                const mineral = closestMineral(creep.pos);
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
        if (expectCnt > 0) {
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

interface SpawnConfig {
    role: string;
    body: BodyPartConstant[],
    maxCnt: number;
}

const HARVESTER_BODY = [
    WORK, WORK, WORK, WORK, WORK,
    MOVE, MOVE, MOVE, MOVE, MOVE,
    CARRY,
];
const SPAWN_CONFIGS: SpawnConfig[] = [
    {
        role: ROLE_SPAWN_ASSISTANT,
        body: [MOVE, MOVE, CARRY, CARRY, WORK],
        maxCnt: 2,
    }, {
        role: ROLE_HARVESTER,
        body: HARVESTER_BODY,
        maxCnt: 1,
    }, {
        role: ROLE_HARVESTER_FAR,
        body: HARVESTER_BODY,
        maxCnt: 1,
    }, {
        role: ROLE_UPGRADER,
        body: [WORK, MOVE, CARRY],
        maxCnt: 3,
    }, {
        role: ROLE_MINE,
        body: HARVESTER_BODY,
        maxCnt: 1,
    }
];