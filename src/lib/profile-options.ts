export const PROFILE_REGION_OPTIONS = [
  "北京",
  "上海",
  "深圳",
  "广州",
  "杭州",
  "成都",
  "南京",
  "武汉",
  "苏州",
  "重庆",
  "西安",
  "香港",
  "全国",
] as const;

export const PROFILE_ROLE_OPTIONS = [
  "金融",
  "银行",
  "证券",
  "基金",
  "保险",
  "投行",
  "投研",
  "行研",
  "量化",
  "咨询",
  "战略",
  "商业分析",
  "数据分析",
  "产品",
  "运营",
  "市场",
  "销售",
  "风控",
  "审计",
  "财务",
  "人力",
  "软件研发",
  "硬件工程",
  "供应链",
  "生产制造",
  "设计",
  "法务",
  "职能",
  "管培生",
  "教师",
] as const;

export function toggleProfileOption(current: string[], option: string) {
  if (current.includes(option)) return current.filter((item) => item !== option);
  return [...current, option];
}
