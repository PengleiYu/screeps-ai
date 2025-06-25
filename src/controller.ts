import {BaseRole, Builder, Harvester, Repairer, Transfer, Upgrader} from "./roles";
import {checkCreepExist, getSpawn, SpawnConfig} from "./utils";
import {
    TEMPLATE_CONFIG_BUILDER,
    TEMPLATE_CONFIG_HARVESTER,
    TEMPLATE_CONFIG_REPAIRER,
    TEMPLATE_CONFIG_TRANSFER,
    TEMPLATE_CONFIG_UPGRADER
} from "./configs";

export abstract class Controller<T extends BaseRole<any, any>> {
    static spawnIfNotExist = true;

    protected constructor(protected maxCount: number, private initConfig: SpawnConfig) {
    }

    protected getSpawnConfigs(): SpawnConfig[] {
        return Array.from({length: this.maxCount},
            (_, index) => ({...this.initConfig, name: `${this.initConfig.name}${index}`}));
    }

    protected abstract createRole(creep: Creep): T;

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

export class HarvestController extends Controller<Harvester> {
    constructor() {
        super(3, TEMPLATE_CONFIG_HARVESTER);
    }

    createRole(creep: Creep): Harvester {
        return new Harvester(creep);
    }
}

export class BuildController extends Controller<Builder> {
    constructor() {
        super(3, TEMPLATE_CONFIG_BUILDER);
    }

    createRole(creep: Creep): Builder {
        return new Builder(creep);
    }

    get canWork(): boolean {
        const site = getSpawn().room.find(FIND_MY_CONSTRUCTION_SITES)[0];
        return !!site;
    }
}

export class TransferController extends Controller<Transfer> {

    constructor() {
        super(1, TEMPLATE_CONFIG_TRANSFER);
    }

    createRole(creep: Creep): Transfer {
        return new Transfer(creep);
    }
}

export class UpgradeController extends Controller<Upgrader> {

    constructor() {
        super(3, TEMPLATE_CONFIG_UPGRADER);
    }

    createRole(creep: Creep): Upgrader {
        return new Upgrader(creep);
    }
}

export class RepairController extends Controller<Repairer> {
    constructor() {
        super(1, TEMPLATE_CONFIG_REPAIRER);
    }

    protected createRole(creep: Creep): Repairer {
        return new Repairer(creep);
    }
}
