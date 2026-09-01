import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import http from './services/http'
import TableActionButton from './components/TableActionButton.vue'
import './styles/app.css'
import './styles/reference-theme.css'

const app = createApp(App)
app.component('TableActionButton',TableActionButton)

app.use(ElementPlus)
app.use(router)
app.provide('http', http)
app.config.globalProperties.$http = http
app.mount('#app')
