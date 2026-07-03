export type PlanetRoute = {
  id: string
  label: string
  description: string
  href: string
  orbitRadius: number
  orbitDuration: number
  initialAngle: number
  size: number
  variant: 'jobs' | 'applications' | 'bottle' | 'auth' | 'admin' | 'forum'
  requiresAuth?: boolean
  adminOnly?: boolean
}

export const PLANET_ROUTES: PlanetRoute[] = [
  {
    id: 'jobs',
    label: '岗位星图',
    description: '浏览和筛选当前开放岗位',
    href: '/jobs',
    orbitRadius: 318,
    orbitDuration: 52,
    initialAngle: 20,
    size: 86,
    variant: 'jobs',
  },
  {
    id: 'applications',
    label: '我的投递',
    description: '管理所有岗位投递进度',
    href: '/my-applications',
    orbitRadius: 460,
    orbitDuration: 72,
    initialAngle: 140,
    size: 68,
    variant: 'applications',
    requiresAuth: true,
  },
  {
    id: 'bottle',
    label: '我的星瓶',
    description: '查看已投递岗位星星',
    href: '/my-bottle',
    orbitRadius: 390,
    orbitDuration: 64,
    initialAngle: 250,
    size: 74,
    variant: 'bottle',
    requiresAuth: true,
  },
  {
    id: 'forum',
    label: '讨论区',
    description: '交流秋招经验和问题',
    href: '/forum',
    orbitRadius: 580,
    orbitDuration: 88,
    initialAngle: 205,
    size: 52,
    variant: 'forum',
  },
  {
    id: 'admin',
    label: '管理入口',
    description: '维护岗位数据和导入记录',
    href: '/admin',
    orbitRadius: 680,
    orbitDuration: 104,
    initialAngle: 330,
    size: 50,
    variant: 'admin',
    adminOnly: true,
  },
]
