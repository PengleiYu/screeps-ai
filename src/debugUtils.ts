// Screeps Invader 调试工具 - TypeScript 版本

/**
 * 类型安全地获取 PowerCreep 的 powers
 */
function getPowerCreepPowers(powerCreep: PowerCreep): PowerConstant[] {
    // 获取所有有效的 PowerConstant 值
    const validPowerConstants: PowerConstant[] = [
        PWR_GENERATE_OPS, PWR_OPERATE_SPAWN, PWR_OPERATE_TOWER,
        PWR_OPERATE_STORAGE, PWR_OPERATE_LAB, PWR_OPERATE_EXTENSION,
        PWR_OPERATE_OBSERVER, PWR_OPERATE_TERMINAL, PWR_DISRUPT_SPAWN,
        PWR_DISRUPT_TOWER, PWR_DISRUPT_SOURCE, PWR_SHIELD,
        PWR_REGEN_SOURCE, PWR_REGEN_MINERAL, PWR_DISRUPT_TERMINAL,
        PWR_OPERATE_POWER, PWR_FORTIFY, PWR_OPERATE_CONTROLLER
    ];

    // 过滤出 powerCreep 实际拥有的 powers
    return validPowerConstants.filter(power => power in powerCreep.powers);
}

interface CreepInfo {
    name: string;
    owner: string;
    pos: RoomPosition;
    id: Id<Creep | PowerCreep>;
    type: 'creep' | 'powerCreep';
    body?: BodyPartDefinition[];
    powers?: PowerConstant[];
}

interface InvaderCoreInfo {
    id: Id<StructureInvaderCore>;
    pos: RoomPosition;
    level: number;
    effects: RoomObjectEffect[];
    hits: number;
    hitsMax: number;
}

interface RoomScanResult {
    roomName: string;
    hasVision: boolean;
    totalCreeps: number;
    myCreeps: number;
    hostileCreeps: number;
    invaders: CreepInfo[];
    powerCreeps: number;
    hostilePowerCreeps: number;
    powerInvaders: CreepInfo[];
    invaderCores: InvaderCoreInfo[];  // 新增：入侵者核心
    cpuUsed: number;
}

interface FindCheck {
    name: string;
    constant: FindConstant;
    description: string;
}

/**
 * 将 Creep 或 PowerCreep 转换为 CreepInfo
 */
function toCreepInfo(unit: Creep | PowerCreep): CreepInfo {
    // 使用 instanceof 判断类型
    const isCreep = unit instanceof Creep;

    return {
        name: unit.name,
        owner: unit.owner.username,
        pos: unit.pos,
        id: unit.id as Id<Creep | PowerCreep>,
        type: isCreep ? 'creep' : 'powerCreep',
        body: isCreep ? unit.body : undefined,
        powers: !isCreep ? getPowerCreepPowers(unit as PowerCreep) : undefined
    };
}

/**
 * 详细的 Invader 调试函数
 */
