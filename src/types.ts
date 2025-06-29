// 目前只考虑能量

// 带有store的类型

export type StructureWithSpawn =
    | StructureSpawn | StructureExtension;
export const STRUCTURE_WITH_SPAWN_CONST = [
    STRUCTURE_SPAWN, STRUCTURE_EXTENSION,
];
export type StructureHaveStoreNoSpawn =
    | StructureContainer | StructureStorage | StructureLink;
export const STRUCTURE_HAVE_STORE_NO_SPAWN_CONST = [
    STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK,
];
export type StructureHaveStore =
    | StructureWithSpawn
    | StructureHaveStoreNoSpawn;

export const STRUCTURE_HAVE_STORE_CONST = [
    ...STRUCTURE_WITH_SPAWN_CONST,
    ...STRUCTURE_HAVE_STORE_NO_SPAWN_CONST,
];


// 可获取能量的类型
export type CanHarvest = Source
export type CanWithdraw = StructureHaveStore | Tombstone | Ruin;
export type CanPickup = Resource<RESOURCE_ENERGY>

// 可存储能量的类型
export type CanPutDown = StructureHaveStore

// 可操作的类型
export type CanBuild = ConstructionSite;
export type CanUpgrade = StructureController;

// 大杂烩
export type ActionReturnCode = CreepActionReturnCode | ScreepsReturnCode

