import {
    BaseRole,
    Builder,
    Harvester,
    OverseaTransporter,
    Repairer,
    SpawnAssistant,
    Sweeper,
    Transfer,
    Upgrader
} from "./roles";
import {
    getClosestCmpFun,
    getClosestDroppedEnergy,
    getClosestEnergyStorable,
    getClosetTombstone,
    getEnergyContainerOfSpawn,
    getEnergyDropOfSpawn,
    getEnergySourceOfSpawn,
    getEnergyStorageOfSpawn,
    getSpawn,
    getSpawnStructureNotFull,
    ResourceWithdrawn,
    SpawnStruct,
    trySpawn,
} from "./utils";
import {ROLE_SPAWN_ASSISTANT} from "./constants";

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

export class SpawnAssistantController extends WorkerController<SpawnAssistant, Source | ResourceWithdrawn, SpawnStruct> {
    protected get roleInstanceMax(): number {
        return 2;
    }

    protected get roleName(): string {
        return ROLE_SPAWN_ASSISTANT;
    }

    protected get roleBody(): BodyPartConstant[] {
        return [MOVE, MOVE, CARRY, CARRY, WORK];
    }

    protected createRole(creep: Creep): SpawnAssistant {
        return new SpawnAssistant(creep, this.findWorkStarter(), this.findWorkTarget());
    }

    protected findWorkStarter(): Source | ResourceWithdrawn | null {
        return getEnergyStorageOfSpawn()
            ?? getEnergyDropOfSpawn()
            ?? getEnergyContainerOfSpawn()
            ?? getEnergySourceOfSpawn();
    }

    protected findWorkTarget(): SpawnStruct | null {
        return getSpawnStructureNotFull(getSpawn().pos);
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
        return [MOVE, WORK, WORK, CARRY];
    }

    findWorkStarter(): Source | null {
        return getEnergySourceOfSpawn();
    }

