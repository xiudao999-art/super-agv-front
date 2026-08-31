import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 12000,
  headers: {
    Accept: 'application/json',
  },
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = '请求超时，请稍后重试'
    } else if (!error.response) {
      error.message = '无法连接服务，请检查网络或后端地址'
    } else if (error.response.data?.message) {
      error.message = error.response.data.message
    }
    return Promise.reject(error)
  },
)

export default http
