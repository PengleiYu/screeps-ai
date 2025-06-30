import {ROLE_SPAWN_ASSISTANT} from "../constants";
import {CreepState, StatefulRole} from "../role/role2";
import {SpawnAssistantRole} from "../role/SpawnAssistantRole";
import {mapToObj, trySpawn} from "../utils";

export function loop2() {
    Object.values(Game.creeps).map(roleFactory).forEach(it => it?.dispatch())

    spawnIfNeed(Object.values(Game.creeps), SPAWN_CONFIGS);
}

function roleFactory(creep: Creep): StatefulRole<any, any> | null {
    const role = creep.memory.role;
    switch (role) {
        case ROLE_SPAWN_ASSISTANT:
            return new SpawnAssistantRole(creep);
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
    },
];