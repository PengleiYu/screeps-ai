import {EVENT_LOOP_END, findFlag, loopEventBus, Positionable} from "../utils";
import {CanPutEnergy} from "../types";
import {EnergyAction, ParkingAction} from "./actions";
import {CreepContext} from "./base";

import {actionOfPutEnergy} from "./actionUtils";
import {closestCanPutDown} from "./findUtils";

export const enum CreepState {
    NONE = 'none',
    HARVEST_SOURCE = 'harvest',
    WORK = 'work',
    PUT_BACK_SOURCE = 'putBack',
    // PARKING,
}

// 用于监控状态机异常
class StateMonitor {
    private lastDispatchTick: number = 0;
    private cntDispatchSameTick: number = 0;

    constructor(private tag: string) {
        loopEventBus.once(EVENT_LOOP_END, (e) => {
            if (this.cntDispatchSameTick > 1) {
                console.log(tag, 'tick', this.lastDispatchTick, 'dispatch调用次数', this.cntDispatchSameTick);
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

    public constructor(creep: Creep) {
        super(creep);
        if (this.logEnable) this.monitor = new StateMonitor(creep.name);
    }

    abstract findSource(): EnergyAction<S> ;

    abstract findWorkTarget(): EnergyAction<W> ;

    protected findEnergyPutDown(): EnergyAction<CanPutEnergy> {
        return actionOfPutEnergy(this.creep, closestCanPutDown(this.creep.pos));
    }

    protected findParking(): EnergyAction<Positionable> {
        return new ParkingAction(this.creep, findFlag());
    }

    private get state(): CreepState {
        return this.creep.memory.lifeState ?? CreepState.NONE;
    }

    private set _state(state: CreepState) {
        this.creep.memory.lifeState = state;
    }

    private moveState(target: CreepState) {
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
        this.dispatch()
    }

    interceptLifeCycle(): boolean {
        return this.findWorkTarget() === this.invalidAction;
    }

    private doHarvest() {
        this.log('doHarvest');
        if (this.isEnergyFull()) {
            this.log('能量已满');
            this.moveState(CreepState.WORK);
            return;
        }
        const source = this.findSource();
        if (!source.isValid()) {
            this.log('source不合法');
            this.moveState(!this.isEnergyEmpty() ? CreepState.WORK : CreepState.NONE);
            return;
        }
        source.action();
    }

    private doWork() {
        this.log('doWork');
        if (this.isEnergyEmpty()) {
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
        if (this.isEnergyEmpty()) {
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
        const parking = this.findParking();
        if (!parking.isValid()) {
            this.log('parking无法运行');
            this.moveState(CreepState.NONE);
            return;
        }
        parking.action();
    }

    private doNone() {
        this.log('doNone');
        if (this.interceptLifeCycle()) {
            this.log('拦截运行')
            this.doParking();
            return;
        } else {
            if (this.isEnergyFull()) {
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

    // todo 好像creep未孵化完成，就在执行任务了
    public dispatch() {
        this.log('dispatch', this.state);
        this.monitor?.onDispatch();
        switch (this.state) {
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
