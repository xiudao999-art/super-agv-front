# 复合机器人调度系统（Vue 3）

本项目将参考目录中的 AGV 调度前端迁移为 Vue 3 + Vite 工程，并保留原项目的页面、交互脚本、地图资源、流程画布与 API 协议。

## 技术栈

- Vue 3
- Vite
- Element Plus
- Axios
- Vue Router

## 启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

默认访问地址为 `http://localhost:5173`，演示账号和密码可填写任意非空内容。

## API 配置

开发环境默认把以下请求转发到 `http://localhost:8081`：

- `/api/**`
- `/locations/**`
- `/locationTypes/**`
- `/carrierTypes/**`
- `/carriers/**`

可以在 `.env.local` 中通过 `VITE_API_PROXY_TARGET` 修改后端地址。Vue 侧的 Axios 实例位于 `src/services/http.js`。

## 迁移结构

- `src/router/legacy-routes.js`：全部业务页面的 Vue Router 路由映射。
- `src/views/LegacyView.vue`：兼容视图，保持地图、流程拖拽、弹窗、筛选、分页和 CRUD 脚本运行，并将页面内跳转同步到 Vue Router。
- `public/legacy`：从参考项目迁入的业务页面、样式、图片与 API 适配脚本。

兼容视图与业务页面同源运行，因此可以同步导航、查询参数和 API 基础地址，也不会丢失原页面的复杂交互能力。
