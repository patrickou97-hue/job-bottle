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
    description: '浏览岗位，按方向筛选并收入星瓶',
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
    description: '梳理投递流程，记录每一步进展',
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
    description: '回看已收录的岗位与求职轨迹',
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
    description: '编辑、预览并导出你的简历',
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
    description: '维护岗位数据与导入记录',
    href: '/admin',
    orbitRadius: 990,
    orbitDuration: 152,
    initialAngle: 328,
    size: 48,
    variant: 'admin',
    adminOnly: true,
  },
]
