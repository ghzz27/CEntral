<template>
  <div>
    <Banner title="Painel De Controle" subtitle="Acompanhe seus projetos de forma rápida" imagem="/img/fundoVariado.png" variante="claro" />

    <div class="main-container">
      <div v-if="erro" class="vazio erro-box">Não foi possível carregar os dados. Rode <strong>npm run server</strong>.</div>
      <template v-else>
        <section class="resumo">
          <div class="stat-card"><span>Total de projetos</span><strong>{{ resumo.total }}</strong><small>Projetos cadastrados</small></div>
          <div class="stat-card"><span>Planejamento</span><strong>{{ planejamento }}</strong><small>Esperando início</small></div>
          <div class="stat-card"><span>Em andamento</span><strong>{{ andamento }}</strong><small>Projetos ativos</small></div>
          <div class="stat-card"><span>Concluídos</span><strong>{{ concluidos }}</strong><small>Projetos finalizados</small></div>
        </section>

        <section class="financeiro-grid">
          <div class="fin-card card">
            <div class="painel-titulo"><div><span class="mini-titulo">ORÇAMENTO</span><h2>Gasto x planejado</h2></div></div>
            <div class="fin-numeros">
              <div><span>Já comprado</span><strong class="comprado">{{ dinheiro(resumo.compradoTotal) }}</strong></div>
              <div><span>Total previsto</span><strong>{{ dinheiro(resumo.previstoTotal) }}</strong></div>
              <div><span>Orçamento planejado</span><strong>{{ dinheiro(resumo.orcamentoTotal) }}</strong></div>
            </div>
            <div class="fin-barra">
              <div class="barra-label"><span>Comprado sobre o previsto</span><strong>{{ percentualComprado }}%</strong></div>
              <div class="barra-fundo"><div class="barra-preenchida" :style="{ width: percentualComprado + '%', background: '#2e9e68' }"></div></div>
            </div>
            <p v-if="resumo.orcamentoTotal && resumo.previstoTotal > resumo.orcamentoTotal" class="alerta-estouro">
              O total previsto passou do orçamento planejado em {{ dinheiro(resumo.previstoTotal - resumo.orcamentoTotal) }}.
            </p>
          </div>

          <div class="fin-card card">
            <div class="painel-titulo"><div><span class="mini-titulo">PRAZOS</span><h2>Atenção</h2></div></div>
            <div class="prazo-stats">
              <div class="prazo-stat atrasado"><strong>{{ resumo.atrasados }}</strong><span>Atrasados</span></div>
              <div class="prazo-stat vence"><strong>{{ resumo.aVencer }}</strong><span>Vencem em 7 dias</span></div>
              <div class="prazo-stat favorito"><strong>{{ resumo.favoritos }}</strong><span>Favoritos</span></div>
            </div>
            <div class="prioridades">
              <div class="prio-linha"><span class="badge prio-alta">Alta</span><strong>{{ resumo.prioridades.Alta }}</strong></div>
              <div class="prio-linha"><span class="badge prio-media">Média</span><strong>{{ resumo.prioridades['Média'] }}</strong></div>
              <div class="prio-linha"><span class="badge prio-baixa">Baixa</span><strong>{{ resumo.prioridades.Baixa }}</strong></div>
            </div>
          </div>
        </section>

        <section class="dashboard-grid">
          <div class="painel card">
            <div class="painel-titulo"><div><span class="mini-titulo">VISÃO GERAL</span><h2>Status dos projetos</h2></div><RouterLink class="btn btn-sm" to="/Projetos">Ver projetos</RouterLink></div>
            <div class="grafico">
              <div v-for="item in statusGrafico" :key="item.nome" class="barra-item">
                <div class="barra-label"><span>{{ item.nome }}</span><strong>{{ item.valor }}</strong></div>
                <div class="barra-fundo"><div class="barra-preenchida" :style="{ width: item.percentual + '%', background: item.cor }"></div></div>
              </div>
            </div>
          </div>

          <div class="painel card">
            <div class="painel-titulo"><div><span class="mini-titulo">CATEGORIAS</span><h2>Distribuição</h2></div></div>
            <div v-if="categoriasGrafico.length" class="categorias-grafico">
              <div v-for="item in categoriasGrafico" :key="item.nome" class="categoria-linha" :style="{ '--p': item.percentual + '%' }"><span>{{ item.nome }}</span><strong>{{ item.valor }}</strong></div>
            </div>
            <p v-else class="sem-dados">Ainda não existem projetos para mostrar.</p>
          </div>
        </section>

        <section class="ultimos card">
          <div class="painel-titulo"><div><span class="mini-titulo">RECENTES</span><h2>Últimos projetos</h2></div><RouterLink class="link" to="/CadastrosProjetos">+ Novo projeto</RouterLink></div>
          <div v-if="!ultimos.length" class="sem-dados">Nenhum projeto cadastrado ainda.</div>
          <div v-else class="lista-recente">
            <div v-for="projeto in ultimos" :key="projeto.id" class="recente-item">
              <div><strong>{{ projeto.nome }}</strong><span>{{ projeto.categoria }} · {{ projeto.responsavel }}</span></div>
              <span class="badge" :class="classeStatus(projeto.status)">{{ projeto.status }}</span>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script>
