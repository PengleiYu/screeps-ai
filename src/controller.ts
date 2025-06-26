import {BaseRole, Builder, Harvester, Repairer, Transfer, Upgrader} from "./roles";
import {
    checkCreepExist,
    getClosestCmpFun,
    getEnergyContainerOfSpawn, getEnergyDropOfSpawn,
    getEnergySourceOfSpawn,
    getEnergyStorageOfSpawn,
    getSpawn,
    getSpawnStructureNotFull,
    SpawnConfig
} from "./utils";
import {
    TEMPLATE_CONFIG_BUILDER,
    TEMPLATE_CONFIG_HARVESTER,
    TEMPLATE_CONFIG_REPAIRER, TEMPLATE_CONFIG_TOWER_TRANSFER,
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
            console.log(`${this.initConfig.name}无法工作，开始休息`)
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
                if (!WorkerController.spawnIfNotExist) {
                    console.log(`欲孵化${config.name}失败`)
                }
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

export class BuildController extends WorkerController<Builder, Ruin | StructureStorage | StructureContainer | Source, ConstructionSite> {
    constructor() {
        super(3, TEMPLATE_CONFIG_BUILDER);
    }

    findWorkStarter(): Ruin | StructureStorage | StructureContainer | Source | undefined {
        const target = this.findWorkTarget();
        if (!target) return;
        return getEnergyDropOfSpawn(target) ??
            getEnergyStorageOfSpawn(true, target) ??
            getEnergyContainerOfSpawn(true, target) ??
            getEnergySourceOfSpawn();
    }

    findWorkTarget(): ConstructionSite | undefined {
        // 寻找工地
        return getSpawn().room.find(FIND_MY_CONSTRUCTION_SITES)
            .sort(getClosestCmpFun(getSpawn())) [0];
    }

    createRole(creep: Creep): Builder {
        return new Builder(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}

export class SpawnStorageTransferController extends WorkerController<Transfer, Structure | Ruin, Structure> {

    constructor() {
        super(1, TEMPLATE_CONFIG_TRANSFER);
    }

    override findWorkStarter(): StructureContainer | Ruin | undefined {
        // 优先散落的资源
        return getEnergyDropOfSpawn() ?? getEnergyContainerOfSpawn();
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

export class ContainerTransferController extends WorkerController<Transfer, Ruin | Structure, Structure> {
    protected createRole(creep: Creep): Transfer {
        return new Transfer(creep, this.findWorkStarter(), this.findWorkTarget());
    }

    protected findWorkStarter(): Structure<StructureConstant> | Ruin | undefined {
        const target = this.findWorkTarget();
        if (!target) return;
        return getEnergyDropOfSpawn(target) ?? getEnergyStorageOfSpawn(true, target);
    }

    protected findWorkTarget(): StructureContainer | undefined {
        // 控制器附近的容器
        const controller = getSpawn().room.controller;
        if (!controller) return;
        return controller.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: it => it.structureType === STRUCTURE_CONTAINER
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY))
            [0];
    }

}

export class TowerTransferController extends WorkerController<Transfer, Structure | Ruin, Structure> {
    constructor() {
        super(1, TEMPLATE_CONFIG_TOWER_TRANSFER);
    }

    protected createRole(creep: Creep): Transfer {
        return new Transfer(creep, this.findWorkStarter(), this.findWorkTarget());
    }

    protected findWorkStarter(): Structure<StructureConstant> | undefined {
        return getEnergyStorageOfSpawn();
    }

    protected findWorkTarget(): Structure<StructureConstant> | undefined {
        return getSpawn().room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_TOWER
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 200)
            .sort(getClosestCmpFun(this.findWorkStarter()))
            [0];
    }
}

export class UpgradeController extends WorkerController<Upgrader, Ruin | StructureStorage | StructureContainer, StructureController | undefined> {

    constructor() {
        super(5, TEMPLATE_CONFIG_UPGRADER);
    }

    findWorkStarter(): Ruin | StructureStorage | StructureContainer | undefined {
        const target = this.findWorkTarget();
        if (!target) return;
        return getEnergyDropOfSpawn(target)
            ?? getEnergyStorageOfSpawn(true, target)
            ?? getEnergyContainerOfSpawn(true, target);
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
