import {EVENT_LOOP_END, findFlagPos, loopEventBus, Positionable} from "../../utils";
import {CanGetSource, CanPutSource, CanWork, MyPosition} from "../../types";
import {EnergyAction, MoveAction} from "./actionTypes";
import {CreepContext} from "./creepWrapper";

export const enum CreepState {
    INITIAL = "initial",
    NONE = 'none',
    HARVEST_SOURCE = 'harvest',
    WORK = 'work',
    PUT_BACK_SOURCE = 'putBack',
}

// 用于监控状态机异常
class StateMonitor {
    private lastDispatchTick: number = 0;
    private cntDispatchSameTick: number = 0;

    constructor(private tag: string) {
        loopEventBus.once(EVENT_LOOP_END, () => {
            if (this.cntDispatchSameTick > 1) {
                console.log(this.tag, 'tick', this.lastDispatchTick, 'dispatch调用次数', this.cntDispatchSameTick);
            }
        })
    }

    onDispatch() {
        if (Game.time == this.lastDispatchTick) {
            this.cntDispatchSameTick++;
            return;
        }

        this.lastDispatchTick = Game.time;
        this.cntDispatchSameTick = 0;
    }
}

// 状态机驱动的role
export abstract class StatefulRole<S extends Positionable, W extends Positionable> extends CreepContext {
    protected invalidAction = EnergyAction.invalidInstance;
    private monitor: StateMonitor | undefined;
    private moveStateCalledCnt = 0;

    public constructor(creep: Creep) {
        super(creep);
        if (this.logEnable) this.monitor = new StateMonitor(creep.name);
    }

    protected abstract findSource(): EnergyAction<S> ;

    protected abstract findWorkTarget(): EnergyAction<W> ;

    protected abstract isStoreFull(): boolean ;

    protected abstract isStoreEmpty(): boolean ;

    protected abstract findEnergyPutDown(): EnergyAction<CanPutSource> ;

    protected get state(): CreepState {
        return this.creep.memory.lifeState ?? CreepState.NONE;
    }

    private set _state(state: CreepState) {
        this.creep.memory.lifeState = state;
    }

    private moveState(target: CreepState) {
        if (this.moveStateCalledCnt > 10) {
            console.log('有问题，moveState调用次数过多', this.moveStateCalledCnt, this.creep.room.name, this.creep.name);
            return;
        }
        this.moveStateCalledCnt++;
        if (this.state === target) {
            return;
        }
        // 状态转移前的检查，目前不需要
        switch (target) {
            default:
                break;
        }
        this.log('状态转移', this.state, '->', target);
        this._state = target;
        // 这里必须调用，否则会浪费tick
        // 每种状态的执行必须放在最后，因为执行不是立即生效，所以执行后的检查没有意义
        this.dispatch();
    }

    protected onBeginWorkFlow(): void {
    }

    protected interceptLifeCycle(): boolean {
        return this.findWorkTarget() === this.invalidAction;
    }

    private doHarvest() {
        this.log('doHarvest');
        if (this.isStoreFull()) {
            this.log('能量已满');
            this.moveState(CreepState.WORK);
            return;
        }
        const source = this.findSource();
        if (!source.isValid()) {
            this.log('source不合法');
            this.moveState(!this.isStoreEmpty() ? CreepState.WORK : CreepState.NONE);
            return;
        }
        source.action();
    }

    private doWork() {
        this.log('doWork');
        if (this.isStoreEmpty()) {
            this.log('能量已空');
            this.moveState(CreepState.NONE);
            return;
        }

        const workTarget = this.findWorkTarget();
        if (!workTarget.isValid()) {
            this.log('workTarget不合法');
            this.moveState(CreepState.PUT_BACK_SOURCE);
            return;
        }
        workTarget.action();
    }

    private doPutBackEnergy() {
        this.log('doPutBackEnergy');
        if (this.isStoreEmpty()) {
            this.log('能量已空')
            this.moveState(CreepState.NONE);
            return;
        }
        const storeSite = this.findEnergyPutDown();
        if (!storeSite.isValid()) {
            this.log('能量存储点不合法')
            this.moveState(CreepState.NONE);
            return;
        }
        storeSite.action();
    }

    private doParking() {
        this.log('doParking')
        let flag = findFlagPos(this.creep.room);
        if (flag) {
            const parking = new MoveAction(this.creep, flag);
            if (parking.isValid()) {
                parking.action();
                return;
            }
        }
        this.log('parking无法运行');
        this.moveState(CreepState.NONE);
    }

    private doApproachTarget() {
        const target = this.getApproachTarget();
        this.log('doApproachTarget', target);
        if (target) {
            this.log('正在接近目标', target);
            const action = new MoveAction(this.creep, target);
            if (action.isValid()) {
                action.action();
                return;
            }
        }
        this.clearApproachTarget();
        this.moveState(CreepState.NONE);
    }

