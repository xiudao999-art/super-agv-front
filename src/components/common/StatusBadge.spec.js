import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import StatusBadge from './StatusBadge.vue'

describe('StatusBadge', () => {
  it('根据业务状态自动使用成功样式', () => {
    const wrapper = mount(StatusBadge, { props: { status: '已发布' } })

    expect(wrapper.text()).toContain('已发布')
    expect(wrapper.classes()).toContain('is-success')
  })

  it('允许调用方显式指定状态色', () => {
    const wrapper = mount(StatusBadge, { props: { status: '2 条', tone: 'danger' } })

    expect(wrapper.classes()).toContain('is-danger')
  })
})