    // todo 收获者角色需要拆分，收获者仅挖矿并存到附近容器，另建孵化辅助兜底角色挖矿、捡矿并运输至孵化器
    findWorkTarget(): Structure | null {
        const starter = this.findWorkStarter();
        if (!starter) return null;
        return starter.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: it => it.structureType === STRUCTURE_CONTAINER
            }).filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                .sort(getClosestCmpFun(starter))[0]
            // 收获者在没有容器时，运送回孵化器
            ?? getSpawnStructureNotFull(starter.pos);
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

    findWorkStarter(): Ruin | StructureStorage | StructureContainer | Source | null {
        const target = this.findWorkTarget();
        if (!target) return null;
        return getEnergyDropOfSpawn(target) ??
            getEnergyStorageOfSpawn(true, target) ??
            getEnergyContainerOfSpawn(true, target) ??
            getEnergySourceOfSpawn();
    }

    findWorkTarget(): ConstructionSite | null {
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

    protected override findWorkStarter(): Structure | Ruin | null {
        const target = this.findWorkTarget();
        if (!target) return null;

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

export class ContainerTransferController extends BaseTransferController {
    protected get roleInstanceMax(): number {
        return 0;
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

    protected findWorkTarget(): StructureContainer | null {
        // 控制器附近的容器
        const controller = getSpawn().room.controller;
        if (!controller) return null;
        return controller.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: it => it.structureType === STRUCTURE_CONTAINER
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            [0];
    }
}

export class StorageTransferController extends BaseTransferController {
    protected get roleInstanceMax(): number {
        return 2;
    }

    protected get roleName(): string {
        return 'storageTransfer';
    }

    protected override findWorkStarter(): Structure | Ruin | null {
        const target = this.findWorkTarget();
        if (!target) return null;

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

    protected findWorkTarget(): Structure | null {
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

    protected findWorkTarget(): Structure | null {
        return getSpawn().room.find(FIND_MY_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_TOWER
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 100)
            .sort(getClosestCmpFun(getSpawn()))
            [0];
    }
}

export class UpgradeController extends WorkerController<Upgrader, Ruin | StructureStorage | StructureContainer, StructureController | null> {
    protected get roleInstanceMax(): number {
        return 1;
    }

    protected get roleName(): string {
        return 'upgrader';
    }

    protected get roleBody(): BodyPartConstant[] {
        // const newVar = [WORK, WORK, WORK,];
        // const arr: BodyPartConstant[] = [CARRY, MOVE];
        // for (let i = 0; i < 3; i++) {
        //     arr.push(...newVar);
        // }
        // return arr;
        return [WORK, CARRY, MOVE];
    }

    // 最近的废墟、容器、仓库
    findWorkStarter(): Ruin | StructureStorage | StructureContainer | null {
        const target = this.findWorkTarget();
        if (!target) return null;

        return target.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: it => it.structureType === STRUCTURE_CONTAINER
        })

        // const ruins = target.room.find(FIND_RUINS, {
        //     filter: it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        // });
        // const structures = target.room.find(FIND_STRUCTURES, {
        //     filter: it => it.structureType === STRUCTURE_CONTAINER || it.structureType === STRUCTURE_STORAGE
        // }).filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
        //
        // const arr: (Ruin | StructureStorage | StructureContainer)[] = [...ruins, ...structures]
        // return arr.sort(getClosestCmpFun(target))[0];
    }

    findWorkTarget(): StructureController | null {
        return getSpawn().room.controller ?? null;
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

export class OverseaTransportController extends WorkerController<OverseaTransporter, RoomPosition, Structure> {
    protected get roleInstanceMax(): number {
        return 0;
    }

    protected get roleBody(): BodyPartConstant[] {
        const length = (300 + 50 * 10/*extension数量*/) / 50;
        return Array.from({length: length},
            (_, index) => index % 2 == 0 ? MOVE : CARRY);
    }

    protected createRole(creep: Creep): OverseaTransporter {
        return new OverseaTransporter(creep, this.findWorkStarter(), this.findWorkTarget());
    }

    protected findWorkStarter(): RoomPosition | null {
        // 隔壁遗址坐标
        return new RoomPosition(19, 19, 'W56S38');
    }

    protected findWorkTarget(): Structure | null {
        return getEnergyStorageOfSpawn();
    }

    protected get roleName(): string {
        return "overseaTransporter"
    }
}

export class SweepController extends WorkerController<Sweeper, RoomPosition, Structure> {
    protected get roleInstanceMax(): number {
        return 1;
    }

    protected get roleName(): string {
        return 'sweeper';
    }

    protected get roleBody(): BodyPartConstant[] {
        return BODY_TRANSFER;
    }

    protected createRole(creep: Creep): Sweeper {
        return new Sweeper(creep, this.findWorkStarter(), this.findWorkTarget());
    }

    protected findWorkStarter(): RoomPosition | null {
        return (
            getClosestDroppedEnergy(getSpawn())
            ?? getClosetTombstone(getSpawn().pos)
        )
            ?.pos ?? null;
    }

    protected findWorkTarget(): Structure | null {
        const starter = this.findWorkStarter();
        if (!starter) return null;
        return getClosestEnergyStorable(starter)
    }

    protected get canWork(): boolean {
        return !!this.findWorkStarter();
    }
}

export class LinkStartController extends BaseTransferController {
    protected get roleName(): string {
        return 'LinkStart';
    }

    protected findWorkTarget(): Structure<StructureConstant> | null {
        const start = this.findWorkStarter();
        if (!start) return null;
        return start.pos.findInRange(FIND_MY_STRUCTURES, 3, {
            filter: it => it.structureType === STRUCTURE_LINK
        }).filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            [0]
    }

    protected override findWorkStarter(): Structure | Ruin | null {
        return getEnergyStorageOfSpawn()
    }
}

export class LinkEndController extends BaseTransferController {

    protected get roleInstanceMax(): number {
        return 0;
    }

    protected get roleName(): string {
        return 'LinkEnd';
    }

    protected findWorkTarget(): Structure<StructureConstant> | null {
        const controller = getSpawn().room.controller;
        if (!controller) return null;
        return controller.pos.findInRange(FIND_STRUCTURES, 5, {
            filter: it => it.structureType === STRUCTURE_CONTAINER
        })
            .filter(it => it.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            [0];
    }

    protected override findWorkStarter(): Structure | Ruin | null {
        const controller = getSpawn().room.controller;
        if (!controller) return null;
        return controller.pos.findInRange(FIND_MY_STRUCTURES, 5, {
            filter: it => it.structureType === STRUCTURE_LINK
        })
            .filter(it => it.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            [0];
    }
}