    private doNone() {
        this.log('doNone');
        this.onBeginWorkFlow();
        if (this.interceptLifeCycle()) {
            this.log('拦截运行')
            this.doParking();
            return;
        } else {
            if (this.isStoreFull()) {
                this.log('能量已满');
                this.moveState(CreepState.WORK);
            } else if (this.findSource().isValid()) {
                this.log('source合法');
                this.moveState(CreepState.HARVEST_SOURCE);
            } else {
                this.doParking()
            }
        }
    }

    public initialWithPosition(position: RoomPosition) {
        this.log('initialWithPosition', position);
        const memory = this.creep.memory;
        memory.targetPosition = MyPosition.fromRoomPosition(position).toJson();
        // 清除流程相关记忆
        memory.lastSourceId = undefined;
        memory.lastWorkId = undefined;
        this.moveState(CreepState.INITIAL);
    }

    public getApproachTarget(): RoomPosition | null {
        const position = this.creep.memory.targetPosition;
        if (!position) return null;
        return MyPosition.fromJson(position).toRoomPosition();
    }

    public clearApproachTarget() {
        let memory = this.creep.memory;
        if (memory.targetPosition) memory.targetPosition = undefined;
    }

    // todo 好像creep未孵化完成，就在执行任务了
    public dispatch() {
        this.log('dispatch', this.state);
        this.monitor?.onDispatch();
        switch (this.state) {
            case CreepState.INITIAL:
                this.doApproachTarget();
                break
            case CreepState.HARVEST_SOURCE:
                this.doHarvest();
                break;
            case CreepState.WORK:
                this.doWork()
                break;
            case CreepState.PUT_BACK_SOURCE:
                this.doPutBackEnergy()
                break;
            case CreepState.NONE:
            default:
                this.moveState(CreepState.NONE);
                this.doNone()
                break;
        }
    }
}

export abstract class MemoryRole extends StatefulRole<CanGetSource, CanPutSource | CanWork> {

// todo 如果work记忆被修改为其他合法目标会怎样？如何防御？
    findSource(): EnergyAction<CanGetSource> {
        if (!this.isSourceMemoryEnable()) {
            return this.canGetSource2Action(this.findCanGetSource());
        }
        const memorySource = this.getMemorySource();
        this.log('回忆source', memorySource);
        if (memorySource) {
            const result = this.canGetSource2Action(memorySource);
            if (result.isValid()) {
                this.log('回忆有效');
                return result;
            }
        }
        const result = this.canGetSource2Action(this.findCanGetSource());
        this.log('回忆无效，搜索到新source', result.target);
        if (result.isValid()) {
            this.log('记忆source');
            this.setMemorySource(result.target);
        } else {
            this.log('新source也无效');
        }
        return result;
    }

    findWorkTarget(): EnergyAction<CanWork | CanPutSource> {
        if (!this.isWorkMemoryEnable()) {
            return this.canWork2Action(this.findCanWork());
        }
        const memoryWork = this.getMemoryWork();
        this.log('回忆work', memoryWork);
        if (memoryWork) {
            const result = this.canWork2Action(memoryWork);
            if (result.isValid()) {
                this.log('回忆有效');
                return result;
            }
        }
        const result = this.canWork2Action(this.findCanWork());
        this.log('回忆无效，搜索到新work', result.target);
        if (this.state === CreepState.WORK && result.isValid()) {
            this.log('记忆work');
            this.setMemoryWork(result.target);
        } else {
            this.log('新work也无效');
        }
        return result;
    }

    protected abstract canWork2Action(canWork: CanWork | CanPutSource | null): EnergyAction<CanWork | CanPutSource>;

    protected abstract canGetSource2Action(canGet: CanGetSource | null): EnergyAction<CanGetSource>;

    protected abstract findCanWork(): CanWork | CanPutSource | null ;

    protected abstract findCanGetSource(): CanGetSource | null;

    protected onBeginWorkFlow() {
        this.log('新工作流开始，清除source和work记忆');
        const memory = this.creep.memory;
        if (memory.lastSourceId) {
            memory.lastSourceId = undefined;
        }
        if (memory.lastWorkId) {
            memory.lastWorkId = undefined;
        }
    }

// todo memory相关逻辑是否可以封装到单独对象中
    protected getMemoryWork(): CanWork | null {
        const lastSourceId = this.creep.memory.lastWorkId;
        if (!lastSourceId) return null;
        return Game.getObjectById(lastSourceId as Id<CanWork>);
    }

    protected setMemoryWork(work: CanWork | CanPutSource) {
        this.log('setMemoryWork', work, 'called');
        this.creep.memory.lastWorkId = work.id as Id<CanWork | CanPutSource>;
    }

    protected getMemorySource(): CanGetSource | null {
        const lastSourceId = this.creep.memory.lastSourceId;
        if (!lastSourceId) return null;
        return Game.getObjectById(lastSourceId);
    }

    protected setMemorySource(source: CanGetSource) {
        this.log('setMemorySource', source, 'called');
        this.creep.memory.lastSourceId = source.id;
    }

    protected isWorkMemoryEnable(): boolean {
        return true;
    }

    protected isSourceMemoryEnable(): boolean {
        return true;
    }
}
