// 动态Body配置管理器 - 根据房间能量容量生成最优body配置

import {ROLE_SPAWN_ASSISTANT} from "../constants";

export interface BodyTemplate {
    // 基础部件比例配置
    work?: number;
    carry?: number;
    move?: number;
    attack?: number;
    ranged_attack?: number;
    heal?: number;
    tough?: number;
    claim?: number;
}

export interface BodyProfile {
    name: string;
    template: BodyTemplate;
    minEnergy: number;    // 最小能量需求
    maxParts: number;     // 最大部件数量限制
    priorityOrder: BodyPartConstant[]; // 部件优先级顺序
}

export class BodyConfigManager {

    // 能量使用上限配置 - 避免生成过大的body
    private static readonly ENERGY_LIMITS: { [role: string]: number } = {
        worker: 1600,      // 16个work部件的合理上限
        transporter: 1200, // 运输者不需要太大
        builder: 1200,     // 建造者适中即可
        upgrader: 1800,    // 升级者可以稍大，提升效率
        harvester: 1000,   // 采集者适中
        repairer: 1000,    // 维修者适中
        miner: 1500       // 矿工可以稍大
    };

    // 预定义的角色body配置模板
    private static readonly BODY_PROFILES: { [role: string]: BodyProfile } = {
        // 工作者角色 - 采集、建造、升级
        worker: {
            name: 'worker',
            template: {work: 5, carry: 1, move: 5},
            minEnergy: 350,  // 1W + 1C + 2M 的最小配置
            maxParts: 50,
            priorityOrder: [WORK, CARRY, MOVE]
        },

        // 运输者角色 - 资源搬运
        transporter: {
            name: 'transporter',
            template: {carry: 2, move: 3},
            minEnergy: 250,  // 2C + 3M 的最小配置
            maxParts: 50,
            priorityOrder: [CARRY, MOVE]
        },

        // 建造者角色 - 专注建造
        builder: {
            name: 'builder',
            template: {work: 1, carry: 2, move: 2},
            minEnergy: 300,  // 1W + 2C + 2M
            maxParts: 50,
            priorityOrder: [WORK, CARRY, MOVE]
        },

        // 升级者角色 - 专注升级
        upgrader: {
            name: 'upgrader',
            template: {work: 3, carry: 1, move: 2},
            minEnergy: 450,  // 3W + 1C + 2M
            maxParts: 50,
            priorityOrder: [WORK, CARRY, MOVE]
        },

        // 采集者角色 - 专注采集
        harvester: {
            name: 'harvester',
            template: {work: 2, carry: 1, move: 1},
            minEnergy: 300,  // 2W + 1C + 1M
            maxParts: 50,
            priorityOrder: [WORK, CARRY, MOVE]
        },

        // 维修者角色 - 维修建筑
        repairer: {
            name: 'repairer',
            template: {work: 1, carry: 1, move: 2},
            minEnergy: 250,  // 1W + 1C + 2M
            maxParts: 50,
            priorityOrder: [WORK, CARRY, MOVE]
        },

        // 矿工角色 - 开采矿物
        miner: {
            name: 'miner',
            template: {work: 3, carry: 1, move: 2},
            minEnergy: 450,
            maxParts: 50,
            priorityOrder: [WORK, CARRY, MOVE]
        }
    };

    /**
     * 根据角色和房间能量容量生成最优body配置
     */
    static getOptimalBody(role: string, body: BodyPartConstant[], room: Room): BodyPartConstant[] {
        const availableEnergy = this.getAvailableEnergy(room, role);
        // 如果预设模板可以满足，则直接使用
        let bodyCost = this.calculateUnitCost2(body);
        if (bodyCost <= availableEnergy) {
            console.log(`${role}使用预设模板`);
            return body;
        }

        let profile = this.getBodyProfile(role);
        if (!profile) {
            console.log(`⚠️ 未找到角色 ${role} 的body配置模板，使用默认worker配置`);
            profile = BodyConfigManager.BODY_PROFILES['worker'];
        }


        // 如果能量不足最小需求，返回空body
        if (availableEnergy < profile.minEnergy) {
            console.log(`❌ 房间 ${room.name} 能量不足: 需要${profile.minEnergy}, 可用${availableEnergy}`);
            return [];
        }

        return this.generateBody(profile, availableEnergy);
    }

