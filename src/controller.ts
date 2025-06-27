import {BaseRole, Builder, Harvester, Repairer, Transfer, Upgrader} from "./roles";
import {
    getClosestCmpFun,
    getEnergyContainerOfSpawn,
    getEnergyDropOfSpawn,
    getEnergySourceOfSpawn,
    getEnergyStorageOfSpawn,
    getSpawn,
    getSpawnStructureNotFull,
    trySpawn,
} from "./utils";

export abstract class WorkerController<ROLE extends BaseRole<STARTER, TARGET>, STARTER, TARGET> {
    protected abstract get roleInstanceMax(): number;

    protected abstract get roleName(): string;

    protected abstract get roleBody(): BodyPartConstant[];

    protected abstract createRole(creep: Creep): ROLE;

    protected abstract findWorkStarter(): STARTER | undefined;

    protected abstract findWorkTarget(): TARGET | undefined;

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

export class HarvestController extends WorkerController<Harvester, Source, Structure> {
    protected get roleInstanceMax(): number {
        return 3;
    }

    protected get roleName(): string {
        return 'harvester';
    }

    protected get roleBody(): BodyPartConstant[] {
        return [MOVE, WORK, CARRY];
    }

    findWorkStarter(): Source | undefined {
        return getEnergySourceOfSpawn();
    }

    // todo 收获者角色需要拆分，收获者仅挖矿并存到附近容器，另建孵化辅助兜底角色挖矿、捡矿并运输至孵化器
    findWorkTarget(): Structure | undefined {
        const starter = this.findWorkStarter();
        if (!starter) return;
        return starter.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: it => it.structureType === STRUCTURE_CONTAINER
            }).filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                .sort(getClosestCmpFun(starter))[0]
            // 收获者在没有容器时，运送回孵化器
            ?? getSpawnStructureNotFull(starter);
    }

    createRole(creep: Creep): Harvester {
        return new Harvester(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}

export class BuildController extends WorkerController<Builder, Ruin | StructureStorage | StructureContainer | Source, ConstructionSite> {
    protected get roleInstanceMax(): number {
        return 5;
    }

    protected get roleName(): string {
        return 'builder';
    }

    protected get roleBody(): BodyPartConstant[] {
        return [MOVE, WORK, CARRY, CARRY];
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

const BODY_TRANSFER = [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY,];

abstract class BaseTransferController extends WorkerController<Transfer, Structure | Ruin, Structure> {
    protected get roleInstanceMax(): number {
        return 1;
    }

    protected get roleBody(): BodyPartConstant[] {
        return BODY_TRANSFER;
    }

    protected override findWorkStarter(): Structure | Ruin | undefined {
        const target = this.findWorkTarget();
        if (!target) return;

        const highLevelRes = [getEnergyDropOfSpawn(target)// 优先散落的资源
            , getEnergyStorageOfSpawn(true, target)]
            .sort(getClosestCmpFun(target))
            [0];
        return highLevelRes ?? getEnergyContainerOfSpawn(true, target);
    }

    protected override createRole(creep: Creep): Transfer {
        return new Transfer(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}

// 这个角色不太好，应该有一个专门的孵化辅助者，可运输可挖矿
export class SpawnTransferController extends BaseTransferController {

    protected get roleName(): string {
        return "spawnTransfer";
    }

    override findWorkTarget(): Structure | undefined {
        return getSpawnStructureNotFull(getSpawn());
    }

    protected get mustKeepAlive(): boolean {
        return true;
    }
}

export class ContainerTransferController extends BaseTransferController {
    protected get roleInstanceMax(): number {
        return 2;
    }

    protected get roleName(): string {
        return "containerTransfer";
    }

    protected get roleBody(): BodyPartConstant[] {
        return BODY_TRANSFER;
    }

    protected createRole(creep: Creep): Transfer {
        return new Transfer(creep, this.findWorkStarter(), this.findWorkTarget());
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

export class StorageTransferController extends BaseTransferController {
    protected get roleInstanceMax(): number {
        return 6;
    }

    protected get roleName(): string {
        return 'storageTransfer';
    }

    protected override findWorkStarter(): Structure | Ruin | undefined {
        const target = this.findWorkTarget();
        if (!target) return;

        return this.nearMiningContainer(target) ?? getEnergyDropOfSpawn(target);
    }

    private nearMiningContainer(target: Structure) {
        // 最近的矿点容器
        return getSpawn().room.find(FIND_SOURCES)
            .map(source => source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: it =>
                    it.structureType === STRUCTURE_CONTAINER && it.store.getUsedCapacity(RESOURCE_ENERGY) > 150
            }))
            .reduce((previousValue, currentValue) => {
                previousValue.push(...currentValue)
                return previousValue;
            })
            .filter(it => !!it)
            .sort(getClosestCmpFun(target))
            [0];
    }

    protected findWorkTarget(): Structure | undefined {
        return getSpawn().room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_STORAGE
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            .sort(getClosestCmpFun(getSpawn()))
            [0];
    }

}

export class TowerTransferController extends BaseTransferController {
    protected get roleInstanceMax(): number {
        return 1;
    }

    protected get roleName(): string {
        return 'towerTransfer';
    }

    protected findWorkTarget(): Structure | undefined {
        return getSpawn().room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_TOWER
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 100)
            .sort(getClosestCmpFun(getSpawn()))
            [0];
    }
}

export class UpgradeController extends WorkerController<Upgrader, Ruin | StructureStorage | StructureContainer, StructureController | undefined> {
    protected get roleInstanceMax(): number {
        return 10;
    }

    protected get roleName(): string {
        return 'upgrader';
    }

    protected get roleBody(): BodyPartConstant[] {
        return [MOVE, WORK, CARRY, CARRY, CARRY];
    }

    // 最近的废墟、容器、仓库
    findWorkStarter(): Ruin | StructureStorage | StructureContainer | undefined {
        const target = this.findWorkTarget();
        if (!target) return;
        const ruins = target.room.find(FIND_RUINS, {
            filter: it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });
        const structures = target.room.find(FIND_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_CONTAINER || it.structureType === STRUCTURE_STORAGE
        }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0);

        const arr: (Ruin | StructureStorage | StructureContainer)[] = [...ruins, ...structures]
        return arr.sort(getClosestCmpFun(target))[0];
    }

    findWorkTarget(): StructureController | undefined {
        return getSpawn().room.controller;
    }

    createRole(creep: Creep): Upgrader {
        return new Upgrader(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}

export class RepairController extends WorkerController<Repairer, Ruin | StructureStorage | StructureContainer, Structure> {
    protected get roleInstanceMax(): number {
        return 1;
    }

    protected get roleName(): string {
        return 'repairer';
    }

    protected get roleBody(): BodyPartConstant[] {
        return [MOVE, MOVE, WORK, CARRY, CARRY];
    }

    findWorkStarter(): Ruin | StructureStorage | StructureContainer | undefined {
        return getEnergyDropOfSpawn() ?? getEnergyStorageOfSpawn() ?? getEnergyContainerOfSpawn();
    }

    findWorkTarget(): Structure | undefined {
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