export function debugInvaderIssue(roomName: string): RoomScanResult {
    const startCpu = Game.cpu.getUsed();

    console.log(`🔍 === 调试 Invader 问题 - 房间 ${roomName} ===`);
    console.log(`⏰ 游戏时间: ${Game.time}`);
    console.log(`🖥️ CPU 当前使用: ${startCpu.toFixed(2)}`);

    const result: RoomScanResult = {
        roomName,
        hasVision: false,
        totalCreeps: 0,
        myCreeps: 0,
        hostileCreeps: 0,
        invaders: [],
        powerCreeps: 0,
        hostilePowerCreeps: 0,
        powerInvaders: [],
        invaderCores: [],  // 初始化入侵者核心数组
        cpuUsed: 0
    };

    // 检查房间是否存在
    const room: Room | undefined = Game.rooms[roomName];
    if (!room) {
        console.log('❌ 房间对象不存在 - 可能没有视野');
        console.log('💡 确保有 creep 或建筑在该房间中以获得视野');
        result.cpuUsed = Game.cpu.getUsed() - startCpu;
        return result;
    }

    result.hasVision = true;
    console.log('✅ 房间对象存在，有视野');

    // 检查房间控制器信息
    if (room.controller) {
        const controllerInfo = room.controller.owner
            ? `${room.controller.owner.username} (等级 ${room.controller.level})`
            : room.controller.reservation
                ? `预定: ${room.controller.reservation.username} (${room.controller.reservation.ticksToEnd} ticks)`
                : '中立';
        console.log(`🏛️ 房间控制器: ${controllerInfo}`);
    } else {
        console.log('🚫 房间无控制器 (可能是 SK 房间或高速公路)');
    }

    // 定义要检查的类型
    const checks: FindCheck[] = [
        {name: 'FIND_CREEPS', constant: FIND_CREEPS, description: '所有 creeps'},
        {name: 'FIND_MY_CREEPS', constant: FIND_MY_CREEPS, description: '我的 creeps'},
        {name: 'FIND_HOSTILE_CREEPS', constant: FIND_HOSTILE_CREEPS, description: '敌对 creeps'},
        {name: 'FIND_POWER_CREEPS', constant: FIND_POWER_CREEPS, description: '所有 power creeps'},
        {name: 'FIND_HOSTILE_POWER_CREEPS', constant: FIND_HOSTILE_POWER_CREEPS, description: '敌对 power creeps'},
        {name: 'FIND_HOSTILE_STRUCTURES', constant: FIND_HOSTILE_STRUCTURES, description: '敌对建筑'}
    ];

    console.log('\n📊 === 房间扫描结果 ===');

    // 首先检查入侵者核心
    const invaderCores = room.find(FIND_HOSTILE_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_INVADER_CORE
    }) as StructureInvaderCore[];

    result.invaderCores = invaderCores.map(core => ({
        id: core.id,
        pos: core.pos,
        level: core.level,
        effects: core.effects || [],
        hits: core.hits,
        hitsMax: core.hitsMax
    }));

    if (invaderCores.length > 0) {
        console.log(`🎯 发现 ${invaderCores.length} 个 Invader Core:`);
        invaderCores.forEach((core, i) => {
            console.log(`  ${i + 1}. Invader Core 等级 ${core.level} @ (${core.pos.x},${core.pos.y})`);
            console.log(`     生命值: ${core.hits}/${core.hitsMax}`);
            if (core.effects && core.effects.length > 0) {
                console.log(`     效果: ${core.effects.map(e => `${e.effect} (${e.ticksRemaining} ticks)`).join(', ')}`);
            }
        });
        console.log('');
    }

    checks.forEach(check => {
        const results = room.find(check.constant);
        console.log(`${check.name}: ${results.length} 个 (${check.description})`);

        // 更新结果统计
        switch (check.constant) {
            case FIND_CREEPS:
                result.totalCreeps = results.length;
                break;
            case FIND_MY_CREEPS:
                result.myCreeps = results.length;
                break;
            case FIND_HOSTILE_CREEPS:
                result.hostileCreeps = results.length;
                break;
            case FIND_POWER_CREEPS:
                result.powerCreeps = results.length;
                break;
            case FIND_HOSTILE_POWER_CREEPS:
                result.hostilePowerCreeps = results.length;
                break;
        }

        if (results.length > 0) {
            results.forEach((obj, i: number) => {
                // 类型守卫确保是 Creep 或 PowerCreep
                if ('owner' in obj && obj.owner) {
                    const owner = obj.owner.username || 'unknown';
                    const pos = `(${obj.pos.x},${obj.pos.y})`;
                    console.log(`  ${i + 1}. ${(obj as any).name} - ${owner} - ${pos}`);

                    // 收集 Invader 信息
                    if (owner === 'Invader') {
                        const creepInfo = toCreepInfo(obj as Creep | PowerCreep);
                        if (check.constant === FIND_HOSTILE_CREEPS) {
                            result.invaders.push(creepInfo);
                        } else if (check.constant === FIND_HOSTILE_POWER_CREEPS) {
                            result.powerInvaders.push(creepInfo);
                        }
                    }
                }
            });
        }
    });

    // 详细的 Invader 分析
    const totalInvaders = result.invaders.length + result.powerInvaders.length;
    const totalInvaderCores = result.invaderCores.length;
    console.log(`\n🎯 === Invader 威胁分析 ===`);
    console.log(`📈 发现威胁:`);
    console.log(`  - 入侵者核心 (Invader Cores): ${totalInvaderCores}`);
    console.log(`  - 普通 Invader Creeps: ${result.invaders.length}`);
    console.log(`  - Invader Power Creeps: ${result.powerInvaders.length}`);
    console.log(`  - 总计 Invader 单位: ${totalInvaders}`);

    if (totalInvaderCores > 0) {
        console.log('\n🏗️ Invader Core 详情:');
        console.log('⚠️  这些是 NPC 结构，会预定房间控制器并阻止你采集资源！');
        result.invaderCores.forEach((core, i) => {
            const timeLeft = core.effects.find(e => e.effect === EFFECT_COLLAPSE_TIMER);
            console.log(`  ${i + 1}. 等级 ${core.level} @ (${core.pos.x},${core.pos.y})`);
            console.log(`     生命值: ${core.hits}/${core.hitsMax}`);
            if (timeLeft) {
                console.log(`     ⏰ 剩余时间: ${timeLeft.ticksRemaining} ticks`);
            }
        });
        console.log('\n💡 解决方案:');
        console.log('   1. 攻击并摧毁 Invader Core');
        console.log('   2. 等待其自然消失');
        console.log('   3. 寻找并摧毁该区域的 Stronghold（主要威胁源）');
    }

    if (result.invaders.length > 0) {
        console.log('\n🤖 普通 Invader Creeps 详情:');
        result.invaders.forEach((invader, i) => {
            console.log(`  ${i + 1}. ${invader.name} @ (${invader.pos.x},${invader.pos.y})`);
            if (invader.body) {
                const bodyParts = invader.body.map(part => part.type).join(',');
                console.log(`     Body: ${bodyParts}`);
            }
        });
    }

    if (result.powerInvaders.length > 0) {
        console.log('\n⚡ Invader Power Creeps 详情:');
        result.powerInvaders.forEach((invader, i) => {
            console.log(`  ${i + 1}. ${invader.name} @ (${invader.pos.x},${invader.pos.y})`);
            if (invader.powers) {
                console.log(`     Powers: ${invader.powers.join(',')}`);
            }
        });
    }

    result.cpuUsed = Game.cpu.getUsed() - startCpu;
    console.log(`\n💻 调试完成，CPU 消耗: ${result.cpuUsed.toFixed(3)}`);

    return result;
}