    /**
     * 获取房间可用能量（应用角色能量上限）
     */
    private static getAvailableEnergy(room: Room, role: string): number {
        let assistant = room.find(FIND_MY_CREEPS, {
            filter: it => it.memory.role === ROLE_SPAWN_ASSISTANT
        })[0];

        // 基础可用能量
        let baseEnergy: number;
        if (assistant) {
            baseEnergy = room.energyCapacityAvailable;
        } else {
            baseEnergy = room.energyAvailable;
        }

        // 应用角色特定的能量上限
        const profile = this.getBodyProfile(role);
        const profileKey = profile?.name || 'worker';
        const energyLimit = this.ENERGY_LIMITS[profileKey] || 1200; // 默认上限1200

        const finalEnergy = Math.min(baseEnergy, energyLimit);

        // 记录能量限制应用情况
        if (baseEnergy > energyLimit) {
            console.log(`🔒 角色 ${role} 能量限制: ${baseEnergy} -> ${finalEnergy} (上限${energyLimit})`);
        }

        return finalEnergy;
    }

    /**
     * 根据具体能量值生成body
     */
    static getBodyForEnergy(role: string, energyCapacity: number): BodyPartConstant[] {
        const profile = this.getBodyProfile(role);
        if (!profile) {
            console.log(`⚠️ 未找到角色 ${role} 的body配置模板`);
            return [];
        }

        if (energyCapacity < profile.minEnergy) {
            return [];
        }

        return this.generateBody(profile, energyCapacity);
    }

    /**
     * 获取角色的body配置模板
     */
    private static getBodyProfile(role: string): BodyProfile | null {
        // 角色名映射处理
        const roleMapping: { [key: string]: string } = {
            'harvester': 'harvester',
            'upgrader': 'upgrader',
            'builder': 'builder',
            'repairer': 'repairer',
            'miner': 'miner',
            'spawn_assistant': 'transporter',
            'container_2_storage_transfer': 'transporter',
            'storage_2_tower_transfer': 'transporter',
            'storage_2_controller_container_transfer': 'transporter',
            'sweep_2_storage_transfer': 'transporter',
            'harvester_far': 'harvester'
        };

        const profileKey = roleMapping[role] || 'worker';
        return this.BODY_PROFILES[profileKey] || null;
    }

    /**
     * 根据模板和能量限制生成具体的body配置
     */
    private static generateBody(profile: BodyProfile, energyCapacity: number): BodyPartConstant[] {
        const body: BodyPartConstant[] = [];
        let remainingEnergy = energyCapacity;
        let totalParts = 0;

        // 计算基础单元成本
        const unitCost = this.calculateUnitCost(profile.template);
        const maxUnits = Math.floor(Math.min(
            energyCapacity / unitCost,
            profile.maxParts / this.getTotalPartsInTemplate(profile.template)
        ));

        // 生成基础单元
        for (let i = 0; i < maxUnits && totalParts < profile.maxParts; i++) {
            const unit = this.createBodyUnit(profile.template);
            if (this.getBodyCost(unit) <= remainingEnergy && totalParts + unit.length <= profile.maxParts) {
                body.push(...unit);
                remainingEnergy -= this.getBodyCost(unit);
                totalParts += unit.length;
            } else {
                break;
            }
        }

        // 按优先级添加剩余部件
        while (remainingEnergy >= 50 && totalParts < profile.maxParts) {
            let addedPart = false;

            for (const partType of profile.priorityOrder) {
                const partCost = BODYPART_COST[partType];
                if (remainingEnergy >= partCost && totalParts < profile.maxParts) {
                    body.push(partType);
                    remainingEnergy -= partCost;
                    totalParts++;
                    addedPart = true;
                    break;
                }
            }

            if (!addedPart) break;
        }

        // 确保body有效性
        if (body.length === 0) {
            console.log(`❌ 无法为角色生成有效的body配置`);
            return [];
        }
        if (!body.find(it => it === MOVE)) {
            console.log(`❌ body配置没有MOVE`);
            return [];
        }

        // 记录生成的body信息
        const finalCost = this.getBodyCost(body);
        console.log(`✅ 生成 ${profile.name} body: ${body.length}部件, 消耗${finalCost}/${energyCapacity}能量`);
        console.log(`   配置: ${this.formatBodyString(body)}`);

        return body;
    }

