// 测试Memory持久化的简单脚本
// 可以在Screeps控制台中运行来验证Memory持久化

console.log('=== 测试远征系统Memory持久化 ===');

// 模拟Memory对象
if (!Memory.expeditions) {
    Memory.expeditions = {};
}

// 测试数据写入
console.log('1. 写入测试数据...');
Memory.expeditions['W10N10'] = {
    targetRoomName: 'W10N10',
    homeRoomName: 'W0N0',
    waypoints: ['W5N5'],
    currentPhase: 'claiming',
    phaseStartTick: Game.time,
    activeCreeps: {
        claiming: ['testClaimer_123'],
        upgrading: [],
        building: []
    }
};

console.log('2. 验证数据存在:', !!Memory.expeditions['W10N10']);
console.log('3. 任务数据:', JSON.stringify(Memory.expeditions['W10N10'], null, 2));

// 测试数据修改
console.log('4. 修改任务阶段...');
Memory.expeditions['W10N10'].currentPhase = 'upgrading';
Memory.expeditions['W10N10'].activeCreeps.upgrading.push('testUpgrader_456');

console.log('5. 验证修改生效:', Memory.expeditions['W10N10'].currentPhase);
console.log('6. 升级者列表:', Memory.expeditions['W10N10'].activeCreeps.upgrading);

// 测试数据删除
console.log('7. 删除测试数据...');
delete Memory.expeditions['W10N10'];
console.log('8. 验证删除成功:', !Memory.expeditions['W10N10']);

console.log('✅ Memory持久化测试完成');
console.log('📝 推送代码后Memory.expeditions将保持数据，而global对象会被重置');