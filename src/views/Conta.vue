<template>
  <div>
    <Banner title="Minha Conta" subtitle="Suas informações e o resumo dos seus projetos"
            imagem="/img/fundoVariado.png" variante="claro" />

    <div class="main-container">
      <section class="perfil card anim-subir">
        <div class="avatar-grande">{{ inicial }}</div>
        <div class="quem">
          <h2>{{ usuario.nome }}</h2>
          <p>{{ usuario.email }}</p>
        </div>
        <button class="btn btn-outline" @click="sairDaConta">Sair da conta</button>
      </section>

      <section class="dados anim-subir">
        <div><span>Nome</span><strong>{{ usuario.nome }}</strong></div>
        <div><span>E-mail</span><strong>{{ usuario.email }}</strong></div>
        <div><span>Conta criada em</span><strong>{{ criadaEm }}</strong></div>
        <div><span>Número da conta</span><strong>#{{ usuario.id }}</strong></div>
      </section>

      <section class="gerenciar anim-subir">
        <!-- Editar perfil -->
        <div class="bloco card">
          <h3>Editar perfil</h3>
          <form @submit.prevent="salvarPerfil">
            <label>Nome<input v-model.trim="form.nome" type="text" required maxlength="80"></label>
            <label>E-mail<input v-model.trim="form.email" type="email" required></label>
            <p v-if="msgPerfil" class="aviso" :class="erroPerfil ? 'ruim' : 'bom'">{{ msgPerfil }}</p>
            <button class="btn" :disabled="salvandoPerfil">{{ salvandoPerfil ? 'Salvando...' : 'Salvar alterações' }}</button>
          </form>
        </div>

        <!-- Trocar senha -->
        <div class="bloco card">
          <h3>Trocar senha</h3>
          <form @submit.prevent="salvarSenha">
            <label>Senha atual<input v-model="senha.atual" type="password" required></label>
            <label>Nova senha<input v-model="senha.nova" type="password" required minlength="6"></label>
            <label>Confirmar nova senha<input v-model="senha.confirmar" type="password" required minlength="6"></label>
            <p v-if="msgSenha" class="aviso" :class="erroSenha ? 'ruim' : 'bom'">{{ msgSenha }}</p>
            <button class="btn" :disabled="salvandoSenha">{{ salvandoSenha ? 'Trocando...' : 'Trocar senha' }}</button>
          </form>
        </div>

        <!-- Excluir conta -->
        <div class="bloco card perigo">
          <h3>Excluir conta</h3>
          <p class="explica">Esta ação apaga sua conta e todos os seus projetos. Não dá para desfazer.</p>
          <form @submit.prevent="removerConta">
            <label>Digite sua senha para confirmar<input v-model="senhaExcluir" type="password" required></label>
            <p v-if="msgExcluir" class="aviso ruim">{{ msgExcluir }}</p>
            <button class="btn btn-perigo" :disabled="excluindo">{{ excluindo ? 'Excluindo...' : 'Excluir minha conta' }}</button>
          </form>
        </div>
      </section>

      <div v-if="erro" class="vazio erro-box">{{ erro }}</div>

      <template v-else-if="resumo">
        <section class="numeros anim-subir">
          <div><strong>{{ resumo.total }}</strong><span>Projetos criados</span></div>
          <div><strong>{{ resumo.planejamento }}</strong><span>Planejamento</span></div>
          <div><strong>{{ resumo.andamento }}</strong><span>Em andamento</span></div>
          <div><strong>{{ resumo.concluidos }}</strong><span>Concluídos</span></div>
        </section>

        <section class="recentes card">
          <div class="titulo">
            <h3>Últimos projetos</h3>
            <RouterLink v-if="resumo.total" to="/Projetos">Ver todos</RouterLink>
          </div>

          <p v-if="!resumo.ultimos.length" class="sem-dados">
            Você ainda não criou nenhum projeto. <RouterLink to="/CadastrosProjetos">Cadastrar o primeiro</RouterLink>
          </p>
          <RouterLink v-for="p in resumo.ultimos" :key="p.id" :to="`/Projetos/${p.id}`" class="linha">
            <span><strong>{{ p.nome }}</strong><small>{{ p.categoria }} · {{ p.responsavel }}</small></span>
            <em>{{ p.status }}</em>
          </RouterLink>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Banner from '../components/Banner.vue'
import { api } from '../services/api'
import { auth, sair, atualizarPerfil, trocarSenha, excluirConta } from '../stores/auth'

