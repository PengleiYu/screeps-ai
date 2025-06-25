import {BaseRole, Builder, Harvester, Repairer, Transfer, Upgrader} from "./roles";
import {checkCreepExist, getSpawn, SpawnConfig} from "./utils";
import {
    TEMPLATE_CONFIG_BUILDER,
    TEMPLATE_CONFIG_HARVESTER,
    TEMPLATE_CONFIG_REPAIRER,
    TEMPLATE_CONFIG_TRANSFER,
    TEMPLATE_CONFIG_UPGRADER
} from "./configs";

// todo 泛型太多，source和target应该可以由role推导出来
export abstract class Controller<ROLE extends BaseRole<any, any>, SOURCE, TARGET> {
    static spawnIfNotExist = true;

    protected constructor(protected maxCount: number, private initConfig: SpawnConfig) {
    }

    protected getSpawnConfigs(): SpawnConfig[] {
        return Array.from({length: this.maxCount},
            (_, index) => ({...this.initConfig, name: `${this.initConfig.name}${index}`}));
    }

    protected closestCmpFun<
        T extends { pos: RoomPosition } | undefined,
        E extends { pos: RoomPosition } | undefined,
    >(center: T)
        : (a: E, b: E) => number {
        return (a, b) => {
            if (!center || !a || !b) return 0;
            return center.pos.getRangeTo(a) - center.pos.getRangeTo(b);
        };
    }

    protected abstract createRole(creep: Creep): ROLE;

    protected abstract findSource(): SOURCE;

    protected abstract findTarget(): TARGET;

    protected get canWork(): boolean {
        return true;
    }

    run() {
        const configs = this.getSpawnConfigs();
        // 不满足工作条件则休息
        if (!this.canWork) {
            for (const config of configs) {
                const creep = checkCreepExist(config, false);
                if (creep) this.createRole(creep).haveRest();
            }
            return
        }
        // 正常工作
        for (const config of configs) {
            const creep = checkCreepExist(config, Controller.spawnIfNotExist);
            if (!creep) {
                Controller.spawnIfNotExist = false;
                continue;
            }
            this.createRole(creep).work();
        }
    }
}

export class HarvestController extends Controller<Harvester, Source, Structure> {
    findSource(): Source {
        return getSpawn().room.find(FIND_SOURCES)[0];
    }

    findTarget(): Structure {
        return getSpawn().room.find(FIND_STRUCTURES,
                {filter: object => object.structureType === STRUCTURE_CONTAINER})
                .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                .sort(this.closestCmpFun(this.findSource()))[0]
            ?? getSpawn();
    }

    constructor() {
        super(3, TEMPLATE_CONFIG_HARVESTER);
    }

    createRole(creep: Creep): Harvester {
        return new Harvester(creep, this.findSource(), this.findTarget());
    }
}

export class BuildController extends Controller<Builder, Source | StructureContainer | undefined, ConstructionSite | undefined> {
    constructor() {
        super(3, TEMPLATE_CONFIG_BUILDER);
    }

    findSource(): Source | StructureContainer | undefined {
        let room = getSpawn().room;
        const containerArr = room.find(FIND_STRUCTURES, {
            filter: object =>
                object.structureType === STRUCTURE_CONTAINER,
        });
        // 没有容器则找原始资源
        if (!containerArr) return room.find(FIND_SOURCES)[-1];
        return containerArr.filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > -1)[0];
    }

    findTarget(): ConstructionSite | undefined {
        // 寻找工地
        return getSpawn().room.find(FIND_MY_CONSTRUCTION_SITES)
            .sort(this.closestCmpFun(this.findSource())) [0];
    }

    createRole(creep: Creep): Builder {
        return new Builder(creep, this.findSource(), this.findTarget());
    }

    get canWork(): boolean {
        return !!this.findTarget();
    }
}

export class TransferController extends Controller<Transfer, StructureContainer, Structure> {

    constructor() {
        super(1, TEMPLATE_CONFIG_TRANSFER);
    }

    override findSource(): StructureContainer {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER
        }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort(this.closestCmpFun(getSpawn())) [0];
    }

    override findTarget(): Structure {
        const source = this.findSource();
        const room = getSpawn().room;
        // 优先查找孵化建筑
        const spawnStruct = room.find(FIND_MY_STRUCTURES, {
            filter: obj => obj.structureType === STRUCTURE_SPAWN || obj.structureType === STRUCTURE_EXTENSION
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            .sort(this.closestCmpFun(source)) [0];
        if (spawnStruct) return spawnStruct;

        // 其次查找存储建筑
        return room.find(FIND_MY_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_STORAGE
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            .sort(this.closestCmpFun(source))[0];
    }


    createRole(creep: Creep): Transfer {
        return new Transfer(creep, this.findSource(), this.findTarget());
    }
}

export class UpgradeController extends Controller<Upgrader, StructureContainer | undefined, StructureController | undefined> {

    constructor() {
        super(1, TEMPLATE_CONFIG_UPGRADER);
    }

    findSource(): StructureContainer | undefined {
        const target = this.findTarget();
        if (!target) return;
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER
        })
            .filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort(this.closestCmpFun(this.findTarget())) [0];
    }

    findTarget(): StructureController | undefined {
        return getSpawn().room.controller;
    }

    createRole(creep: Creep): Upgrader {
        return new Upgrader(creep, this.findSource(), this.findTarget());
    }
}

export class RepairController extends Controller<Repairer, StructureContainer, Structure> {
    constructor() {
        super(1, TEMPLATE_CONFIG_REPAIRER);
    }

    findSource(): StructureContainer {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.structureType === STRUCTURE_CONTAINER
        }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)[0];
    }

    findTarget(): Structure {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.hits < object.hitsMax
        }).sort((a, b) => a.hits - b.hits)[0];
    }


    protected createRole(creep: Creep): Repairer {
        return new Repairer(creep, this.findSource(), this.findTarget());
    }

    protected get canWork(): boolean {
        return !!this.findTarget();
    }
}
