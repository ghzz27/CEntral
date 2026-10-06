<template>
  <div>
    <Banner :title="vitrine ? 'Projeto Pronto' : 'Detalhes do Projeto'" subtitle="Todas as informações em um só lugar" imagem="/img/fundoVariado.png" compacto />
    <div class="main-container">
      <div v-if="carregando" class="vazio">Carregando projeto...</div>
      <div v-else-if="erro" class="vazio">Projeto não encontrado.</div>

      <article v-else class="detalhe card">
        <div class="cabecalho">
          <div>
            <span class="numero">{{ vitrine ? 'PROJETO PRONTO' : 'PROJETO' }} #{{ projeto.id }}</span>
            <h1>{{ projeto.nome }}</h1>
          </div>
          <div class="etiquetas">
            <button v-if="!vitrine" type="button" class="estrela no-print" :class="{ ativa: projeto.favorito }"
                    @click="alternarFavorito" :aria-pressed="projeto.favorito" title="Favorito">★</button>
            <span class="badge" :class="classePrioridade(projeto.prioridade)">Prioridade {{ projeto.prioridade || 'Média' }}</span>
            <span class="badge" :class="classeStatus(projeto.status)">{{ projeto.status }}</span>
            <span v-if="alerta" class="badge" :class="alerta.tipo === 'atrasado' ? 'atrasado' : 'vence'">{{ alerta.texto }}</span>
          </div>
        </div>

        <p class="descricao">{{ projeto.descricao || 'Sem descrição cadastrada.' }}</p>

        <!-- Progresso -->
        <div v-if="!vitrine" class="secao progresso-secao">
          <div class="progresso-topo"><h2>Progresso</h2><strong>{{ projeto.progresso || 0 }}%</strong></div>
          <div class="barra-fundo"><div class="barra-preenchida" :style="{ width: (projeto.progresso || 0) + '%' }"></div></div>
        </div>

        <div class="dados">
          <div><span>Categoria</span><strong>{{ projeto.categoria }}</strong></div>
          <div><span>Subcategoria</span><strong>{{ projeto.subcategoria || 'Não informada' }}</strong></div>
          <div><span>Responsável</span><strong>{{ projeto.responsavel }}</strong></div>
          <div><span>Data de criação</span><strong>{{ formatarData(projeto.dataCriacao) }}</strong></div>
          <div><span>Prazo</span><strong>{{ formatarData(projeto.prazo) }}</strong></div>
          <div><span>Orçamento planejado</span><strong>{{ orcamento ? dinheiro(orcamento) : 'Não informado' }}</strong></div>
        </div>

        <!-- Itens com quantidade e preço -->
        <div v-if="itens.length" class="secao">
          <h2>Materiais / tecnologias / peças</h2>

          <template v-if="temPrecos">
            <div class="tabela">
              <div class="th"><span>Item</span><span>Qtd.</span><span>Valor unit.</span><span>Subtotal</span><span>Comprado</span></div>
              <div class="tr" v-for="(item, idx) in itens" :key="idx" :class="{ feito: item.comprado }">
                <span class="c-nome">{{ item.nome }}</span>
                <span>{{ item.quantidade }}</span>
                <span>{{ dinheiro(item.valorUnitario) }}</span>
                <span>{{ dinheiro(custoItem(item)) }}</span>
                <span class="c-check">{{ item.comprado ? '✓' : '—' }}</span>
              </div>
            </div>

            <!-- Gasto x orçamento -->
            <div class="gasto">
              <div class="gasto-numeros">
                <div><span>Total previsto</span><strong>{{ dinheiro(previsto) }}</strong></div>
                <div><span>Já comprado</span><strong class="comprado">{{ dinheiro(comprado) }}</strong></div>
                <div><span>Falta comprar</span><strong>{{ dinheiro(Math.max(0, previsto - comprado)) }}</strong></div>
              </div>
              <div class="gasto-barra">
                <div class="linha"><span>Gasto x {{ orcamento ? 'orçamento' : 'previsto' }}</span><strong>{{ dinheiro(comprado) }} de {{ dinheiro(tetoRef) }}</strong></div>
                <div class="barra-fundo"><div class="barra-preenchida verde" :style="{ width: percentComprado + '%' }"></div></div>
              </div>
              <p v-if="estourou" class="alerta-estouro">O previsto ({{ dinheiro(previsto) }}) passou do orçamento planejado ({{ dinheiro(orcamento) }}).</p>
            </div>
          </template>

          <div v-else class="chips"><span v-for="(item, idx) in itens" :key="idx">{{ item.nome }}</span></div>
        </div>

        <div class="acoes no-print">
          <RouterLink class="btn btn-outline" to="/Projetos">Voltar</RouterLink>
          <button v-if="!vitrine" type="button" class="btn btn-outline" @click="imprimir">Imprimir / PDF</button>
          <RouterLink v-if="!vitrine" class="btn" :to="`/EditarProjeto/${projeto.id}`">Editar projeto</RouterLink>
          <RouterLink v-else-if="!auth.usuario" class="btn" to="/Login">Entrar para criar o meu</RouterLink>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
import Banner from '../components/Banner.vue'
import { api } from '../services/api'
import { auth } from '../stores/auth'
import {
  dinheiro, formatarData, custoItem, somaItens, somaComprado,
  normalizarItens, temPrecos, classeStatus, classePrioridade, alertaPrazo
} from '../services/utils'