const router = useRouter()
const usuario = computed(() => auth.usuario)
const inicial = computed(() => usuario.value.nome.charAt(0).toUpperCase())
const criadaEm = computed(() =>
  new Date(usuario.value.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
)

const resumo = ref(null)
const erro = ref('')

onMounted(async () => {
  try {
    resumo.value = await api('/resumo')
  } catch (e) {
    erro.value = e.message
  }
})

// ---- Editar perfil ----
const form = reactive({ nome: usuario.value.nome, email: usuario.value.email })
const salvandoPerfil = ref(false)
const msgPerfil = ref('')
const erroPerfil = ref(false)

async function salvarPerfil() {
  salvandoPerfil.value = true
  msgPerfil.value = ''
  try {
    await atualizarPerfil({ nome: form.nome, email: form.email })
    erroPerfil.value = false
    msgPerfil.value = 'Perfil atualizado com sucesso.'
  } catch (e) {
    erroPerfil.value = true
    msgPerfil.value = e.message
  } finally {
    salvandoPerfil.value = false
  }
}

// ---- Trocar senha ----
const senha = reactive({ atual: '', nova: '', confirmar: '' })
const salvandoSenha = ref(false)
const msgSenha = ref('')
const erroSenha = ref(false)

async function salvarSenha() {
  if (senha.nova !== senha.confirmar) {
    erroSenha.value = true
    msgSenha.value = 'A confirmação não confere com a nova senha.'
    return
  }
  salvandoSenha.value = true
  msgSenha.value = ''
  try {
    await trocarSenha(senha.atual, senha.nova)
    erroSenha.value = false
    msgSenha.value = 'Senha trocada com sucesso.'
    senha.atual = senha.nova = senha.confirmar = ''
  } catch (e) {
    erroSenha.value = true
    msgSenha.value = e.message
  } finally {
    salvandoSenha.value = false
  }
}

// ---- Excluir conta ----
const senhaExcluir = ref('')
const excluindo = ref(false)
const msgExcluir = ref('')

async function removerConta() {
  if (!confirm('Tem certeza? Isso apaga sua conta e todos os seus projetos.')) return
  excluindo.value = true
  msgExcluir.value = ''
  try {
    await excluirConta(senhaExcluir.value)
    router.push('/')
  } catch (e) {
    msgExcluir.value = e.message
    excluindo.value = false
  }
}

function sairDaConta() {
  sair()
  router.push('/')
}
</script>

<style scoped>
.perfil {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.perfil:hover { transform: none; }

.avatar-grande {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--preto);
  border: 3px solid var(--azul-claro);
  color: var(--azul-claro);
  font-size: 30px;
  font-weight: 800;
}

.quem { flex: 1; min-width: 0; }
.quem h2 { overflow-wrap: anywhere; }
.quem p { color: var(--texto-suave); overflow-wrap: anywhere; }

.dados {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.dados div {
  min-width: 0;
  padding: 15px;
  background: #f7fbff;
  border: 1px solid var(--borda);
  border-radius: 10px;
}

.dados span { display: block; color: var(--texto-suave); font-size: 12px; }
.dados strong { display: block; margin-top: 4px; overflow-wrap: anywhere; }

.numeros {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.numeros div {
  padding: 20px;
  background: var(--branco);
  border: 1px solid var(--borda);
  border-top: 4px solid var(--azul);
  border-radius: 14px;
  box-shadow: var(--sombra);
}

.numeros strong { display: block; font-size: 34px; line-height: 1.1; }
.numeros span { color: var(--texto-suave); font-size: 14px; }

.recentes:hover { transform: none; }

.titulo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.titulo a { font-weight: 700; font-size: 14px; }
.sem-dados { color: var(--texto-suave); }
.sem-dados a { font-weight: 700; }

.linha {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 14px 0;
  border-bottom: 1px solid var(--borda);
  color: var(--texto);
}

.linha:last-child { border-bottom: 0; }
.linha:hover strong { color: var(--azul); }
.linha strong, .linha small { display: block; }
.linha small { color: var(--texto-suave); }
.linha em { font-size: 12px; font-style: normal; font-weight: 700; color: var(--azul-escuro); white-space: nowrap; }

.gerenciar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.bloco { padding: 22px; }
.bloco:hover { transform: none; }
.bloco h3 { margin-bottom: 16px; }
.bloco form { display: flex; flex-direction: column; gap: 14px; }
.bloco label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--texto-suave); }
.bloco input {
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--borda);
  border-radius: 8px;
  background: white;
  font: inherit;
  color: var(--texto);
}
.bloco input:focus { outline: 2px solid var(--azul-claro); border-color: var(--azul); }
.bloco .btn { align-self: flex-start; }

.aviso { font-size: 13px; font-weight: 600; margin: 0; }
.aviso.bom { color: #207345; }
.aviso.ruim { color: #a52b2b; }

.perigo { border: 1px solid #f3c2c2; background: #fffafa; }
.perigo h3 { color: #a52b2b; }
.explica { color: var(--texto-suave); font-size: 13px; margin-bottom: 14px; }
.btn-perigo { background: #a52b2b; border-color: #a52b2b; color: white; }
.btn-perigo:hover { background: #8f2323; }
.gerenciar .perigo { grid-column: 1 / -1; }

@media (max-width: 800px) {
  .dados, .numeros { grid-template-columns: 1fr 1fr; }
  .gerenciar { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .perfil { flex-direction: column; text-align: center; }
  .dados { grid-template-columns: 1fr; }
}
</style>
