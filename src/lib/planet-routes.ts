export type PlanetRoute = {
  id: string
  label: string
  description: string
  href: string
  orbitRadius: number
  orbitDuration: number
  initialAngle: number
  size: number
  variant: 'jobs' | 'applications' | 'bottle' | 'resume' | 'auth' | 'admin' | 'forum'
  requiresAuth?: boolean
  adminOnly?: boolean
}

export const PLANET_ROUTES: PlanetRoute[] = [
  {
    id: 'jobs',
    label: '岗位坐标',
    description: '浏览、筛选和收录岗位',
    href: '/explore',
    orbitRadius: 420,
    orbitDuration: 104,
    initialAngle: 284,
    size: 64,
    variant: 'jobs',
  },
  {
    id: 'applications',
    label: '投递管理',
    description: '更新投递记录和进度',
    href: '/my',
    orbitRadius: 610,
    orbitDuration: 124,
    initialAngle: 168,
    size: 64,
    variant: 'applications',
    requiresAuth: true,
  },
  {
    id: 'bottle',
    label: '星瓶',
    description: '查看投递记录',
    href: '/bottle',
    orbitRadius: 610,
    orbitDuration: 114,
    initialAngle: 24,
    size: 64,
    variant: 'bottle',
    requiresAuth: true,
  },
  {
    id: 'resume',
    label: '简历制作',
    description: '编辑、预览并导出 PDF',
    href: '/resume',
    orbitRadius: 800,
    orbitDuration: 130,
    initialAngle: 100,
    size: 56,
    variant: 'resume',
  },
  {
    id: 'forum',
    label: '拾星指南',
    description: '查看公告、教程和经验分享',
    href: '/forum',
    orbitRadius: 800,
    orbitDuration: 138,
    initialAngle: 236,
    size: 48,
    variant: 'forum',
  },
  {
    id: 'admin',
    label: '管理入口',
    description: '维护岗位数据和导入记录',
    href: '/admin',
    orbitRadius: 990,
    orbitDuration: 152,
    initialAngle: 328,
    size: 48,
    variant: 'admin',
    adminOnly: true,
  },
]
