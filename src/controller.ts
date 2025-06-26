import {BaseRole, Builder, Harvester, Repairer, Transfer, Upgrader} from "./roles";
import {
    checkCreepExist,
    getClosestCmpFun,
    getEnergyContainerOfSpawn,
    getEnergySourceOfSpawn,
    getEnergyStorageOfSpawn,
    getSpawn, getSpawnStructureNotFull,
    SpawnConfig
} from "./utils";
import {
    TEMPLATE_CONFIG_BUILDER,
    TEMPLATE_CONFIG_HARVESTER,
    TEMPLATE_CONFIG_REPAIRER,
    TEMPLATE_CONFIG_TRANSFER,
    TEMPLATE_CONFIG_UPGRADER
} from "./configs";

export abstract class WorkerController<ROLE extends BaseRole<STARTER, TARGET>, STARTER, TARGET> {
    static spawnIfNotExist = true;

    protected constructor(protected maxCount: number, private initConfig: SpawnConfig) {
    }

    protected getSpawnConfigs(): SpawnConfig[] {
        return Array.from({length: this.maxCount},
            (_, index) => ({...this.initConfig, name: `${this.initConfig.name}${index}`}));
    }

    protected abstract createRole(creep: Creep): ROLE;

    protected abstract findWorkStarter(): STARTER | undefined;

    protected abstract findWorkTarget(): TARGET | undefined;

    protected get canWork(): boolean {
        return !!this.findWorkTarget();
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
            const creep = checkCreepExist(config, WorkerController.spawnIfNotExist);
            if (!creep) {
                WorkerController.spawnIfNotExist = false;
                continue;
            }
            this.createRole(creep).work();
        }
    }
}

export class HarvestController extends WorkerController<Harvester, Source, Structure> {
    constructor() {
        super(3, TEMPLATE_CONFIG_HARVESTER);
    }

    findWorkStarter(): Source | undefined {
        return getEnergySourceOfSpawn();
    }

    findWorkTarget(): Structure | undefined {
        return getEnergyContainerOfSpawn(false, this.findWorkStarter())
            ?? getSpawn();
    }

    createRole(creep: Creep): Harvester {
        return new Harvester(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}

export class BuildController extends WorkerController<Builder, StructureStorage | StructureContainer | Source, ConstructionSite> {
    constructor() {
        super(3, TEMPLATE_CONFIG_BUILDER);
    }

    findWorkStarter(): StructureStorage | StructureContainer | Source | undefined {
        return getEnergyStorageOfSpawn() ??
            getEnergyContainerOfSpawn() ??
            getEnergySourceOfSpawn();
    }

    findWorkTarget(): ConstructionSite | undefined {
        // 寻找工地
        return getSpawn().room.find(FIND_MY_CONSTRUCTION_SITES)
            .sort(getClosestCmpFun(this.findWorkStarter())) [0];
    }

    createRole(creep: Creep): Builder {
        return new Builder(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}

export class TransferController extends WorkerController<Transfer, StructureContainer, Structure> {

    constructor() {
        super(1, TEMPLATE_CONFIG_TRANSFER);
    }

    override findWorkStarter(): StructureContainer | undefined {
        return getEnergyContainerOfSpawn();
    }

    override findWorkTarget(): Structure | undefined {
        const source = this.findWorkStarter();
        if (!source) return;

        // 优先查找孵化建筑
        const spawnStruct = getSpawnStructureNotFull(source)
        if (spawnStruct) return spawnStruct;

        // 其次查找存储建筑
        return getEnergyStorageOfSpawn(false, source);
    }


    createRole(creep: Creep): Transfer {
        return new Transfer(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}

export class UpgradeController extends WorkerController<Upgrader, StructureStorage | StructureContainer, StructureController | undefined> {

    constructor() {
        super(1, TEMPLATE_CONFIG_UPGRADER);
    }

    findWorkStarter(): StructureStorage | StructureContainer | undefined {
        return getEnergyStorageOfSpawn() ?? getEnergyContainerOfSpawn();
    }

    findWorkTarget(): StructureController | undefined {
        return getSpawn().room.controller;
    }

    createRole(creep: Creep): Upgrader {
        return new Upgrader(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}

export class RepairController extends WorkerController<Repairer, StructureStorage | StructureContainer, Structure> {
    constructor() {
        super(1, TEMPLATE_CONFIG_REPAIRER);
    }

    findWorkStarter(): StructureStorage | StructureContainer | undefined {
        return getEnergyStorageOfSpawn() ?? getEnergyContainerOfSpawn();
    }

    findWorkTarget(): Structure | undefined {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: object => object.hits < object.hitsMax
        }).sort((a, b) => a.hits - b.hits)[0];
    }

    protected createRole(creep: Creep): Repairer {
        return new Repairer(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}
