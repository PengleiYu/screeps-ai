// 测试动态Body配置系统
// 在游戏控制台中运行此测试

console.log('=== 动态Body配置系统测试 ===');

// 测试1: 显示能量上限配置
console.log('\n1. 能量上限配置:');
global.BodyConfigManager.showEnergyLimits();

// 测试2: 预览不同能量等级的body配置
console.log('\n2. 不同能量等级的body配置预览:');
const energyLevels = [300, 550, 800, 1200, 1800, 2400];
energyLevels.forEach(energy => {
    console.log(`\n--- ${energy}能量配置 ---`);
    global.BodyConfigManager.previewAllRoles(energy);
});

// 测试3: 测试能量限制功能
console.log('\n3. 能量限制测试:');
console.log('worker在不同能量下的配置:');
[800, 1200, 1600, 2000, 2400].forEach(energy => {
    global.BodyConfigManager.previewBody('worker', energy);
});

console.log('\nupgrader在不同能量下的配置:');
[800, 1200, 1600, 1800, 2400].forEach(energy => {
    global.BodyConfigManager.previewBody('upgrader', energy);
});

// 测试4: 测试角色映射
console.log('\n4. 角色映射测试:');
const testRoles = ['harvester', 'spawn_assistant', 'container_2_storage_transfer', 'unknown_role'];
testRoles.forEach(role => {
    const body = global.BodyConfigManager.getBodyForEnergy(role, 1200);
    console.log(`${role}: ${body.length > 0 ? '✅' : '❌'} ${body.length}部件`);
});

// 测试5: 能量上限调整测试
console.log('\n5. 运行时能量上限调整测试:');
console.log('调整前:');
global.BodyConfigManager.previewBody('worker', 2000);

console.log('设置worker能量上限为1000:');
global.BodyConfigManager.setEnergyLimit('worker', 1000);
global.BodyConfigManager.previewBody('worker', 2000);

console.log('恢复worker能量上限为1600:');
global.BodyConfigManager.setEnergyLimit('worker', 1600);

console.log('\n=== 测试完成 ===');