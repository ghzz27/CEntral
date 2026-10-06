<template>
  <div>
    <!-- Mensagem de sucesso ou erro -->
    <Message :msg="msg" />

    <form id="projeto-form" class="anim-subir" @submit.prevent="createProjeto">

      <div class="input-container cheio">
        <label for="nome">Nome do Projeto</label>
        <input type="text" id="nome" v-model="nome" placeholder="Digite o nome do projeto" required>
      </div>

      <div class="input-container cheio">
        <label for="descricao">Descrição</label>
        <textarea id="descricao" v-model="descricao" placeholder="Descreva o projeto"></textarea>
      </div>

      <div class="input-container">
        <label for="categoria">Categoria</label>
        <select id="categoria" v-model="categoria" @change="aoTrocarCategoria" required>
          <option value="">Selecione</option>
          <option v-for="c in categorias" :key="c.id">{{ c.nome }}</option>
        </select>
      </div>

      <!-- Subcategoria: muda conforme a categoria -->
      <div class="input-container" v-if="subcategorias.length">
        <label for="subcategoria">Subcategoria</label>
        <select id="subcategoria" v-model="subcategoria" @change="aoTrocarSubcategoria" required>
          <option value="">Selecione</option>
          <option v-for="sc in subcategorias" :key="sc.nome">{{ sc.nome }}</option>
        </select>
      </div>

      <!-- Itens sugeridos: clique para adicionar à lista -->
      <div class="input-container cheio" v-if="itensDisponiveis.length">
        <label>Materiais / tecnologias / peças</label>
        <p class="dica-campo">Clique para adicionar. Depois informe a quantidade e o valor de cada um.</p>
        <div class="chips">
          <button type="button" class="chip" v-for="i in itensDisponiveis" :key="i"
                  :class="{ on: itemSelecionado(i) }" @click="alternarItem(i)">{{ i }}</button>
        </div>
      </div>

      <!-- Lista de itens com quantidade, valor unitário e "já comprado" -->
      <div class="input-container cheio">
        <label>Itens do orçamento</label>
        <div class="add-item">
          <input type="text" v-model="novoItem" placeholder="Adicionar outro item (ex.: Prego)"
                 @keydown.enter.prevent="adicionarPersonalizado">
          <button type="button" class="btn-add" @click="adicionarPersonalizado">Adicionar</button>
        </div>

        <p v-if="!itens.length" class="vazio-itens">Nenhum item ainda. Clique nas sugestões acima ou adicione um item.</p>

        <div v-else class="tabela-itens">
          <div class="linha-item cabecalho">
            <span>Item</span><span>Qtd.</span><span>Valor unit.</span><span>Subtotal</span><span>Comprado</span><span></span>
          </div>
          <div class="linha-item" v-for="(item, idx) in itens" :key="idx">
            <span class="nome-item" :title="item.nome">{{ item.nome }}</span>
            <input type="number" min="0" step="1" v-model.number="item.quantidade" aria-label="Quantidade">
            <input type="number" min="0" step="0.01" v-model.number="item.valorUnitario" aria-label="Valor unitário">
            <span class="subtotal">{{ dinheiro(custoItem(item)) }}</span>
            <label class="check"><input type="checkbox" v-model="item.comprado"><span></span></label>
            <button type="button" class="remover" @click="removerItem(idx)" aria-label="Remover item">×</button>
          </div>
        </div>

        <div class="resumo-itens" v-if="itens.length">
          <div><span>Total previsto</span><strong>{{ dinheiro(totalPrevisto) }}</strong></div>
          <div><span>Já comprado</span><strong class="comprado">{{ dinheiro(totalComprado) }}</strong></div>
          <div><span>Falta comprar</span><strong>{{ dinheiro(totalPrevisto - totalComprado) }}</strong></div>
        </div>
      </div>

      <!-- Orçamento planejado (teto) -->
      <div class="input-container cheio">
        <label for="orcamento">Orçamento planejado (opcional)</label>
        <div class="moeda">
          <span>R$</span>
          <input type="number" id="orcamento" v-model.number="orcamento" min="0" step="0.01" placeholder="0,00">
        </div>
        <p class="dica-campo">Quanto você planeja gastar no total. Comparamos com o previsto pelos itens.</p>
        <p v-if="orcamento && totalPrevisto > orcamento" class="alerta-estouro">
          Atenção: o previsto ({{ dinheiro(totalPrevisto) }}) passou do orçamento ({{ dinheiro(orcamento) }}).
        </p>
      </div>

      <div class="input-container cheio">
        <label for="responsavel">Responsável</label>
        <input type="text" id="responsavel" v-model="responsavel" placeholder="Quem é o responsável?" required>
      </div>

      <div class="duas-colunas">
        <div class="input-container">
          <label for="dataCriacao">Data de criação</label>
          <input type="date" id="dataCriacao" v-model="dataCriacao" required>
        </div>
        <div class="input-container">
          <label for="prazo">Prazo</label>
          <input type="date" id="prazo" v-model="prazo">
        </div>
      </div>

      <div class="duas-colunas">
        <div class="input-container">
          <label for="status">Status</label>
          <select id="status" v-model="status">
            <option>Planejamento</option>
            <option>Em andamento</option>
            <option>Concluído</option>
          </select>
        </div>
        <div class="input-container">
          <label for="prioridade">Prioridade</label>
          <select id="prioridade" v-model="prioridade">
            <option>Alta</option>
            <option>Média</option>
            <option>Baixa</option>
          </select>
        </div>
      </div>

      <!-- Progresso de 0 a 100% -->
      <div class="input-container cheio">
        <label for="progresso">Progresso do projeto: {{ progresso }}%</label>
        <input type="range" id="progresso" min="0" max="100" step="5" v-model.number="progresso">
        <div class="barra-fundo"><div class="barra-preenchida" :style="{ width: progresso + '%' }"></div></div>
      </div>

      <div class="input-container cheio">
        <label class="favorito-linha">
          <input type="checkbox" v-model="favorito">
          <span>★ Marcar como favorito</span>
        </label>
      </div>

      <input type="submit" class="submit-btn" value="Cadastrar Projeto">

    </form>
  </div>