export default {
  name: 'DetalhesProjeto',
  components: { Banner },

  data() {
    return { projeto: null, carregando: true, erro: false, auth }
  },

  computed: {
    vitrine() { return !!this.$route.meta.vitrine },
    itens() { return this.projeto ? normalizarItens(this.projeto.itens) : [] },
    temPrecos() { return temPrecos(this.itens) },
    previsto() { return somaItens(this.itens) },
    comprado() { return somaComprado(this.itens) },
    orcamento() { return Number(this.projeto?.orcamento) || 0 },
    tetoRef() { return this.orcamento > 0 ? this.orcamento : this.previsto },
    percentComprado() { return this.tetoRef > 0 ? Math.min(100, this.comprado / this.tetoRef * 100) : 0 },
    estourou() { return this.orcamento > 0 && this.previsto > this.orcamento },
    alerta() { return this.projeto ? alertaPrazo(this.projeto.prazo, this.projeto.status) : null }
  },

  methods: {
    dinheiro,
    formatarData,
    custoItem,
    classeStatus,
    classePrioridade,

    async carregar() {
      try {
        const base = this.vitrine ? '/vitrine' : '/projetos'
        this.projeto = await api(`${base}/${this.$route.params.id}`)
      } catch {
        this.erro = true
      } finally {
        this.carregando = false
      }
    },

    async alternarFavorito() {
      const novo = !this.projeto.favorito
      try {
        await api(`/projetos/${this.projeto.id}`, { metodo: 'PATCH', corpo: { favorito: novo } })
        this.projeto.favorito = novo
      } catch { /* mantém o valor anterior se falhar */ }
    },

    imprimir() { window.print() }
  },

  mounted() { this.carregar() }
}
</script>

<style scoped>
.detalhe { max-width: 900px; margin: 0 auto; }
.cabecalho { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 1px solid var(--borda); padding-bottom: 22px; }
.numero { font-size: 12px; font-weight: 800; color: var(--azul); letter-spacing: .1em; }
.cabecalho h1 { margin-top: 5px; font-size: 34px; }
.etiquetas { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; align-items: center; }

.estrela {
  width: 38px; height: 38px;
  background: #f4f6f8; border: 1px solid var(--borda); border-radius: 10px;
  color: #c7ccd3; font-size: 20px; line-height: 1; cursor: pointer;
  transition: var(--transicao);
}
.estrela:hover { border-color: #e5b800; color: #e5b800; }
.estrela.ativa { background: #fff6d8; border-color: #e5b800; color: #e5b800; }

.descricao { margin: 24px 0; color: var(--texto-suave); font-size: 16px; }

.secao { margin-top: 25px; }
.secao h2 { font-size: 18px; margin-bottom: 12px; }

.progresso-secao .progresso-topo { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.progresso-secao h2 { margin: 0; }
.barra-fundo { height: 12px; border-radius: 20px; background: #eaf1f7; overflow: hidden; }
.barra-preenchida { height: 100%; border-radius: 20px; background: var(--azul); transition: width .5s ease; }
.barra-preenchida.verde { background: #2e9e68; }

.dados { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 25px; }
.dados div { padding: 15px; background: #f7fbff; border: 1px solid var(--borda); border-radius: 10px; }
.dados span { display: block; color: var(--texto-suave); font-size: 12px; }
.dados strong { display: block; margin-top: 4px; }

.tabela { border: 1px solid var(--borda); border-radius: 10px; overflow: hidden; }
.th, .tr { display: grid; grid-template-columns: 2fr 60px 1fr 1fr 90px; gap: 8px; align-items: center; padding: 10px 14px; }
.th { background: #f7fbff; font-size: 12px; font-weight: 700; color: var(--texto-suave); text-transform: uppercase; letter-spacing: .04em; }
.tr { border-top: 1px solid var(--borda); }
.tr.feito { background: #f3fbf6; }
.c-nome { font-weight: 600; overflow-wrap: anywhere; }
.c-check { text-align: center; font-weight: 800; color: #207345; }

.gasto { margin-top: 16px; }
.gasto-numeros { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
.gasto-numeros div { padding: 12px; background: #f7fbff; border: 1px solid var(--borda); border-radius: 10px; }
.gasto-numeros span { display: block; font-size: 12px; color: var(--texto-suave); }
.gasto-numeros strong { display: block; margin-top: 3px; font-size: 18px; }
.gasto-numeros strong.comprado { color: #207345; }
.gasto-barra .linha { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 7px; font-size: 14px; }
.alerta-estouro { margin-top: 10px; padding: 8px 12px; background: #fff4e5; border: 1px solid #f3cf9a; border-radius: 8px; color: #8a5300; font-size: 13px; font-weight: 600; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chips span { background: var(--preto); color: var(--azul-claro); padding: 6px 10px; border-radius: 7px; font-size: 13px; }

.badge { padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.planejamento { background: #fff4d8; color: #8b6500; }
.andamento { background: #e4f2ff; color: var(--azul-escuro); }
.concluido { background: #e5f8ed; color: #207345; }
.prio-alta { background: #ffe3e3; color: #a52b2b; }
.prio-media { background: #eef2f7; color: #475467; }
.prio-baixa { background: #e7f3ff; color: var(--azul-escuro); }
.atrasado { background: #ffe3e3; color: #a52b2b; }
.vence { background: #fff2d6; color: #8a5300; }

.acoes { display: flex; justify-content: flex-end; gap: 10px; margin-top: 28px; flex-wrap: wrap; }

@media (max-width: 700px) {
  .cabecalho { flex-direction: column; }
  .etiquetas { justify-content: flex-start; }
  .dados { grid-template-columns: 1fr; }
  .gasto-numeros { grid-template-columns: 1fr; }
  .th, .tr { grid-template-columns: 1.6fr 44px 1fr 70px; }
  .th span:nth-child(4), .tr span:nth-child(4) { display: none; }
  .acoes { justify-content: stretch; flex-direction: column; }
  .acoes .btn { text-align: center; }
}
</style>
