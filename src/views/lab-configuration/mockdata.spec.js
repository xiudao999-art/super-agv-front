import { describe, expect, it } from 'vitest'

import mockData from './mockdata.json'

describe('实验室配置 Mock 数据', () => {
  it('包含页面要求的四个配置分区', () => {
    expect(Object.keys(mockData)).toEqual(['spaces', 'topology', 'machines', 'peripherals'])
    Object.values(mockData).forEach((records) => expect(records.length).toBeGreaterThan(0))
  })

  it('每个分区内的配置编号保持唯一', () => {
    Object.entries(mockData).forEach(([section, records]) => {
      const ids = records.map((record) => record.id)
      expect(new Set(ids).size, `${section} 存在重复编号`).toBe(ids.length)
    })
  })

  it('地图导航点坐标位于 Mock 地图边界内', () => {
    mockData.spaces.forEach((space) => {
      expect(space.mapName).toBeTruthy()
      expect(space.mapVersion).toMatch(/^V\d+\.\d+$/)
      space.navPoints.forEach((point) => {
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThanOrEqual(900)
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThanOrEqual(520)
      })
    })
  })
})
