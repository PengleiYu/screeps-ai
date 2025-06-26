import {BaseRole, Builder, Harvester, Repairer, Transfer, Upgrader} from "./roles";
import {
    checkCreepExist,
    getClosestCmpFun,
    getEnergyContainerOfSpawn,
    getEnergyDropOfSpawn,
    getEnergySourceOfSpawn,
    getEnergyStorageOfSpawn,
    getSpawn,
    getSpawnStructureNotFull,
    SpawnConfig
} from "./utils";

export abstract class WorkerController<ROLE extends BaseRole<STARTER, TARGET>, STARTER, TARGET> {
    static spawnIfNotExist = true;

    protected getSpawnConfigs(): SpawnConfig[] {
        return Array.from({length: this.creepCount},
            (_, index) =>
                ({name: `${this.roleRootName}${index}`, body: this.roleBody, roleName: this.roleRootName}));
    }

    protected abstract get creepCount(): number;

    protected abstract get roleRootName(): string;

    protected abstract get roleBody(): BodyPartConstant[];

    protected abstract createRole(creep: Creep): ROLE;

    protected abstract findWorkStarter(): STARTER | undefined;

    protected abstract findWorkTarget(): TARGET | undefined;

    protected get canWork(): boolean {
        return !!this.findWorkTarget();
    }

    run() {
        const configs = this.getSpawnConfigs();
        this.checkRuntime();

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
                if (!WorkerController.spawnIfNotExist) {
                    console.log(`欲孵化${config.name}失败`)
                }
                WorkerController.spawnIfNotExist = false;
                continue;
            }
            this.createRole(creep).work();
        }
    }

    private checkRuntime() {
        const creepsByRole = Object.keys(Game.creeps)
            .map(key => Game.creeps[key])
            .filter(creep => creep.memory.role === this.roleRootName);
        const creepsByName = this.getSpawnConfigs().map(it => checkCreepExist(it, false))
            .filter(it => it !== undefined);
        if (creepsByRole.length !== 0 && creepsByName.length === 0) {
            console.log(`${this.roleRootName}类creep已全部增加role属性`);
        }
    }
}

export class HarvestController extends WorkerController<Harvester, Source, Structure> {
    protected get creepCount(): number {
        return 3;
    }

    protected get roleRootName(): string {
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
    protected get creepCount(): number {
        return 6;
    }

    protected get roleRootName(): string {
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
    protected get creepCount(): number {
        return 1;
    }

    protected get roleBody(): BodyPartConstant[] {
        return BODY_TRANSFER;
    }

    protected override findWorkStarter(): Structure | Ruin | undefined {
        const target = this.findWorkTarget();
        if (!target) return;
        return getEnergyDropOfSpawn(target)// 优先散落的资源
            ?? getEnergyStorageOfSpawn(true, target)
            ?? getEnergyContainerOfSpawn(true, target);
    }

    protected override createRole(creep: Creep): Transfer {
        return new Transfer(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}

// 这个角色不太好，应该有一个专门的孵化辅助者，可运输可挖矿
export class SpawnTransferController extends BaseTransferController {

    protected get roleRootName(): string {
        return "spawnTransfer";
    }

    override findWorkTarget(): Structure | undefined {
        return getSpawnStructureNotFull(getSpawn());
    }

    protected get canWork(): boolean {
        return true;// 需要确保一直存在
    }
}

export class ContainerTransferController extends BaseTransferController {
    protected get creepCount(): number {
        return 2;
    }

    protected get roleRootName(): string {
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

export class TowerTransferController extends BaseTransferController {
    protected get creepCount(): number {
        return 1;
    }

    protected get roleRootName(): string {
        return 'towerTransfer';
    }

    protected findWorkTarget(): Structure | undefined {
        return getSpawn().room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_TOWER
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            .sort(getClosestCmpFun(getSpawn()))
            [0];
    }
}

export class UpgradeController extends WorkerController<Upgrader, Ruin | StructureStorage | StructureContainer, StructureController | undefined> {
    protected get creepCount(): number {
        return 10;
    }

    protected get roleRootName(): string {
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

export class RepairController extends WorkerController<Repairer, StructureStorage | StructureContainer, Structure> {
    protected get creepCount(): number {
        return 1;
    }

    protected get roleRootName(): string {
        return 'repairer';
    }

    protected get roleBody(): BodyPartConstant[] {
        return [MOVE, WORK, CARRY];
    }

    findWorkStarter(): StructureStorage | StructureContainer | undefined {
        return getEnergyStorageOfSpawn() ?? getEnergyContainerOfSpawn();
    }

    findWorkTarget(): Structure | undefined {
        return getSpawn().room.find(FIND_STRUCTURES, {
            filter: it => it.structureType !== STRUCTURE_WALL && it.hits < it.hitsMax
        }).sort((a, b) => a.hits - b.hits)[0];
    }

    protected createRole(creep: Creep): Repairer {
        return new Repairer(creep, this.findWorkStarter(), this.findWorkTarget());
    }
}