import Banner from '../components/Banner.vue'
import { api } from '../services/api'
import { dinheiro } from '../services/utils'

export default {
  name: 'Dashboard',
  components: { Banner },
  data() {
    // O servidor já devolve os totais calculados, sem baixar todos os projetos
    return {
      resumo: {
        total: 0, planejamento: 0, andamento: 0, concluidos: 0, categorias: [], ultimos: [],
        orcamentoTotal: 0, previstoTotal: 0, compradoTotal: 0,
        atrasados: 0, aVencer: 0, favoritos: 0,
        prioridades: { Alta: 0, 'Média': 0, Baixa: 0 }
      },
      erro: false
    }
  },
  computed: {
    planejamento() { return this.resumo.planejamento },
    andamento() { return this.resumo.andamento },
    concluidos() { return this.resumo.concluidos },
    statusGrafico() {
      const total = this.resumo.total || 1
      return [
        { nome: 'Planejamento', valor: this.planejamento, percentual: this.planejamento / total * 100, cor: '#e0a100' },
        { nome: 'Em andamento', valor: this.andamento, percentual: this.andamento / total * 100, cor: 'var(--azul)' },
        { nome: 'Concluído', valor: this.concluidos, percentual: this.concluidos / total * 100, cor: '#2e9e68' }
      ]
    },
    categoriasGrafico() {
      const total = this.resumo.total || 1
      return this.resumo.categorias.map(c => ({ ...c, percentual: c.valor / total * 100 }))
    },
    ultimos() { return this.resumo.ultimos },
    percentualComprado() {
      if (!this.resumo.previstoTotal) return 0
      return Math.min(100, Math.round(this.resumo.compradoTotal / this.resumo.previstoTotal * 100))
    }
  },
  methods: {
    dinheiro,
    async carregar() {
      try { this.resumo = await api('/resumo') }
      catch { this.erro = true }
    },
    classeStatus(status) { return status === 'Concluído' ? 'concluido' : status === 'Em andamento' ? 'andamento' : 'planejamento' }
  },
  mounted() { this.carregar() }
}
</script>

