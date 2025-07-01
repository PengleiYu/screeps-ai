import {ROLE_HARVESTER, ROLE_HARVESTER_FAR, ROLE_SPAWN_ASSISTANT, ROLE_UPGRADER} from "../constants";
import {CreepState, StatefulRole} from "../role/role2";
import {SpawnAssistantRole} from "../role/SpawnAssistantRole";
import {getClosestCmpFun, getSpawn, trySpawn} from "../utils";
import {FixedSourceHarvestRole} from "../role/HarvestRole";
import {UpgradeRole} from "../role/UpgradeRole";

export function loop2() {
    Object.values(Game.creeps).map(roleFactory).forEach(it => it?.dispatch())

    spawnIfNeed(Object.values(Game.creeps), SPAWN_CONFIGS);
}

function harvesterRoleFactory(creep: Creep): StatefulRole<any, any> | null {
    const role = creep.memory.role;
    const harHarvester = new FixedSourceHarvestRole(creep);
    if (harHarvester.getMemorySource()) {
        return harHarvester;
    }
    const sources = getSpawn().room.find(FIND_SOURCES).sort(getClosestCmpFun(getSpawn()));
    const nearSource = sources[0];
    const farSource = sources[sources.length - 1];
    switch (role) {
        case ROLE_HARVESTER:
            harHarvester.setMemorySource(nearSource);
            break
        case ROLE_HARVESTER_FAR://先简单处理，未来要根据source可采集位置动态计算body和数量，而且不应该用role区分
            harHarvester.setMemorySource(farSource);
            break
        default:
            throw new Error(`非法角色${role}`);
    }
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
            return new UpgradeRole(creep);
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
            const memory: CreepMemory = {role: config.role, lifeState: CreepState.NONE, logging: false,};
            trySpawn(config.role + Date.now(), config.body, memory);
        }
    }
}

interface SpawnConfig {
    role: string;
    body: BodyPartConstant[],
    maxCnt: number;
}

const SPAWN_CONFIGS: SpawnConfig[] = [
    {
        role: ROLE_SPAWN_ASSISTANT,
        body: [MOVE, MOVE, CARRY, CARRY, WORK],
        maxCnt: 2,
    }, {
        role: ROLE_HARVESTER,
        body: [
            WORK, WORK, WORK, WORK, WORK,
            MOVE, MOVE, MOVE, MOVE, MOVE,
            CARRY,
        ],
        maxCnt: 1,
    }, {
        role: ROLE_HARVESTER_FAR,
        body: [
            WORK, WORK, WORK, WORK, WORK,
            MOVE, MOVE, MOVE, MOVE, MOVE,
            CARRY,
        ],
        maxCnt: 1,
    }, {
        role: ROLE_UPGRADER,
        body: [WORK, MOVE, CARRY],
        maxCnt: 3,
    }
];