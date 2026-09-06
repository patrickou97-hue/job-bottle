export type PlanetRoute = {
  id: string
  label: string
  description: string
  href: string
  orbitRadius: number
  orbitDuration: number
  initialAngle: number
  size: number
  variant: 'jobs' | 'applications' | 'bottle' | 'resume' | 'auth' | 'admin' | 'forum' | 'extension'
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
    size: 68,
    variant: 'jobs',
  },
  {
    id: 'resume',
    label: '简历制作',
    description: '编辑、预览并导出你的简历',
    href: '/resume',
    orbitRadius: 420,
    orbitDuration: 110,
    initialAngle: 72,
    size: 62,
    variant: 'resume',
  },
  {
    id: 'applications',
    label: '投递管理',
    description: '梳理投递流程，记录每一步进展',
    href: '/my',
    orbitRadius: 620,
    orbitDuration: 124,
    initialAngle: 168,
    size: 64,
    variant: 'applications',
    requiresAuth: true,
  },
  {
    id: 'extension',
    label: '网申助手',
    description: '先选简历，再安全填写网申表单',
    href: '/extension',
    orbitRadius: 620,
    orbitDuration: 118,
    initialAngle: 322,
    size: 62,
    variant: 'extension',
  },
  {
    id: 'bottle',
    label: '星瓶',
    description: '回看已收录的岗位与求职轨迹',
    href: '/bottle',
    orbitRadius: 820,
    orbitDuration: 132,
    initialAngle: 24,
    size: 54,
    variant: 'bottle',
    requiresAuth: true,
  },
  {
    id: 'forum',
    label: '拾星指南',
    description: '查看公告、教程和经验分享',
    href: '/forum',
    orbitRadius: 820,
    orbitDuration: 138,
    initialAngle: 236,
    size: 50,
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
