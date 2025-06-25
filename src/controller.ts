import {BaseRole, Builder, CONFIG_BUILDER, CONFIG_HARVESTER, Harvester} from "./roles";
import {checkCreepExist, getSpawn, SpawnConfig} from "./utils";

export interface ControllerConfig {
    maxCount: number;

    createRole(creep: Creep): BaseRole<any, any>;

    initConfig: SpawnConfig;
}

abstract class Controller {
    private readonly config: ControllerConfig;

    protected constructor(config: ControllerConfig) {
        this.config = config;
    }

    abstract get canSpawn(): boolean;

    run() {
        if (!this.canSpawn) {
            return
        }
        const initConfig = this.config.initConfig;
        const configs = Array.from({length: this.config.maxCount},
            (_, index) => ({...initConfig, name: `${initConfig.name}${index}`}));
        let spawnIfNotExist = true;
        for (const config of configs) {
            const creep = checkCreepExist(config, spawnIfNotExist);
            if (!creep) {
                spawnIfNotExist = false;
                continue;
            }
            this.config.createRole(creep).work();
        }
    }
}

export class HarvestController extends Controller {
    get canSpawn(): boolean {
        return true;
    }

    constructor() {
        super({
            maxCount: 3,
            initConfig: CONFIG_HARVESTER,
            createRole: creep => new Harvester(creep)
        });
    }

}

export class BuildController extends Controller {
    constructor() {
        const config: ControllerConfig = {
            maxCount: 3,
            initConfig: CONFIG_BUILDER,
            createRole: creep => new Builder(creep),
        };
        super(config);
    }

    get canSpawn(): boolean {
        const site = getSpawn().room.find(FIND_MY_CONSTRUCTION_SITES)[0];
        return !!site;
    }
}