/**
 * 手动地毯式搜索 Invaders (当 find 方法失效时使用)
 */
export function manualScanForInvaders(roomName: string): CreepInfo[] {
    const room: Room | undefined = Game.rooms[roomName];
    if (!room) {
        console.log(`❌ 无法访问房间 ${roomName}`);
        return [];
    }

    console.log(`🔍 开始手动扫描房间 ${roomName}...`);
    const startCpu = Game.cpu.getUsed();
    const invaders: CreepInfo[] = [];

    // 扫描整个房间 50x50
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
            const lookResult = room.lookAt(x, y);

            lookResult.forEach(item => {
                if (item.type === LOOK_CREEPS &&
                    item.creep!.owner.username === 'Invader') {
                    invaders.push(toCreepInfo(item.creep!));
                }
                if (item.type === LOOK_POWER_CREEPS &&
                    item.powerCreep!.owner.username === 'Invader') {
                    invaders.push(toCreepInfo(item.powerCreep!));
                }
            });
        }
    }

    const cpuUsed = Game.cpu.getUsed() - startCpu;
    console.log(`✅ 手动扫描完成，发现 ${invaders.length} 个 Invaders，CPU 消耗: ${cpuUsed.toFixed(3)}`);

    return invaders;
}

/**
 * 获取房间中所有 Invaders (结合多种方法)
 */
export function getAllInvaders(roomName: string): CreepInfo[] {
    const room: Room | undefined = Game.rooms[roomName];
    if (!room) {
        return [];
    }

    const invaders: CreepInfo[] = [];

    // 方法 1: 使用 find API
    const hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {
        filter: (creep: Creep) => creep.owner.username === 'Invader'
    });

    const hostilePowerCreeps = room.find(FIND_HOSTILE_POWER_CREEPS, {
        filter: (creep: PowerCreep) => creep.owner.username === 'Invader'
    });

    invaders.push(...hostileCreeps.map(toCreepInfo));
    invaders.push(...hostilePowerCreeps.map(toCreepInfo));

    return invaders;
}

/**
 * 专门检查房间中的 Invader Cores
 */
export function findInvaderCores(roomName: string): InvaderCoreInfo[] {
    const room: Room | undefined = Game.rooms[roomName];
    if (!room) {
        console.log(`❌ 无法访问房间 ${roomName}`);
        return [];
    }

    const invaderCores = room.find(FIND_HOSTILE_STRUCTURES, {
        filter: (structure): structure is StructureInvaderCore =>
            structure.structureType === STRUCTURE_INVADER_CORE
    });

    return invaderCores.map(core => ({
        id: core.id,
        pos: core.pos,
        level: core.level,
        effects: core.effects || [],
        hits: core.hits,
        hitsMax: core.hitsMax
    }));
}

/**
 * 检查房间是否被 Invader Core 预定
 */
export function isRoomReservedByInvaders(roomName: string): boolean {
    const room: Room | undefined = Game.rooms[roomName];
    if (!room || !room.controller) return false;

    return room.controller.reservation?.username === 'Invader';
}

/**
 * 获取房间的威胁等级
 */
export function getRoomThreatLevel(roomName: string): 'safe' | 'low' | 'medium' | 'high' | 'critical' {
    const room: Room | undefined = Game.rooms[roomName];
    if (!room) return 'safe';

    const invaderCores = findInvaderCores(roomName);
    const invaderCreeps = getAllInvaders(roomName);
    const isReserved = isRoomReservedByInvaders(roomName);

    if (invaderCores.length > 0) {
        const maxLevel = Math.max(...invaderCores.map(core => core.level));
        if (maxLevel >= 4) return 'critical';
        if (maxLevel >= 2) return 'high';
        return 'medium';
    }

    if (invaderCreeps.length > 3) return 'high';
    if (invaderCreeps.length > 0 || isReserved) return 'low';

    return 'safe';
}

// 使用示例:
/*
// 在 main.ts 中调用
import { debugInvaderIssue, getAllInvaders, quickInvaderCheck } from './invaderDebug';

// 详细调试
const debugResult = debugInvaderIssue('E15S25');

// 快速检查
if (quickInvaderCheck('E15S25')) {
    const invaders = getAllInvaders('E15S25');
    console.log(`发现 ${invaders.length} 个 Invaders`);
}
*/