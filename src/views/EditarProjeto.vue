<template>
  <div>
    <Banner title="Editar Projeto" subtitle="Atualize as informações do projeto" imagem="/img/fundoCadastro.jpg" compacto />
    <div class="main-container">
      <Message :msg="msg" />
      <form v-if="!carregando" class="form card" @submit.prevent="salvar">

        <div class="input-container"><label>Nome do Projeto</label><input v-model="projeto.nome" required></div>
        <div class="input-container"><label>Descrição</label><textarea v-model="projeto.descricao"></textarea></div>

        <div class="duas-colunas">
          <div class="input-container">
            <label>Categoria</label>
            <select v-model="projeto.categoria" @change="aoTrocarCategoria" required>
              <option v-for="c in categorias" :key="c.id">{{ c.nome }}</option>
            </select>
          </div>
          <div class="input-container">
            <label>Subcategoria</label>
            <select v-model="projeto.subcategoria" @change="aoTrocarSubcategoria">
              <option value="">Selecione</option>
              <option v-for="s in subcategorias" :key="s.nome">{{ s.nome }}</option>
            </select>
          </div>
        </div>

        <div class="input-container" v-if="itensDisponiveis.length">
          <label>Materiais / tecnologias / peças</label>
          <p class="dica-campo">Clique para adicionar ou remover da lista.</p>
          <div class="chips">
            <button type="button" class="chip" v-for="i in itensDisponiveis" :key="i"
                    :class="{ on: itemSelecionado(i) }" @click="alternarItem(i)">{{ i }}</button>
          </div>
        </div>

        <div class="input-container">
          <label>Itens do orçamento</label>
          <div class="add-item">
            <input type="text" v-model="novoItem" placeholder="Adicionar outro item"
                   @keydown.enter.prevent="adicionarPersonalizado">
            <button type="button" class="btn-add" @click="adicionarPersonalizado">Adicionar</button>
          </div>

          <p v-if="!projeto.itens.length" class="vazio-itens">Nenhum item cadastrado.</p>

          <div v-else class="tabela-itens">
            <div class="linha-item cabecalho">
              <span>Item</span><span>Qtd.</span><span>Valor unit.</span><span>Subtotal</span><span>Comprado</span><span></span>
            </div>
            <div class="linha-item" v-for="(item, idx) in projeto.itens" :key="idx">
              <span class="nome-item" :title="item.nome">{{ item.nome }}</span>
              <input type="number" min="0" step="1" v-model.number="item.quantidade" aria-label="Quantidade">
              <input type="number" min="0" step="0.01" v-model.number="item.valorUnitario" aria-label="Valor unitário">
              <span class="subtotal">{{ dinheiro(custoItem(item)) }}</span>
              <label class="check"><input type="checkbox" v-model="item.comprado"></label>
              <button type="button" class="remover" @click="removerItem(idx)" aria-label="Remover">×</button>
            </div>
          </div>

          <div class="resumo-itens" v-if="projeto.itens.length">
            <div><span>Total previsto</span><strong>{{ dinheiro(totalPrevisto) }}</strong></div>
            <div><span>Já comprado</span><strong class="comprado">{{ dinheiro(totalComprado) }}</strong></div>
            <div><span>Falta comprar</span><strong>{{ dinheiro(totalPrevisto - totalComprado) }}</strong></div>
          </div>
        </div>

        <div class="duas-colunas">
          <div class="input-container"><label>Responsável</label><input v-model="projeto.responsavel" required></div>
          <div class="input-container"><label>Orçamento planejado</label><input type="number" min="0" step="0.01" v-model.number="projeto.orcamento"></div>
        </div>

        <div class="duas-colunas">
          <div class="input-container">
            <label>Status</label>
            <select v-model="projeto.status"><option>Planejamento</option><option>Em andamento</option><option>Concluído</option></select>
          </div>
          <div class="input-container">
            <label>Prioridade</label>
            <select v-model="projeto.prioridade"><option>Alta</option><option>Média</option><option>Baixa</option></select>
          </div>
        </div>

        <div class="input-container">
          <label>Progresso: {{ projeto.progresso }}%</label>
          <input type="range" min="0" max="100" step="5" v-model.number="projeto.progresso">
          <div class="barra-fundo"><div class="barra-preenchida" :style="{ width: projeto.progresso + '%' }"></div></div>
        </div>

        <div class="duas-colunas">
          <div class="input-container"><label>Prazo</label><input type="date" v-model="projeto.prazo"></div>
          <div class="input-container favorito-wrap">
            <label class="favorito-linha"><input type="checkbox" v-model="projeto.favorito"><span>★ Favorito</span></label>
          </div>
        </div>

        <div class="acoes">
          <RouterLink class="btn btn-outline" :to="`/Projetos/${projeto.id}`">Cancelar</RouterLink>
          <button class="btn" type="submit">Salvar alterações</button>
        </div>
      </form>
      <div v-else class="vazio">Carregando projeto...</div>
    </div>
  </div>
