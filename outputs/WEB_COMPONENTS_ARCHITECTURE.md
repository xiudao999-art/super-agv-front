# Web Components 渐进式组件化说明

本目录直接运行原生 HTML、CSS 与 ES Modules，不需要构建步骤，也不依赖 Vue、React 或 Lit。

## 公共入口

- `assets/components/register.js`：注册全部 Web Components，并加载 UI 兼容服务。
- `assets/styles/tokens.css`：字号、间距、控件高度、圆角、颜色和断点令牌。
- `assets/styles/base.css`：全局排版、焦点和降级规则。
- `assets/styles/components.css`：聚合布局、表格、表单、反馈层及组件公共样式。
- `assets/icons.svg`：页面共用 SVG 图标资源。

## 组件边界

- `<agv-app-shell active-route section-title user-name>` 使用 Shadow DOM，负责侧栏、顶栏和移动端导航；页面业务内容放在默认插槽，继续保留 Light DOM。
- `<agv-page-header title description>` 负责标题区域；现有复杂标题内容也可以直接放入默认插槽，页面操作放入 `actions` 插槽。
- `<agv-tabs>` 只管理当前项与可访问性状态；内部必须继续使用普通 `<a>`，查询参数和跳转协议不变。

迁移期的隐藏代理节点会把壳层按钮事件转发给旧脚本。不要在组件中加入筛选、分页、校验、接口字段映射或其他业务规则。

## 数据边界

`assets/core/http-client.js` 只处理基础 URL、超时、取消、JSON 解析与通用错误。领域请求分别放在 `assets/data/dashboard-data.js`、`orders-data.js`、`workflow-data.js` 和 `lab-data.js`。页面控制器仍负责渲染与业务交互。

新增请求时，先在对应领域模块导出一个薄封装，再由页面控制器调用。不得在 Web Component 内请求业务数据，也不得改变现有 API 路径、方法、参数、请求体或响应字段。

## 新页面接入

1. 引入 `tokens.css`、`base.css`、`components.css` 和该页面自己的 `assets/styles/pages/*.css`。
2. 以 module 方式引入 `assets/components/register.js`。
3. 用 `<agv-app-shell>` 包住页面业务区域，用 `<agv-page-header>` 和 `<agv-tabs>` 复用公共结构。
4. 页面特有布局留在自己的 CSS；全站字号、间距和控件规格优先修改设计令牌。
