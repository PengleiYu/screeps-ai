import {EventBus} from "./eventBus";
import {getRoomCenter} from "./utils/PositionUtils";

export type Positionable = RoomPosition | { pos: RoomPosition };
export var globalInfo = {
    canSpawn: true,
}

function bodyCost(body: BodyPartConstant[]): number {
    return body.map(it => BODYPART_COST[it])
        .reduce((previousValue, currentValue) => previousValue + currentValue)
}

export function getAvailableSpawn(room: Room): StructureSpawn | undefined {
    return room.find(FIND_MY_SPAWNS, {
        filter: it => !it.spawning
    })[0];
}

function getSpawnResultStr(result: ScreepsReturnCode): string {
    switch (result) {
        case OK:
            return 'OK';
        case ERR_NOT_OWNER:
            return 'ERR_NOT_OWNER';
        case ERR_NAME_EXISTS:
            return 'ERR_NAME_EXISTS';
        case ERR_BUSY:
            return 'ERR_BUSY';
        case ERR_NOT_ENOUGH_ENERGY:
            return 'ERR_NOT_ENOUGH_ENERGY';
        case ERR_INVALID_ARGS:
            return 'ERR_INVALID_ARGS';
        case ERR_RCL_NOT_ENOUGH:
            return 'ERR_RCL_NOT_ENOUGH';
        default:
            return 'unknown';
    }
}

export function trySpawn(room: Room, name: string, body: BodyPartConstant[], memory: CreepMemory): boolean {
    if (!globalInfo.canSpawn) {
        return false;
    }

    const spawn = getAvailableSpawn(room);
    if (!spawn) {
        globalInfo.canSpawn = false;
        return false;
    }
    const result = spawn.spawnCreep(body, name, {memory: memory});
    console.log(`${spawn.name}正在孵化${memory.role}:${name}, result=${getSpawnResultStr(result)}`);
    if (result === ERR_NOT_ENOUGH_ENERGY) {
        console.log(`孵化需要能量${(bodyCost(body))}, 可用${(spawn.room.energyAvailable)}, 上限${(spawn.room.energyCapacityAvailable)}`);
    }
    return result == OK;
}

export function getClosestCmpFun<T extends RoomPosition | Positionable | null, E extends RoomPosition | Positionable | null>(center: T)
    : (a: E, b: E) => number {
    return (a, b) => {
        if (!center || !a || !b) return 0;
        const pos = center instanceof RoomPosition ? center : center.pos;
        return pos.getRangeTo(a) - pos.getRangeTo(b);
    };
}

export function findFlagPos(room: Room): RoomPosition | null {
    const pos = getRoomCenter(room);
    return pos?.findClosestByRange(FIND_FLAGS, {
        filter: it => it.name === 'Parking'
    })?.pos ?? pos;
}

export const loopEventBus = new EventBus();
export const EVENT_LOOP_END = "event_loop_end";