</template>

<script>
import Banner from '../components/Banner.vue'
import Message from '../components/Message.vue'
import { api, categorias } from '../services/api'
import { dinheiro, custoItem, somaItens, somaComprado, normalizarItens } from '../services/utils'

export default {
  name: 'EditarProjeto',
  components: { Banner, Message },

  data() {
    return { projeto: { itens: [], progresso: 0, prioridade: 'Média', favorito: false }, categorias: [], novoItem: '', carregando: true, msg: null }
  },

  computed: {
    subcategorias() {
      const c = this.categorias.find(c => c.nome === this.projeto.categoria)
      return c ? c.subcategorias : []
    },
    itensDisponiveis() {
      const s = this.subcategorias.find(s => s.nome === this.projeto.subcategoria)
      return s ? s.itens : []
    },
    totalPrevisto() { return somaItens(this.projeto.itens) },
    totalComprado() { return somaComprado(this.projeto.itens) }
  },

  methods: {
    dinheiro,
    custoItem,

    async carregar() {
      try {
        const [dados, cats] = await Promise.all([api(`/projetos/${this.$route.params.id}`), categorias()])
        this.categorias = cats
        dados.itens = normalizarItens(dados.itens)
        dados.progresso = Number(dados.progresso) || 0
        dados.prioridade = dados.prioridade || 'Média'
        dados.favorito = dados.favorito === true
        this.projeto = dados
      } catch {
        this.msg = 'Não foi possível carregar o projeto.'
      } finally {
        this.carregando = false
      }
    },

    // Limpa itens só quando a pessoa troca de verdade (não ao carregar)
    aoTrocarCategoria() {
      if (!this.subcategorias.some(s => s.nome === this.projeto.subcategoria)) this.projeto.subcategoria = ''
      this.projeto.itens = []
    },
    aoTrocarSubcategoria() { this.projeto.itens = [] },

    itemSelecionado(nome) { return this.projeto.itens.some(i => i.nome === nome) },
    alternarItem(nome) {
      const idx = this.projeto.itens.findIndex(i => i.nome === nome)
      if (idx >= 0) this.projeto.itens.splice(idx, 1)
      else this.projeto.itens.push({ nome, quantidade: 1, valorUnitario: 0, comprado: false })
    },
    adicionarPersonalizado() {
      const nome = this.novoItem.trim()
      if (!nome) return
      if (!this.itemSelecionado(nome)) this.projeto.itens.push({ nome, quantidade: 1, valorUnitario: 0, comprado: false })
      this.novoItem = ''
    },
    removerItem(idx) { this.projeto.itens.splice(idx, 1) },

    async salvar() {
      const corpo = {
        nome: this.projeto.nome,
        descricao: this.projeto.descricao || '',
        categoria: this.projeto.categoria,
        subcategoria: this.projeto.subcategoria || '',
        itens: this.projeto.itens.map(i => ({
          nome: i.nome,
          quantidade: Number(i.quantidade) || 0,
          valorUnitario: Number(i.valorUnitario) || 0,
          comprado: i.comprado === true
        })),
        orcamento: Number(this.projeto.orcamento) || 0,
        responsavel: this.projeto.responsavel,
        dataCriacao: this.projeto.dataCriacao,
        prazo: this.projeto.prazo || '',
        status: this.projeto.status,
        prioridade: this.projeto.prioridade,
        progresso: Number(this.projeto.progresso) || 0,
        favorito: this.projeto.favorito === true
      }
      try {
        await api(`/projetos/${this.projeto.id}`, { metodo: 'PUT', corpo })
        this.$router.push(`/Projetos/${this.projeto.id}`)
      } catch (e) {
        this.msg = e.message
      }
    }
  },

  mounted() { this.carregar() }
}
</script>

