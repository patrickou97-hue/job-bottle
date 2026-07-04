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
    href: '/explore',
    orbitRadius: 318,
    orbitDuration: 132,
    initialAngle: 20,
    size: 64,
    variant: 'jobs',
  },
  {
    id: 'applications',
    label: '我的投递',
    description: '管理所有岗位投递进度',
    href: '/my',
    orbitRadius: 460,
    orbitDuration: 156,
    initialAngle: 140,
    size: 64,
    variant: 'applications',
    requiresAuth: true,
  },
  {
    id: 'bottle',
    label: '我的星瓶',
    description: '查看已投递岗位星星',
    href: '/bottle',
    orbitRadius: 390,
    orbitDuration: 144,
    initialAngle: 250,
    size: 64,
    variant: 'bottle',
    requiresAuth: true,
  },
  {
    id: 'forum',
    label: '讨论区',
    description: '交流秋招经验和问题',
    href: '/forum',
    orbitRadius: 580,
    orbitDuration: 174,
    initialAngle: 205,
    size: 48,
    variant: 'forum',
  },
  {
    id: 'admin',
    label: '管理入口',
    description: '维护岗位数据和导入记录',
    href: '/admin',
    orbitRadius: 680,
    orbitDuration: 192,
    initialAngle: 330,
    size: 48,
    variant: 'admin',
    adminOnly: true,
  },
]
