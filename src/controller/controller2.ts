import {ROLE_HARVESTER, ROLE_HARVESTER_FAR, ROLE_SPAWN_ASSISTANT} from "../constants";
import {CreepState, StatefulRole} from "../role/role2";
import {SpawnAssistantRole} from "../role/SpawnAssistantRole";
import {getClosestCmpFun, getSpawn, trySpawn} from "../utils";
import {FixedSourceHarvestRole} from "../role/HarvestRole";

export function loop2() {
    Object.values(Game.creeps).map(roleFactory).forEach(it => it?.dispatch())

    spawnIfNeed(Object.values(Game.creeps), SPAWN_CONFIGS);
}

function roleFactory(creep: Creep): StatefulRole<any, any> | null {
    const role = creep.memory.role;
    switch (role) {
        case ROLE_SPAWN_ASSISTANT:
            return new SpawnAssistantRole(creep);
        case ROLE_HARVESTER:
            return new FixedSourceHarvestRole(creep);
        case ROLE_HARVESTER_FAR://先简单处理，未来要根据source可采集位置动态计算body和数量，而且不应该用role区分
            const harHarvester = new FixedSourceHarvestRole(creep);
            if (harHarvester.getMemorySource()) {
                return harHarvester;
            }
            const sources = getSpawn().room.find(FIND_SOURCES);
            if (sources.length > 1) { // 仅处理多于一个的
                const source = sources.sort(getClosestCmpFun(getSpawn()))
                    [sources.length - 1];
                harHarvester.setMemorySource(source);
                return harHarvester;
            }
    }
    // console.log(`未知角色[${role}]`);
    return null;
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
        body: [MOVE, WORK, WORK, CARRY],
        maxCnt: 3,
    }, {
        role: ROLE_HARVESTER_FAR,
        body: [MOVE, WORK, CARRY],
        maxCnt: 1,
    }
];