<style scoped>
.form { max-width: 760px; margin: 0 auto; }
.input-container { display: flex; flex-direction: column; margin-bottom: 18px; }
.input-container label { margin-bottom: 8px; padding-left: 9px; border-left: 4px solid var(--azul); font-weight: 700; }
.input-container input,
.input-container select,
.input-container textarea {
  width: 100%; padding: 12px;
  border: 2px solid var(--borda); border-radius: 8px;
  font: inherit; background: var(--branco);
}
textarea { min-height: 120px; resize: vertical; }
.duas-colunas { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.dica-campo { margin: -2px 0 8px; color: var(--texto-suave); font-size: 13px; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 7px 12px; background: var(--branco); border: 1px solid var(--borda); border-radius: 999px; font: inherit; cursor: pointer; }
.chip:hover { border-color: var(--azul); }
.chip.on { background: var(--azul); color: white; border-color: var(--azul); }

.add-item { display: flex; gap: 8px; margin-bottom: 12px; }
.add-item input { flex: 1; }
.btn-add { flex-shrink: 0; padding: 0 16px; background: var(--azul); color: #fff; border: 0; border-radius: 8px; font: inherit; font-weight: 700; cursor: pointer; }
.btn-add:hover { background: var(--azul-escuro); }
.vazio-itens { color: var(--texto-suave); font-size: 14px; padding: 6px 0; }

.tabela-itens { border: 1px solid var(--borda); border-radius: 10px; overflow: hidden; }
.linha-item { display: grid; grid-template-columns: 1.6fr 70px 110px 100px 70px 36px; gap: 8px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--borda); }
.linha-item:last-child { border-bottom: 0; }
.linha-item.cabecalho { background: #f7fbff; font-size: 12px; font-weight: 700; color: var(--texto-suave); text-transform: uppercase; letter-spacing: 0.04em; }
.linha-item.cabecalho span { border: 0; padding: 0; }
.linha-item input { padding: 8px; font-size: 14px; }
.nome-item { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.subtotal { font-weight: 700; font-size: 14px; }
.check { display: grid; place-items: center; margin: 0; border: 0; padding: 0; }
.check input { width: 18px; height: 18px; cursor: pointer; }
.remover { width: 30px; height: 30px; background: #fff0f0; color: #a52b2b; border: 0; border-radius: 7px; font-size: 18px; line-height: 1; cursor: pointer; }
.remover:hover { background: #ffe0e0; }

.resumo-itens { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.resumo-itens div { padding: 12px; background: #f7fbff; border: 1px solid var(--borda); border-radius: 10px; }
.resumo-itens span { display: block; font-size: 12px; color: var(--texto-suave); border: 0; padding: 0; }
.resumo-itens strong { display: block; margin-top: 3px; font-size: 18px; }
.resumo-itens strong.comprado { color: #207345; }

input[type="range"] { padding: 0; height: 8px; accent-color: var(--azul); }
.barra-fundo { height: 10px; margin-top: 8px; border-radius: 20px; background: #eaf1f7; overflow: hidden; }
.barra-preenchida { height: 100%; border-radius: 20px; background: var(--azul); transition: width 0.3s ease; }

.favorito-wrap { justify-content: flex-end; }
.favorito-linha { display: flex; align-items: center; gap: 10px; border: 0 !important; padding: 10px 0 0 !important; cursor: pointer; }
.favorito-linha input { width: 18px; height: 18px; }
.favorito-linha span { color: #b8860b; font-weight: 700; }

.acoes { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }

@media (max-width: 650px) {
  .duas-colunas { grid-template-columns: 1fr; }
  .acoes { flex-direction: column; }
  .acoes > * { text-align: center; }
  .linha-item { grid-template-columns: 1.4fr 54px 90px 44px 32px; }
  .linha-item .subtotal { display: none; }
  .linha-item.cabecalho span:nth-child(4) { display: none; }
  .resumo-itens { grid-template-columns: 1fr; }
}
</style>
