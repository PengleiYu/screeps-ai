import {BaseRole, Repairer} from "./roles";
import {getEnergyContainerOfSpawn, getEnergyDropOfSpawn, getEnergyStorageOfSpawn, getSpawn, trySpawn,} from "./utils";

export abstract class WorkerController<ROLE extends BaseRole<STARTER, TARGET>, STARTER, TARGET> {
    protected abstract get roleInstanceMax(): number;

    protected abstract get roleName(): string;

    protected abstract get roleBody(): BodyPartConstant[];

    // todo 不应在创建时就指定起点和终点
    protected abstract createRole(creep: Creep): ROLE;

    protected abstract findWorkStarter(): STARTER | null;

    protected abstract findWorkTarget(): TARGET | null;

    protected get canWork(): boolean {
        return !!this.findWorkTarget();
    }

    protected get mustKeepAlive(): boolean {
        return false;
    }

    run() {
        const creeps = Object.keys(Game.creeps)
            .map(key => Game.creeps[key])
            .filter(creep => creep.memory.role === this.roleName);

        if (!this.canWork) {
            // 不满足工作条件则休息
            creeps.forEach(it => this.createRole(it).haveRest());
        } else {
            // 正常工作
            creeps.forEach(it => this.createRole(it).work());
        }

        if (this.mustKeepAlive || this.canWork) {
            // 数量不足则继续孵化
            const memory = {role: this.roleName};
            for (let i = creeps.length; i < this.roleInstanceMax; i++) {
                trySpawn(`${this.roleName}_${Date.now()}`, this.roleBody, memory);
            }
        }
    }
}

const ROLE_REPAIRER = 'repairer';

export class RepairController extends WorkerController<Repairer, Ruin | StructureStorage | StructureContainer, Structure> {
    protected get roleInstanceMax(): number {
        return 1;
    }

    protected get roleName(): string {
        return ROLE_REPAIRER;
    }

    protected get roleBody(): BodyPartConstant[] {
        return [MOVE, MOVE, WORK, CARRY, CARRY];
    }

    findWorkStarter(): Ruin | StructureStorage | StructureContainer | null {
        return getEnergyDropOfSpawn() ?? getEnergyStorageOfSpawn() ?? getEnergyContainerOfSpawn();
    }

    findWorkTarget(): Structure | null {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: it => it.structureType !== STRUCTURE_WALL && it.hits < it.hitsMax
        }).sort((a, b) => (a.hitsMax - a.hits) - (b.hitsMax - b.hits))
            .reverse()[0];
    }

    protected createRole(creep: Creep): Repairer {
        return new Repairer(creep, this.findWorkStarter(), this.findWorkTarget());
    }

    protected get canWork(): boolean {
        const tower = getSpawn().pos.findClosestByRange(FIND_MY_STRUCTURES, {
            filter: it =>
                // todo 暂定tower有能量即可，后续再改
                it.structureType === STRUCTURE_TOWER && it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });
        return !tower && super.canWork;
    }
}
