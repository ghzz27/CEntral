<template>
  <div>
    <div class="filtros card">
      <div class="busca"><span>⌥</span><input v-model="busca" placeholder="Pesquisar projeto, responsável ou categoria..."></div>
      <select v-model="filtroCategoria"><option value="">Todas as categorias</option><option v-for="c in categorias" :key="c">{{ c }}</option></select>
      <select v-model="filtroStatus"><option value="">Todos os status</option><option>Planejamento</option><option>Em andamento</option><option>Concluído</option></select>
      <select v-model="filtroPrioridade"><option value="">Todas as prioridades</option><option>Alta</option><option>Média</option><option>Baixa</option></select>
      <button type="button" class="so-favoritos" :class="{ ativo: soFavoritos }" @click="soFavoritos = !soFavoritos">★ Favoritos</button>
      <button type="button" class="exportar" @click="exportarCsv" :disabled="!projetos.length">Exportar CSV</button>
      <button v-if="temFiltro" class="limpar" @click="limparFiltros">Limpar</button>
    </div>

    <div v-if="carregando" class="vazio">Carregando projetos...</div>
    <div v-else-if="erro" class="vazio">Não foi possível carregar os projetos. Rode <strong>npm run server</strong>.</div>
    <div v-else-if="!projetos.length" class="vazio">Você ainda não criou nenhum projeto. <RouterLink to="/CadastrosProjetos">Cadastrar o primeiro projeto</RouterLink></div>
    <div v-else-if="!filtrados.length" class="vazio">Nenhum projeto encontrado com esses filtros.</div>

    <div v-else class="grade">
      <div class="card projeto-card" v-for="projeto in filtrados" :key="projeto.id">
        <div class="topo">
          <span class="badge" :class="classeStatus(projeto.status)">{{ projeto.status }}</span>
          <span class="badge" :class="classePrioridade(projeto.prioridade)">{{ projeto.prioridade || 'Média' }}</span>
          <span v-if="alertaDe(projeto)" class="badge" :class="alertaDe(projeto).tipo === 'atrasado' ? 'atrasado' : 'vence'">{{ alertaDe(projeto).texto }}</span>
          <button type="button" class="estrela" :class="{ ativa: projeto.favorito }" @click="alternarFavorito(projeto)" :aria-pressed="projeto.favorito" title="Favorito">★</button>
        </div>

        <h3><RouterLink class="abrir" :to="`/Projetos/${projeto.id}`">{{ projeto.nome }}</RouterLink></h3>
        <p class="descricao">{{ projeto.descricao || 'Sem descrição.' }}</p>

        <div class="info">
          <span class="categoria">{{ projeto.categoria }}</span>
          <span class="categoria" v-if="projeto.subcategoria">{{ projeto.subcategoria }}</span>
        </div>

        <!-- Progresso -->
        <div class="progresso">
          <div class="progresso-topo"><span>Progresso</span><strong>{{ projeto.progresso || 0 }}%</strong></div>
          <div class="barra-fundo"><div class="barra-preenchida" :style="{ width: (projeto.progresso || 0) + '%' }"></div></div>
        </div>

        <!-- Gasto x previsto -->
        <div class="gasto" v-if="previstoDe(projeto) > 0">
          <span>Comprado</span>
          <strong>{{ dinheiro(compradoDe(projeto)) }} <em>de {{ dinheiro(previstoDe(projeto)) }}</em></strong>
        </div>
        <div class="meta"><span>Responsável: {{ projeto.responsavel }}</span></div>

        <div class="acoes">
          <select :value="projeto.status" @change="updateStatus(projeto, $event.target.value)">
            <option>Planejamento</option><option>Em andamento</option><option>Concluído</option>
          </select>
          <RouterLink class="acao editar" :to="`/EditarProjeto/${projeto.id}`">Editar</RouterLink>
          <button class="acao excluir" @click="deleteProjeto(projeto.id)">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../services/api'
import {
  dinheiro, somaItens, somaComprado, classeStatus, classePrioridade,
  alertaPrazo, projetosParaCsv, baixarArquivo
} from '../services/utils'

