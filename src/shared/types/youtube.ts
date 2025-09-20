export type Mode = 'channel' | 'keyword'
export type Format = 'all' | 'shorts' | 'longform'

export interface FilterSettings {
  mode: Mode
  months: number
  perChannelLimit: number
  minViewsPerHour: number
  waitMinutesOnQuota: number
  country?: string
  language?: string
  perQueryLimit?: number
  minViews?: number
  format?: Format
  shortsThresholdSec?: number
  showChannelTopVideos?: boolean
  apiKey: string
  channelHandle?: string
  keyword?: string
}