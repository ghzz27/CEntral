import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { sessao } from './services/api'
import { limpar, validarSessao } from './stores/auth'

const app = createApp(App)

// v-revelar: o elemento é "erguido" de baixo para cima quando aparece na tela
app.directive('revelar', {
  mounted(el) {
    el.classList.add('revelar')

    // Navegador muito antigo: mostra direto
    if (!('IntersectionObserver' in window)) {
      el.classList.add('visivel')
      return
    }

    el._observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        el.classList.add('visivel')
        el._observador.disconnect()
      }
    }, { threshold: 0.12 })

    el._observador.observe(el)
  },

  unmounted(el) {
    if (el._observador) el._observador.disconnect()
  }
})

// Token recusado pelo servidor (login vencido): sai da conta.
// Se a página exige login, leva para o Login; nas públicas só volta ao modo visitante.
sessao.aoExpirar = () => {
  limpar()
  const atual = router.currentRoute.value
  if (atual.meta.exigeLogin) router.replace({ name: 'Login', query: { voltar: atual.fullPath, expirou: '1' } })
}

app.use(router)

app.mount('#app')
validarSessao()
