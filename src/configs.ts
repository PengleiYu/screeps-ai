import {SpawnConfig} from "./utils";

export const TEMPLATE_CONFIG_HARVESTER: SpawnConfig = {
    name: 'harvester',
    body: [MOVE, WORK, CARRY],
}
export const TEMPLATE_CONFIG_BUILDER: SpawnConfig = {
    name: 'builder',
    body: [MOVE, WORK, CARRY],
}
export const TEMPLATE_CONFIG_UPGRADER: SpawnConfig = {
    name: 'upgrader',
    body: [MOVE, WORK, CARRY, CARRY, CARRY],
}
export const TEMPLATE_CONFIG_REPAIRER: SpawnConfig = {
    name: 'repairer',
    body: [MOVE, WORK, CARRY],
}
export const TEMPLATE_CONFIG_TRANSFER: SpawnConfig = {
    name: 'transfer',
    body: [MOVE, WORK, CARRY,],
}