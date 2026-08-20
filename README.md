# kunling-front

复合机器人调度系统前端，当前版本实现应用整体框架及“配置中心 → 实验室配置”页面。

## 环境要求

- Node.js 18.18 或更高版本
- npm 10 或兼容版本
- 后端地址：`http://localhost:8081`

## 启动项目

```bash
npm install
npm run dev
```

开发地址默认为 `http://localhost:5173`。Vite 已将 `/api` 请求代理至 `http://localhost:8081`，当前页面尚未调用后端接口。

## 常用命令

```bash
npm run lint
npm run test:run
npm run build
```

## Mock 数据约定

Mock 数据与对应页面放在同一个目录，页面直接导入 `mockdata.json`，不设置全局 Mock 开关，也不预设服务层。

实验室配置页面：

```text
src/views/lab-configuration/
├── LabConfigurationView.vue
├── mockdata.json
└── mockdata.spec.js
```

后续接入真实后端时，按页面逐一移除 `mockdata.json` 引用并改为真实接口调用。

## 地图替换

当前仿真地图位于 `public/mock-laboratory-map.svg`。拿到真实实验室地图后，可替换该文件，或修改 `LabMapDialog.vue` 中的图片地址。