    /**
     * 创建一个基础body单元
     */
    private static createBodyUnit(template: BodyTemplate): BodyPartConstant[] {
        const unit: BodyPartConstant[] = [];

        // 按模板比例添加部件
        if (template.work) {
            for (let i = 0; i < template.work; i++) unit.push(WORK);
        }
        if (template.carry) {
            for (let i = 0; i < template.carry; i++) unit.push(CARRY);
        }
        if (template.move) {
            for (let i = 0; i < template.move; i++) unit.push(MOVE);
        }
        if (template.attack) {
            for (let i = 0; i < template.attack; i++) unit.push(ATTACK);
        }
        if (template.ranged_attack) {
            for (let i = 0; i < template.ranged_attack; i++) unit.push(RANGED_ATTACK);
        }
        if (template.heal) {
            for (let i = 0; i < template.heal; i++) unit.push(HEAL);
        }
        if (template.tough) {
            for (let i = 0; i < template.tough; i++) unit.push(TOUGH);
        }
        if (template.claim) {
            for (let i = 0; i < template.claim; i++) unit.push(CLAIM);
        }

        return unit;
    }

    /**
     * 计算模板单元的成本
     */
    private static calculateUnitCost(template: BodyTemplate): number {
        let cost = 0;
        if (template.work) cost += template.work * BODYPART_COST[WORK];
        if (template.carry) cost += template.carry * BODYPART_COST[CARRY];
        if (template.move) cost += template.move * BODYPART_COST[MOVE];
        if (template.attack) cost += template.attack * BODYPART_COST[ATTACK];
        if (template.ranged_attack) cost += template.ranged_attack * BODYPART_COST[RANGED_ATTACK];
        if (template.heal) cost += template.heal * BODYPART_COST[HEAL];
        if (template.tough) cost += template.tough * BODYPART_COST[TOUGH];
        if (template.claim) cost += template.claim * BODYPART_COST[CLAIM];
        return cost;
    }

    private static calculateUnitCost2(template: BodyPartConstant[]): number {
        return template.map(it => BODYPART_COST[it])
            .reduce((a, b) => a + b, 0);
    }

    /**
     * 计算模板中总部件数
     */
    private static getTotalPartsInTemplate(template: BodyTemplate): number {
        return (template.work || 0) + (template.carry || 0) + (template.move || 0) +
            (template.attack || 0) + (template.ranged_attack || 0) + (template.heal || 0) +
            (template.tough || 0) + (template.claim || 0);
    }

    /**
     * 计算body配置的总成本
     */
    private static getBodyCost(body: BodyPartConstant[]): number {
        return body.reduce((cost, part) => cost + BODYPART_COST[part], 0);
    }

    /**
     * 格式化body字符串用于显示
     */
    private static formatBodyString(body: BodyPartConstant[]): string {
        const counts: { [key: string]: number } = {};
        body.forEach(part => counts[part] = (counts[part] || 0) + 1);

        return Object.entries(counts)
            .map(([part, count]) => `${count}${part[0]}`)
            .join(' ');
    }

    /**
     * 获取所有可用的body配置模板
     */
    static getAvailableProfiles(): string[] {
        return Object.keys(this.BODY_PROFILES);
    }

    /**
     * 预览指定能量下的body配置
     */
    static previewBody(role: string, energyCapacity: number): void {
        const body = this.getBodyForEnergy(role, energyCapacity);
        if (body.length > 0) {
            console.log(`${role} (${energyCapacity}能量): ${this.formatBodyString(body)} [成本:${this.getBodyCost(body)}]`);
        } else {
            console.log(`${role} (${energyCapacity}能量): 能量不足，无法生成body`);
        }
    }

    /**
     * 获取角色的能量上限
     */
    static getEnergyLimit(role: string): number {
        const profile = this.getBodyProfile(role);
        const profileKey = profile?.name || 'worker';
        return this.ENERGY_LIMITS[profileKey] || 1200;
    }

    /**
     * 设置角色的能量上限（运行时调整）
     */
    static setEnergyLimit(role: string, limit: number): void {
        const profile = this.getBodyProfile(role);
        const profileKey = profile?.name || 'worker';
        (this.ENERGY_LIMITS as any)[profileKey] = limit;
        console.log(`✅ 设置 ${role}(${profileKey}) 能量上限为 ${limit}`);
    }

    /**
     * 显示所有角色的能量上限
     */
    static showEnergyLimits(): void {
        console.log('=== 角色能量上限配置 ===');
        for (const [profileKey, limit] of Object.entries(this.ENERGY_LIMITS)) {
            console.log(`${profileKey}: ${limit} 能量`);
        }
    }

    /**
     * 批量预览所有角色在指定能量下的配置
     */
    static previewAllRoles(energyCapacity: number): void {
        console.log(`=== 角色Body预览 (${energyCapacity}能量) ===`);
        const roles = ['harvester', 'upgrader', 'builder', 'repairer', 'miner', 'spawn_assistant'];
        for (const role of roles) {
            this.previewBody(role, energyCapacity);
        }
    }
}