</template>

<script>
import Message from "./Message.vue";
import { api, categorias } from "../services/api";
import { auth } from "../stores/auth";
import { dinheiro, custoItem, somaItens, somaComprado } from "../services/utils";

export default {
  name: "ProjetoForm",

  components: { Message },

  data() {
    return {
      nome: "",
      descricao: "",
      categoria: "",
      subcategoria: "",
      itens: [],
      novoItem: "",
      categorias: [],
      orcamento: "",
      responsavel: auth.usuario?.nome || "",
      dataCriacao: new Date().toISOString().slice(0, 10),
      prazo: "",
      status: "Planejamento",
      prioridade: "Média",
      progresso: 0,
      favorito: false,
      msg: null
    };
  },

  computed: {
    subcategorias() {
      const c = this.categorias.find(c => c.nome === this.categoria);
      return c ? c.subcategorias : [];
    },
    itensDisponiveis() {
      const sc = this.subcategorias.find(sc => sc.nome === this.subcategoria);
      return sc ? sc.itens : [];
    },
    totalPrevisto() {
      return somaItens(this.itens);
    },
    totalComprado() {
      return somaComprado(this.itens);
    }
  },

  mounted() {
    this.carregarCategorias();
  },

  methods: {
    dinheiro,
    custoItem,

    // Busca categorias, subcategorias e itens no banco
    async carregarCategorias() {
      try {
        this.categorias = await categorias();
      } catch (e) {
        this.msg = e.message;
      }
    },

    // Limpa a seleção só quando a pessoa realmente troca o campo (evita apagar itens sem querer)
    aoTrocarCategoria() {
      this.subcategoria = "";
      this.itens = [];
    },
    aoTrocarSubcategoria() {
      this.itens = [];
    },

    itemSelecionado(nome) {
      return this.itens.some(i => i.nome === nome);
    },
    alternarItem(nome) {
      const idx = this.itens.findIndex(i => i.nome === nome);
      if (idx >= 0) this.itens.splice(idx, 1);
      else this.itens.push({ nome, quantidade: 1, valorUnitario: 0, comprado: false });
    },
    adicionarPersonalizado() {
      const nome = this.novoItem.trim();
      if (!nome) return;
      if (!this.itemSelecionado(nome)) this.itens.push({ nome, quantidade: 1, valorUnitario: 0, comprado: false });
      this.novoItem = "";
    },
    removerItem(idx) {
      this.itens.splice(idx, 1);
    },

    // Envia o projeto para o servidor
    async createProjeto() {
      const projeto = {
        nome: this.nome,
        descricao: this.descricao,
        categoria: this.categoria,
        subcategoria: this.subcategoria,
        itens: this.itens.map(i => ({
          nome: i.nome,
          quantidade: Number(i.quantidade) || 0,
          valorUnitario: Number(i.valorUnitario) || 0,
          comprado: i.comprado === true
        })),
        orcamento: Number(this.orcamento) || 0,
        responsavel: this.responsavel,
        dataCriacao: this.dataCriacao,
        prazo: this.prazo,
        status: this.status,
        prioridade: this.prioridade,
        progresso: Number(this.progresso) || 0,
        favorito: this.favorito
      };

      try {
        await api("/projetos", { metodo: "POST", corpo: projeto });
        this.msg = "Projeto cadastrado com sucesso!";
        this.limparFormulario();
      } catch (erro) {
        this.msg = erro.message;
      }

      setTimeout(() => (this.msg = null), 4000);
    },

    // Volta os campos ao estado inicial
    limparFormulario() {
      this.nome = "";
      this.descricao = "";
      this.categoria = "";
      this.subcategoria = "";
      this.itens = [];
      this.novoItem = "";
      this.orcamento = "";
      this.responsavel = auth.usuario?.nome || "";
      this.dataCriacao = new Date().toISOString().slice(0, 10);
      this.prazo = "";
      this.status = "Planejamento";
      this.prioridade = "Média";
      this.progresso = 0;
      this.favorito = false;
    }
  }
};
</script>

