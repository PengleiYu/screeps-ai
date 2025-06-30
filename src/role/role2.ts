import {findFlag, Positionable} from "../utils";
import {CanPutDown} from "../types";
import {EnergyAction, ParkingAction} from "./actions";
import {CreepContext} from "./base";

export const enum CreepState {
    NONE,
    HARVEST_SOURCE,
    WORK,
    PUT_BACK_SOURCE,
    // PARKING,
}


export abstract class StatefulRole<S extends Positionable, W extends Positionable> extends CreepContext {
    protected invalidAction = EnergyAction.invalidInstance;

    public constructor(creep: Creep) {
        super(creep);
    }

    private log(...data: any[]) {
        // console.log(this.creep.name, ...data);
    }

    abstract findSource(): EnergyAction<S> ;

    abstract findWorkTarget(): EnergyAction<W> ;

    abstract findSourceStoreSite(): EnergyAction<CanPutDown>;

    findParking(): EnergyAction<Positionable> {
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
        // 状态转移前的检查
        switch (target) {
            case CreepState.HARVEST_SOURCE:
                if (!this.findSource().isValid()) {
                    this.log('未找到source，无法进入目标状态', target);
                    return;
                }
                break;
            case CreepState.WORK:
                if (!this.findWorkTarget().isValid()) {
                    this.log('未找到workTarget，无法进入目标状态', target);
                    return;
                }
                break;
            default:
                break;
        }
        this.log('状态转移', this.state, '->', target);
        this._state = target;
    }

    interceptLifeCycle(): boolean {
        return this.findWorkTarget() === this.invalidAction;
    }

    private doHarvest() {
        if (this.isEnergyFull()) {
            this.moveState(CreepState.WORK);
            return;
        }
        const source = this.findSource();
        if (!source.isValid()) {
            this.moveState(!this.isEnergyEmpty() ? CreepState.WORK : CreepState.NONE);
            return;
        }
        source.action();
    }

    private doWork() {
        if (this.isEnergyEmpty()) {
            this.moveState(CreepState.NONE);
            return;
        }

        const target = this.findWorkTarget();
        if (!target.isValid()) {
            const state = CreepState.PUT_BACK_SOURCE;
            this.moveState(state);
            return;
        }
        target.action();
    }

    private doPutBackEnergy() {
        if (this.isEnergyEmpty()) {
            const state = CreepState.NONE;
            this.moveState(state);
            return;
        }
        const storeSite = this.findSourceStoreSite();
        if (!storeSite.isValid()) {
            this.moveState(CreepState.NONE);
            return;
        }
        storeSite.action();
    }

    private doParking() {
        const parking = this.findParking();
        if (!parking.isValid()) {
            this.moveState(CreepState.NONE);
            return;
        }
        parking.action();
    }

    private doNone() {
        if (this.interceptLifeCycle()) {
            this.log('拦截运行')
            return;
        } else {
            if (this.isEnergyFull()) {
                this.moveState(CreepState.WORK);
            } else if (this.findSource()) {
                this.moveState(CreepState.HARVEST_SOURCE);
            } else {
                this.doParking()
            }
        }
    }

    public run() {
        this.log('run', this.state);
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
