# Screeps AI

一个使用 TypeScript 开发的 Screeps 游戏 AI 脚本项目。

## 关于 Screeps

[Screeps](https://screeps.com/) 是一个编程策略游戏，玩家需要编写 JavaScript/TypeScript 代码来控制游戏中的单位（creeps）进行资源采集、建造、战斗等操作。这是一个持续运行的 MMO 游戏，即使玩家离线，AI 代码也会继续运行。

## 项目特性

- 🤖 **智能角色系统** - 包含采集者、建造者、升级者、挖矿者、维修者等多种角色
- 🏗️ **模块化架构** - 控制器、角色、工具函数分离，易于维护
- 🔄 **事件驱动** - 使用事件总线进行组件间通信
- 🛡️ **防御系统** - 塔防控制和军队管理
- ⚡ **高效物流** - 智能的资源传输和存储管理，包含Link网络自动化
- 🔗 **Link网络管理** - 自动化Link能量传输，支持优先级分配
- 🛠️ **智能孵化** - 基于需求的条件化creep孵化，避免资源浪费
- 📊 **TypeScript 支持** - 完整的类型定义，开发体验更佳

## 项目结构

```
src/
├── main.ts              # 主循环入口
├── link/                # Link 网络管理
│   └── LinkManager.ts   # 智能Link传输系统
├── controller/          # 控制器模块
│   └── controller.ts   # 主要控制逻辑
├── role/                # 角色系统 (分层设计)
│   ├── base/            # 基础框架
│   │   ├── creepWrapper.ts    # Creep 包装器
│   │   ├── baseRoles.ts       # 基础角色类
│   │   ├── actionTypes.ts     # 行为类型定义
│   │   └── actionUtils.ts     # 行为工具函数
│   ├── core/            # 核心生产角色
│   │   ├── EnergyRole.ts      # 能量角色基类
│   │   ├── HarvestRole.ts     # 采集角色
│   │   ├── MinerRole.ts       # 矿工角色
│   │   ├── BuilderRole.ts     # 建造角色
│   │   └── UpgradeRole.ts     # 升级角色
│   ├── logistics/       # 物流转运角色
│   │   ├── BaseStorageTransferRole.ts  # 存储转运基类
│   │   ├── SpawnSupplierRole.ts        # 孵化供应角色
│   │   ├── ContainerToStorageRole.ts   # 容器到存储
│   │   ├── StorageToContainerRole.ts   # 存储到容器
│   │   ├── StorageToTowerRole.ts       # 存储到防御塔
│   │   └── SweepToStorageRole.ts       # 清扫转运
│   ├── maintenance/     # 维护管理角色
│   │   ├── RepairerRole.ts           # 专业修理角色
│   │   ├── CleanerRole.ts            # 清理角色
│   │   ├── RoadMaintenanceRole.ts    # 道路维护
│   │   └── WallMaintainerRole.ts     # 城墙维护
│   ├── military/        # 军事战斗角色
│   │   ├── AttackerRole.ts    # 攻击角色
│   │   ├── DefenderRole.ts    # 防御角色
│   │   ├── ScoutRole.ts       # 侦察角色
│   │   ├── GuardRole.ts       # 守卫角色
│   │   └── HealerRole.ts      # 治疗角色
│   ├── expansion/       # 扩张开发角色
│   │   ├── ClaimerRole.ts         # 占领角色
│   │   ├── ReserverRole.ts        # 预订角色
│   │   ├── RemoteHarvesterRole.ts # 远程采集
│   │   └── ColonizerRole.ts       # 殖民角色
│   ├── specialist/      # 专业特化角色
│   │   ├── PowerBankAttackerRole.ts  # PowerBank攻击
│   │   ├── PowerHaulerRole.ts        # Power运输
│   │   ├── DepositMinerRole.ts       # Deposit挖掘
│   │   ├── AlchemistRole.ts          # 实验室操作
│   │   └── TerminalOperatorRole.ts   # 终端贸易
│   ├── emergency/       # 应急角色
│   │   ├── EmergencyRepairerRole.ts  # 紧急维修
│   │   ├── EvacuatorRole.ts          # 撤离角色
│   │   └── DisasterResponseRole.ts   # 灾难响应
│   └── utils/           # 角色工具函数
│       └── findUtils.ts       # 查找工具
├── army.ts              # 军队和防御系统
├── utils.ts             # 通用工具函数
├── types.ts             # 类型定义
└── constants.ts         # 常量配置
```

## 安装和配置

### 1. 克隆项目

```bash
git clone https://github.com/PengleiYu/screeps-ai.git
cd screeps-ai
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Screeps 连接

在项目父目录中配置 `.screeps.json` 文件，内容如下：

```json
{
  "token": "<申请的token>",
  "branch": "<分支名>",
  "ptr": false
}
```

> **获取 Token**: 在 Screeps 游戏中访问 [Account/Auth Tokens](https://screeps.com/a/#!/account/auth-tokens) 页面申请 API token

## 使用方法

### 构建和部署

执行以下命令构建并推送代码到 Screeps 服务器：

```bash
npm run build
```

### 指定分支部署

推送到特定分支：

```bash
npm run build -- --branch=default
```

### 开发模式

启动文件监听，代码变更时自动重新构建：

```bash
npm run dev
```

### 游戏内调试

系统提供了丰富的调试工具，可在游戏控制台中使用：

```javascript
// Link网络调试
global.LinkManager.printLinksInfo('W1N1')        // 查看指定房间Link信息
global.LinkManager.printAllRoomsLinks()          // 查看所有房间Link信息
global.LinkManager.manageLinkNetwork('W1N1')     // 手动运行Link管理
global.LinkManager.clearCache()                  // 清空Link缓存
```

## 核心功能

### 角色管理
- **HarvestRole**: 自动采集能量和矿物
- **BuilderRole**: 建造和维修建筑
- **UpgradeRole**: 升级房间控制器
- **MinerRole**: 专业挖矿作业
- **RepairerRole**: 专业建筑维修角色

### 物流系统
- **ContainerToStorageRole**: 容器到存储的运输
- **StorageToContainerRole**: 存储到控制器容器运输
- **StorageToTowerRole**: 为防御塔补充能量
- **SweepToStorageRole**: 清理地面资源

### Link网络系统
- **LinkManager**: 智能Link网络管理
- **自动分类**: 源Link、控制器Link、存储Link智能识别
- **优先级传输**: 控制器优先，存储其次的能量分配
- **多房间支持**: 自动管理所有己方房间的Link网络
- **性能优化**: 10tick缓存机制，提升CPU效率

### 防御系统
- **TowerController**: 自动防御塔控制
- **智能维修**: 塔防和creep维修的协调管理

### 智能孵化系统
- **条件化孵化**: 基于实际需求判断是否孵化creep
- **资源优化**: 避免无意义的creep孵化，节约能量
- **动态调整**: 根据房间状态自动调整角色数量
- **多Spawn支持**: 智能选择可用的Spawn进行孵化

### 事件系统
- 基于事件总线的模块间通信
- 支持循环结束事件处理

## 开发指南

1. **添加新角色**: 在 `src/role/` 目录下创建新的角色类
2. **修改控制逻辑**: 编辑 `src/controller/controller.ts`
3. **调整常量**: 修改 `src/constants.ts` 中的配置
4. **添加工具函数**: 在 `src/utils.ts` 中添加通用功能
5. **Link网络调试**: 使用全局调试工具监控和管理Link传输
6. **孵化条件优化**: 在 `shouldSpawn()` 函数中添加角色特定的孵化条件

## 构建工具

项目使用 [Grunt](https://gruntjs.com/) 作为构建工具，配合 [grunt-screeps](https://github.com/screeps/grunt-screeps) 插件实现代码推送。

## 项目管理

📋 **GitHub Projects**: [ScreepsProject](https://github.com/users/PengleiYu/projects/2) - 查看开发进度和任务规划

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 许可证

ISC License