<style scoped>
#projeto-form {
  max-width: 760px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 20px;
  padding: 30px;
  background: var(--branco);
  border: 1px solid var(--borda);
  border-top: 5px solid var(--azul);
  border-radius: 16px;
  box-shadow: var(--sombra);
}

.input-container { display: flex; flex-direction: column; margin-bottom: 20px; }

label { margin-bottom: 6px; color: #222; font-size: 14px; font-weight: 600; }

input,
select,
textarea {
  width: 100%;
  padding: 12px;
  background: var(--branco);
  border: 2px solid var(--borda);
  border-radius: 8px;
  font-family: inherit;
  font-size: 15px;
  outline: none;
  transition: var(--transicao);
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--azul);
  box-shadow: 0 0 0 3px rgba(124, 200, 255, 0.35);
}

textarea { height: 120px; resize: none; }

.submit-btn {
  padding: 14px;
  background: var(--azul);
  color: var(--branco);
  border: none;
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:hover { background: var(--azul-escuro); color: var(--branco); transform: translateY(-2px); }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }

.chip {
  margin: 0;
  padding: 6px 14px;
  background: var(--branco);
  border: 2px solid var(--borda);
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transicao);
}

.chip:hover { border-color: var(--azul); }
.chip.on { background: var(--azul); border-color: var(--azul); color: var(--branco); animation: estalar 0.3s ease; }

/* ---- Itens com quantidade e preço ---- */
.add-item { display: flex; gap: 8px; margin-bottom: 12px; }
.add-item input { flex: 1; }
.btn-add {
  flex-shrink: 0;
  padding: 0 16px;
  background: var(--azul);
  color: var(--branco);
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.btn-add:hover { background: var(--azul-escuro); }

.vazio-itens { color: var(--texto-suave); font-size: 14px; padding: 8px 0; }

.tabela-itens {
  border: 1px solid var(--borda);
  border-radius: 10px;
  overflow: hidden;
}
.linha-item {
  display: grid;
  grid-template-columns: 1.6fr 70px 110px 100px 70px 36px;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid var(--borda);
}
.linha-item:last-child { border-bottom: 0; }
.linha-item.cabecalho {
  background: #f7fbff;
  font-size: 12px;
  font-weight: 700;
  color: var(--texto-suave);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.linha-item input { padding: 8px; font-size: 14px; }
.nome-item { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.subtotal { font-weight: 700; font-size: 14px; }
.check { display: grid; place-items: center; margin: 0; }
.check input { width: 18px; height: 18px; cursor: pointer; }
.check span { display: none; }
.remover {
  width: 30px; height: 30px;
  background: #fff0f0; color: #a52b2b;
  border: 0; border-radius: 7px;
  font-size: 18px; line-height: 1; cursor: pointer;
}
.remover:hover { background: #ffe0e0; }

.resumo-itens {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 12px;
}
.resumo-itens div {
  padding: 12px;
  background: #f7fbff;
  border: 1px solid var(--borda);
  border-radius: 10px;
}
.resumo-itens span { display: block; font-size: 12px; color: var(--texto-suave); }
.resumo-itens strong { display: block; margin-top: 3px; font-size: 18px; }
.resumo-itens strong.comprado { color: #207345; }

/* ---- Orçamento ---- */
.moeda { position: relative; }
.moeda span {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--texto-suave); font-weight: 700;
}
.moeda input { padding-left: 44px; }
.dica-campo { margin-top: 6px; color: var(--texto-suave); font-size: 13px; }
.alerta-estouro {
  margin-top: 8px; padding: 8px 12px;
  background: #fff4e5; border: 1px solid #f3cf9a; border-radius: 8px;
  color: #8a5300; font-size: 13px; font-weight: 600;
}

/* ---- Progresso ---- */
input[type="range"] { padding: 0; height: 8px; accent-color: var(--azul); }
.barra-fundo { height: 10px; margin-top: 8px; border-radius: 20px; background: #eaf1f7; overflow: hidden; }
.barra-preenchida { height: 100%; border-radius: 20px; background: var(--azul); transition: width 0.3s ease; }

/* ---- Favorito ---- */
.favorito-linha { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.favorito-linha input { width: 18px; height: 18px; }
.favorito-linha span { color: #b8860b; font-weight: 700; }

@keyframes estalar {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.submit-btn { position: relative; overflow: hidden; }
.submit-btn::after {
  content: "";
  position: absolute; top: 0; left: -70%;
  width: 40%; height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  transform: skewX(-20deg);
  pointer-events: none;
}
.submit-btn:hover::after { left: 130%; transition: left 0.7s ease; }

.cheio, .duas-colunas, .submit-btn { grid-column: 1 / -1; }
.duas-colunas { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

@media (max-width: 650px) {
  .duas-colunas { grid-template-columns: 1fr; }
  #projeto-form { grid-template-columns: 1fr; padding: 20px; }
  .linha-item { grid-template-columns: 1.4fr 54px 90px 44px 32px; }
  .linha-item .subtotal { display: none; }
  .linha-item.cabecalho span:nth-child(4) { display: none; }
  .resumo-itens { grid-template-columns: 1fr; }
}
</style>
