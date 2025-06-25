import {BaseRole, Builder, CONFIG_BUILDER, CONFIG_HARVESTER, Harvester} from "./roles";
import {checkCreepExist, getSpawn, SpawnConfig} from "./utils";

export interface ControllerConfig {
    maxCount: number;

    createRole(creep: Creep): BaseRole<any, any>;

    initConfig: SpawnConfig;
}

abstract class Controller {
    // todo 将config拆分为成员变量和方法，由子类提供
    private readonly config: ControllerConfig;

    protected constructor(config: ControllerConfig) {
        this.config = config;
    }

    abstract get canWork(): boolean;

    run() {
        const initConfig = this.config.initConfig;
        const configs = Array.from({length: this.config.maxCount},
            (_, index) => ({...initConfig, name: `${initConfig.name}${index}`}));
        if (!this.canWork) {
            for (const config of configs) {
                const creep = checkCreepExist(config, false);
                if (creep) this.config.createRole(creep).haveRest();
            }
            return
        }
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
    get canWork(): boolean {
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

    get canWork(): boolean {
        const site = getSpawn().room.find(FIND_MY_CONSTRUCTION_SITES)[0];
        return !!site;
    }
}