const PESO_PRIORIDADE = { Alta: 0, 'Média': 1, Baixa: 2 }

export default {
  name: 'Dashboard',

  data() {
    return {
      projetos: [], carregando: true, erro: false,
      busca: '', filtroCategoria: '', filtroStatus: '', filtroPrioridade: '', soFavoritos: false
    }
  },

  computed: {
    categorias() {
      return [...new Set(this.projetos.map(p => p.categoria).filter(Boolean))].sort()
    },
    temFiltro() {
      return !!(this.busca || this.filtroCategoria || this.filtroStatus || this.filtroPrioridade || this.soFavoritos)
    },
    filtrados() {
      const t = this.busca.toLowerCase().trim()
      return this.projetos
        .filter(p => {
          const texto = [p.nome, p.descricao, p.responsavel, p.categoria, p.subcategoria].join(' ').toLowerCase()
          return (!t || texto.includes(t)) &&
            (!this.filtroCategoria || p.categoria === this.filtroCategoria) &&
            (!this.filtroStatus || p.status === this.filtroStatus) &&
            (!this.filtroPrioridade || (p.prioridade || 'Média') === this.filtroPrioridade) &&
            (!this.soFavoritos || p.favorito)
        })
        // Favoritos primeiro, depois por prioridade (Alta > Média > Baixa)
        .sort((a, b) => (b.favorito === true) - (a.favorito === true) ||
          (PESO_PRIORIDADE[a.prioridade] ?? 1) - (PESO_PRIORIDADE[b.prioridade] ?? 1))
    }
  },

  methods: {
    dinheiro,
    classeStatus,
    classePrioridade,
    alertaDe(p) { return alertaPrazo(p.prazo, p.status) },
    previstoDe(p) { return somaItens(p.itens) },
    compradoDe(p) { return somaComprado(p.itens) },

    // Traz só os projetos da conta que está logada
    async getProjetos() {
      try { this.projetos = await api('/projetos') }
      catch { this.erro = true }
      finally { this.carregando = false }
    },
    async updateStatus(p, status) {
      try {
        await api(`/projetos/${p.id}`, { metodo: 'PATCH', corpo: { status } })
        p.status = status
      } catch { this.erro = true }
    },
    async alternarFavorito(p) {
      const novo = !p.favorito
      try {
        await api(`/projetos/${p.id}`, { metodo: 'PATCH', corpo: { favorito: novo } })
        p.favorito = novo
      } catch { /* ignora falha pontual */ }
    },
    async deleteProjeto(id) {
      if (!confirm('Deseja realmente excluir este projeto?')) return
      try {
        await api(`/projetos/${id}`, { metodo: 'DELETE' })
        this.projetos = this.projetos.filter(p => p.id !== id)
      } catch { this.erro = true }
    },
    exportarCsv() {
      if (!this.filtrados.length) return
      const data = new Date().toISOString().slice(0, 10)
      baixarArquivo(`projetos-${data}.csv`, projetosParaCsv(this.filtrados))
    },
    limparFiltros() {
      this.busca = ''; this.filtroCategoria = ''; this.filtroStatus = ''
      this.filtroPrioridade = ''; this.soFavoritos = false
    }
  },

  mounted() { this.getProjetos() }
}
</script>

