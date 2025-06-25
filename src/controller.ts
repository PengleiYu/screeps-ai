import {BaseRole, Builder, CONFIG_BUILDER, CONFIG_HARVESTER, Harvester} from "./roles";
import {checkCreepExist, getSpawn, SpawnConfig} from "./utils";

export interface ControllerConfig {
    maxCount: number;

    createRole(creep: Creep): BaseRole<any, any>;

    initConfig: SpawnConfig;
}

abstract class Controller {

    protected constructor(protected maxCount: number, private initConfig: SpawnConfig) {
    }

    protected getSpawnConfigs(): SpawnConfig[] {
        return Array.from({length: this.maxCount},
            (_, index) => ({...this.initConfig, name: `${this.initConfig.name}${index}`}));
    }

    abstract createRole(creep: Creep): BaseRole<any, any>;

    abstract get canWork(): boolean;

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
        let spawnIfNotExist = true;
        for (const config of configs) {
            const creep = checkCreepExist(config, spawnIfNotExist);
            if (!creep) {
                spawnIfNotExist = false;
                continue;
            }
            this.createRole(creep).work();
        }
    }
}

export class HarvestController extends Controller {
    constructor() {
        super(3, CONFIG_HARVESTER);
    }

    createRole(creep: Creep): BaseRole<any, any> {
        return new Harvester(creep);
    }

    get canWork(): boolean {
        return true;
    }

}

export class BuildController extends Controller {
    constructor() {
        super(3, CONFIG_BUILDER);
    }

    createRole(creep: Creep): BaseRole<any, any> {
        return new Builder(creep);
    }

    get canWork(): boolean {
        const site = getSpawn().room.find(FIND_MY_CONSTRUCTION_SITES)[0];
        return !!site;
    }
}
