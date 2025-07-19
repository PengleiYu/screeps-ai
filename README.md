# Screeps AI

一个使用 TypeScript 开发的 Screeps 游戏 AI 脚本项目。

## 关于 Screeps

[Screeps](https://screeps.com/) 是一个编程策略游戏，玩家需要编写 JavaScript/TypeScript 代码来控制游戏中的单位（creeps）进行资源采集、建造、战斗等操作。这是一个持续运行的 MMO 游戏，即使玩家离线，AI 代码也会继续运行。

## 项目特性

- 🤖 **智能角色系统** - 包含采集者、建造者、升级者、挖矿者等多种角色
- 🏗️ **模块化架构** - 控制器、角色、工具函数分离，易于维护
- 🔄 **事件驱动** - 使用事件总线进行组件间通信
- 🛡️ **防御系统** - 塔防控制和军队管理
- ⚡ **高效物流** - 智能的资源传输和存储管理
- 📊 **TypeScript 支持** - 完整的类型定义，开发体验更佳

## 项目结构

```
src/
├── main.ts              # 主循环入口
├── controller/          # 控制器模块
│   └── controller2.ts   # 主要控制逻辑
├── role/                # 角色定义
│   ├── HarvestRole.ts   # 采集角色
│   ├── BuilderRole.ts   # 建造角色
│   ├── UpgradeRole.ts   # 升级角色
│   └── ...              # 其他角色
├── army.ts              # 军队和防御系统
├── utils.ts             # 工具函数
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

## 核心功能

### 角色管理
- **HarvestRole**: 自动采集能量和矿物
- **BuilderRole**: 建造和维修建筑
- **UpgradeRole**: 升级房间控制器
- **MineRole**: 专业挖矿作业

### 物流系统
- **Container2StorageRole**: 容器到存储的运输
- **Storage2TowerRole**: 为防御塔补充能量
- **Sweep2StorageRole**: 清理地面资源

### 防御系统
- **TowerController**: 自动防御塔控制
- **RepairController**: 建筑维修管理

### 事件系统
- 基于事件总线的模块间通信
- 支持循环结束事件处理

## 开发指南

1. **添加新角色**: 在 `src/role/` 目录下创建新的角色类
2. **修改控制逻辑**: 编辑 `src/controller/controller2.ts`
3. **调整常量**: 修改 `src/constants.ts` 中的配置
4. **添加工具函数**: 在 `src/utils.ts` 中添加通用功能

## 构建工具

项目使用 [Grunt](https://gruntjs.com/) 作为构建工具，配合 [grunt-screeps](https://github.com/screeps/grunt-screeps) 插件实现代码推送。

## 项目管理

📋 **GitHub Projects**: [Screeps AI Development](https://github.com/users/PengleiYu/projects/2) - 查看开发进度和任务规划

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 许可证

ISC License