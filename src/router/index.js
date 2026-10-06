import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { auth } from '../stores/auth'

// Só a Home entra no carregamento inicial; as outras páginas são baixadas quando
// a pessoa abre cada uma (o site abre mais rápido).
// meta.exigeLogin: precisa estar logado | meta.visitante: só para quem não está logado
const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/Login', name: 'Login', component: () => import('../views/Login.vue'), meta: { visitante: true } },
  { path: '/Conta', name: 'Conta', component: () => import('../views/Conta.vue'), meta: { exigeLogin: true } },
  { path: '/Dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { exigeLogin: true } },
  { path: '/Projetos', name: 'Projetos', component: () => import('../views/Projetos.vue') },
  { path: '/Projetos/:id', name: 'DetalhesProjeto', component: () => import('../views/DetalhesProjeto.vue'), meta: { exigeLogin: true } },
  { path: '/ProjetosProntos/:id', name: 'DetalhesPronto', component: () => import('../views/DetalhesProjeto.vue'), meta: { vitrine: true } },
  { path: '/EditarProjeto/:id', name: 'EditarProjeto', component: () => import('../views/EditarProjeto.vue'), meta: { exigeLogin: true } },
  { path: '/CadastrosProjetos', name: 'CadastrosProjetos', component: () => import('../views/CadastrosProjetos.vue'), meta: { exigeLogin: true } },
  { path: '/Ajuda', name: 'Ajuda', component: () => import('../views/Ajuda.vue') },
  { path: '/Suporte', name: 'Suporte', component: () => import('../views/Suporte.vue') }
]

const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes, scrollBehavior(){ return { top:0, behavior:'smooth' } } })

router.beforeEach((to) => {
  if (to.meta.exigeLogin && !auth.usuario) return { name: 'Login', query: { voltar: to.fullPath } }
  if (to.meta.visitante && auth.usuario) return { name: 'Projetos' }
})

export default router
