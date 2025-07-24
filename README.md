# Screeps AI

一个功能完整的 TypeScript Screeps AI 项目，支持智能房间运营和远程扩张系统。

## 🚀 核心特性

- 🏠 **智能房间运营** - 完整的采集、建造、升级、物流、防御体系
- 🌍 **17房间远征系统** - 五阶段自动化征服流程，支持超远距离扩张
- 🔗 **Link网络自动化** - 智能能量传输与资源优化
- ⚡ **动态Body配置** - 基于房间能量容量自动优化
- 🧠 **智能决策系统** - 权重评分算法和优先级管理

## 📦 快速开始

```bash
# 安装依赖
npm install

# 配置 .screeps.json
{
  "token": "<你的API token>",
  "branch": "default",
  "ptr": false
}

# 构建部署
npm run push
```

## 🎮 游戏内管理

```javascript
// 远征系统
global.ExpeditionController.startExpedition('W2N2', 'W1N1')
global.ExpeditionController.printMissionStatus()

// Link网络管理
global.LinkManager.printAllRoomsLinks()

// 调试工具
global.debugInvaderIssue('W2N2')
```

## 🏗️ 项目架构

```
src/
├── controller/          # 房间运营控制器
├── expedition/          # 远程扩张系统
│   ├── roles/          # 侦察、入侵、占领、升级、建造角色
│   └── core/           # 路径管理、状态控制
├── role/               # 房间角色系统
│   ├── core/           # 采集、建造、升级等核心角色
│   └── logistics/      # 物流转运角色
├── link/               # Link网络自动化
├── body/               # 动态Body配置
└── utils/              # 工具函数库
```

## 🎯 主要功能

### 房间运营
- **智能孵化**: 条件化creep生产，避免资源浪费
- **多角色协调**: 采集→物流→建造→升级→维修的完整生态
- **防御系统**: 自动塔防控制和威胁响应

### 远程扩张
- **五阶段征服**: 侦察→入侵→占领→升级→建造
- **超远距离**: 支持17+房间距离，理论无限制
- **智能路径**: waypoints安全路径规划
- **威胁处理**: Invader、InvaderCore、预留清除

### 技术特色
- **TypeScript**: 完整类型支持和严格检查
- **性能优化**: 路径缓存、智能调度、CPU优化
- **容错机制**: 任务状态持久化，自动重试恢复

## 📈 项目成就

- ✅ **17房间远征能力** - 史诗级超远距离征服系统
- ✅ **Builder能量优化** - 智能就近采集算法
- ✅ **完整防御体系** - 自动化威胁检测和清除
- 🚧 **工厂自动化** - 矿物压缩生产系统开发中

## 📋 项目管理

- **GitHub Projects**: [ScreepsProject](https://github.com/users/PengleiYu/projects/2)
- **Issues**: 功能需求和bug追踪
- **技术栈**: TypeScript + Grunt + 模块化架构

## 📝 许可证

ISC License