<style scoped>
.resumo { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-bottom:24px; }
.stat-card { background:var(--branco); border:1px solid var(--borda); border-top:4px solid var(--azul); border-radius:14px; padding:22px; box-shadow:var(--sombra); }
.stat-card span,.stat-card small { display:block; color:var(--texto-suave); }
.stat-card strong { display:block; margin:5px 0; font-size:36px; color:var(--preto); }
.dashboard-grid { display:grid; grid-template-columns:1.2fr .8fr; gap:20px; margin-bottom:20px; }
.financeiro-grid { display:grid; grid-template-columns:1.2fr .8fr; gap:20px; margin-bottom:20px; }
.fin-card { padding:22px; }
.fin-numeros { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px; }
.fin-numeros div { padding:14px; background:#f7fbff; border:1px solid var(--borda); border-radius:10px; }
.fin-numeros span { display:block; font-size:12px; color:var(--texto-suave); }
.fin-numeros strong { display:block; margin-top:4px; font-size:22px; color:var(--preto); }
.fin-numeros strong.comprado { color:#207345; }
.fin-barra .barra-label { display:flex; justify-content:space-between; margin-bottom:7px; font-size:14px; }
.alerta-estouro { margin-top:14px; padding:10px 14px; background:#fff4e5; border:1px solid #f3cf9a; border-radius:9px; color:#8a5300; font-size:13px; font-weight:600; }
.prazo-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px; }
.prazo-stat { padding:16px; border-radius:11px; text-align:center; border:1px solid var(--borda); }
.prazo-stat strong { display:block; font-size:30px; }
.prazo-stat span { font-size:12px; color:var(--texto-suave); }
.prazo-stat.atrasado { background:#fff0f0; border-color:#f3c2c2; }
.prazo-stat.atrasado strong { color:#a52b2b; }
.prazo-stat.vence { background:#fff8e8; border-color:#f0d79a; }
.prazo-stat.vence strong { color:#8a5300; }
.prazo-stat.favorito { background:#fff6d8; border-color:#eed98a; }
.prazo-stat.favorito strong { color:#8a6d00; }
.prioridades { display:flex; flex-direction:column; gap:8px; }
.prio-linha { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#f7fbff; border:1px solid var(--borda); border-radius:9px; }
.badge.prio-alta { background:#ffe3e3; color:#a52b2b; }
.badge.prio-media { background:#eef2f7; color:#475467; }
.badge.prio-baixa { background:#e7f3ff; color:var(--azul-escuro); }
.painel { min-height:260px; }
.painel-titulo { display:flex; justify-content:space-between; align-items:center; gap:15px; margin-bottom:24px; }
.painel h2 { margin-top:3px; color:var(--preto); }
.mini-titulo { font-size:11px; font-weight:800; color:var(--azul); letter-spacing:.12em; }
.btn-sm { padding:8px 14px; font-size:13px; }
.grafico { display:flex; flex-direction:column; gap:22px; padding-top:8px; }
.barra-label { display:flex; justify-content:space-between; margin-bottom:7px; font-size:14px; }
.barra-fundo { height:12px; border-radius:20px; background:#eaf1f7; overflow:hidden; }
.barra-preenchida { height:100%; border-radius:20px; background:var(--azul); transition:width .6s ease; }
.categorias-grafico { display:flex; flex-direction:column; gap:12px; }
.categoria-linha { display:flex; justify-content:space-between; padding:12px 14px; background:linear-gradient(90deg,#d6e9f9 var(--p),#f7fbff var(--p)); border:1px solid var(--borda); border-radius:9px; }
.sem-dados { color:var(--texto-suave); padding:20px 0; }
.ultimos { margin-bottom:30px; }
.link { font-weight:700; }
.lista-recente { display:flex; flex-direction:column; }
.recente-item { display:flex; justify-content:space-between; align-items:center; gap:15px; padding:15px 0; border-bottom:1px solid var(--borda); }
.recente-item:last-child { border-bottom:0; }
.recente-item strong,.recente-item span { display:block; }
.recente-item div span { color:var(--texto-suave); font-size:13px; margin-top:3px; }
.badge { display:inline-flex!important; padding:5px 10px; border-radius:999px; font-size:12px; font-weight:700; white-space:nowrap; }
.badge.planejamento { background:#fff4d8; color:#8b6500; }
.badge.andamento { background:#e4f2ff; color:var(--azul-escuro); }
.badge.concluido { background:#e5f8ed; color:#207345; }
@media(max-width:900px){.resumo{grid-template-columns:repeat(2,1fr)}.dashboard-grid{grid-template-columns:1fr}.financeiro-grid{grid-template-columns:1fr}.fin-numeros{grid-template-columns:1fr}}
@media(max-width:560px){.resumo{grid-template-columns:1fr}.painel-titulo{align-items:flex-start;flex-direction:column}.recente-item{align-items:flex-start;flex-direction:column}}
</style>