<style scoped>
.filtros { display: grid; grid-template-columns: 1.7fr 1fr 1fr 1fr auto auto auto; gap: 10px; margin-bottom: 22px; padding: 15px; align-items: center; }
.busca { position: relative; }
.busca span { position: absolute; left: 12px; top: 8px; font-size: 23px; color: var(--texto-suave); }
.filtros input, .filtros select { width: 100%; height: 42px; padding: 0 12px; border: 1px solid var(--borda); border-radius: 8px; background: white; font: inherit; }
.busca input { padding-left: 40px; }
.so-favoritos, .exportar, .limpar { height: 42px; border: 1px solid var(--borda); border-radius: 8px; padding: 0 15px; font: inherit; font-weight: 700; cursor: pointer; white-space: nowrap; }
.so-favoritos { background: white; color: #8a6d00; }
.so-favoritos.ativo { background: #fff6d8; border-color: #e5b800; color: #8a6d00; }
.exportar { background: #eaf5ff; color: var(--azul-escuro); border-color: var(--azul-claro); }
.exportar:disabled { opacity: .5; cursor: not-allowed; }
.limpar { border: 0; background: var(--preto); color: white; }

.grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.projeto-card { position: relative; padding: 22px; display: flex; flex-direction: column; min-width: 0; }
.topo { display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: center; gap: 6px; margin-bottom: 12px; }
.estrela { margin-left: auto; width: 32px; height: 32px; background: #f4f6f8; border: 1px solid var(--borda); border-radius: 8px; color: #c7ccd3; font-size: 17px; line-height: 1; cursor: pointer; position: relative; z-index: 1; transition: var(--transicao); }
.estrela:hover { border-color: #e5b800; color: #e5b800; }
.estrela.ativa { background: #fff6d8; border-color: #e5b800; color: #e5b800; }

.projeto-card h3 { font-size: 20px; overflow-wrap: anywhere; }
.abrir { color: var(--preto); }
.abrir::after { content: ""; position: absolute; inset: 0; border-radius: var(--raio); }
.abrir:hover { color: var(--azul); }
.descricao { color: var(--texto-suave); font-size: 14px; min-height: 42px; margin: 6px 0 12px; }
.info { display: flex; flex-wrap: wrap; gap: 7px; }
.categoria { padding: 3px 9px; border-radius: 999px; background: #eef7ff; border: 1px solid var(--azul-claro); color: var(--azul-escuro); font-size: 12px; font-weight: 600; }

.progresso { margin: 14px 0 6px; }
.progresso-topo { display: flex; justify-content: space-between; font-size: 12px; color: var(--texto-suave); margin-bottom: 5px; }
.progresso-topo strong { color: var(--preto); }
.barra-fundo { height: 9px; border-radius: 20px; background: #eaf1f7; overflow: hidden; }
.barra-preenchida { height: 100%; border-radius: 20px; background: var(--azul); transition: width .5s ease; }

.gasto { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 6px 0; font-size: 12px; color: var(--texto-suave); }
.gasto strong { color: #207345; font-size: 14px; }
.gasto em { color: var(--texto-suave); font-style: normal; font-weight: 600; }

.meta { display: flex; justify-content: space-between; gap: 8px; margin: 6px 0 14px; color: var(--texto-suave); font-size: 12px; }

.acoes { display: grid; grid-template-columns: 1fr auto auto; gap: 6px; margin-top: auto; position: relative; z-index: 1; }
.acoes select { min-width: 0; border: 1px solid var(--borda); border-radius: 7px; padding: 7px; background: white; }
.acao { border: 0; border-radius: 7px; padding: 7px 9px; font-size: 12px; font-weight: 700; text-align: center; cursor: pointer; text-decoration: none; }
.editar { background: #f1f3f5; color: #333; }
.excluir { background: #fff0f0; color: #a52b2b; }

.badge { padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.planejamento { background: #fff4d8; color: #8b6500; }
.andamento { background: #e4f2ff; color: var(--azul-escuro); }
.concluido { background: #e5f8ed; color: #207345; }
.prio-alta { background: #ffe3e3; color: #a52b2b; }
.prio-media { background: #eef2f7; color: #475467; }
.prio-baixa { background: #e7f3ff; color: var(--azul-escuro); }
.atrasado { background: #ffe3e3; color: #a52b2b; }
.vence { background: #fff2d6; color: #8a5300; }

@media (max-width: 900px) { .filtros { grid-template-columns: 1fr 1fr; } .busca { grid-column: 1 / -1; } }
@media (max-width: 500px) {
  .filtros { grid-template-columns: 1fr; }
  .acoes { grid-template-columns: 1fr 1fr; }
  .acoes select { grid-column: 1 / -1; }
}
</style>
