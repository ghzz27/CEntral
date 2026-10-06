<template>
  <div>
    <Banner title="Ajuda" subtitle="Aprenda a usar cada parte do site" />

    <div class="main-container">
      <h1 class="titulo-pagina">Como usar a Central Projetos</h1>
      <p class="intro anim-subir">
        Esta página explica o que cada parte do site faz, com o passo a passo para usar.
        Leia na ordem ou vá direto ao assunto que você precisa.
      </p>

      <!-- Guias: uma caixa para cada parte do site -->
      <section class="guias">
        <article class="guia anim-subir" v-for="(g, i) in guias" :key="g.titulo"
                 :style="{ animationDelay: (i * 0.1) + 's' }">
          <span class="num">{{ String(i + 1).padStart(2, '0') }}</span>
          <h2>{{ g.titulo }}</h2>
          <p>{{ g.texto }}</p>
          <ol>
            <li v-for="passo in g.passos" :key="passo">{{ passo }}</li>
          </ol>
          <RouterLink v-if="g.link" :to="g.link" class="ir">{{ g.botao }}</RouterLink>
        </article>
      </section>

      <!-- Perguntas frequentes -->
      <h2 class="sub-titulo">Perguntas frequentes</h2>
      <section class="faq">
        <details v-for="f in perguntas" :key="f.p" class="anim-subir">
          <summary>{{ f.p }}</summary>
          <p>{{ f.r }}</p>
        </details>
      </section>

      <div class="ajuda-final anim-subir">
        <strong>Ainda com dúvida?</strong>
        <span>Fale com a nossa equipe.</span>
        <RouterLink to="/Suporte" class="btn">Ir para o suporte</RouterLink>
      </div>
    </div>
  </div>
</template>

<script>
import Banner from '../components/Banner.vue';

export default {
  name: 'Ajuda',
  components: { Banner },

  data() {
    return {
      guias: [
        {
          titulo: "Início",
          texto: "É a primeira tela do site. Mostra o resumo da plataforma e a animação de construção.",
          passos: [
            "Veja a animação: o foguete mostra o andamento enquanto muros, sites, casas e carros são construídos.",
            "Confira os números: total de projetos, em andamento e concluídos.",
            "Use os botões Criar Projeto e Ver Projetos para ir direto ao que precisa."
          ],
          link: "/", botao: "Ir para o início"
        },
        {
          titulo: "Conta e login",
          texto: "Cada pessoa tem a sua conta, e os projetos criados ficam ligados a ela.",
          passos: [
            "Clique em Login no menu e escolha Criar conta (nome, e-mail e senha de pelo menos 6 caracteres).",
            "Depois de entrar, o botão Login some e aparecem Cadastrar Projeto e Conta no menu.",
            "Em Conta você vê os dados da sua conta e o resumo dos seus projetos, e pode sair da conta.",
            "Sem login você só vê os Projetos Prontos, que são exemplos. Para cadastrar, é preciso entrar."
          ],
          link: "/Login", botao: "Entrar ou criar conta"
        },
        {
          titulo: "Cadastrar projeto",
          texto: "Aqui você cria um projeto novo e ele fica salvo no banco de dados, na sua conta.",
          passos: [
            "Entre na sua conta (o cadastro só funciona com login).",
            "Escreva o nome e a descrição do projeto.",
            "Escolha a categoria, por exemplo Construção, Sites ou Manutenção de carros.",
            "Escolha a subcategoria. A lista muda conforme a categoria escolhida.",
            "Marque os itens usados (tijolo, HTML, porta e outros). Eles também mudam conforme a subcategoria.",
            "Digite o orçamento, que é o valor que vai ser gasto no projeto. O total aparece em reais enquanto você digita.",
            "Informe o responsável e o status e clique em Cadastrar Projeto."
          ],
          link: "/CadastrosProjetos", botao: "Cadastrar agora"
        },
        {
          titulo: "Lista de projetos",
          texto: "Mostra os projetos da sua conta em cards. Sem login, mostra projetos prontos de exemplo.",
          passos: [
            "Cada card mostra número, status, descrição, categoria, responsável, itens e orçamento.",
            "Descrições grandes ficam resumidas. Clique em Ver mais para ler tudo.",
            "Troque o status no seletor do card: Planejamento, Em andamento ou Concluído.",
            "Clique em Excluir para apagar. O site pede confirmação antes."
          ],
          link: "/Projetos", botao: "Ver projetos"
        },
        {
          titulo: "Categorias e itens",
          texto: "Organizam os projetos por tipo de trabalho.",
          passos: [
            "Construção: casa, muro e reforma, com materiais como tijolo e cimento.",
            "Sites: institucional, loja virtual e outros, com tecnologias como HTML e Python.",
            "Manutenção de carros: lataria, motor, freios e elétrica, com as peças.",
            "Tudo vem do banco de dados (arquivo db/db.json)."
          ]
        },
        {
          titulo: "Servidor e banco de dados",
          texto: "Para salvar e carregar projetos, o servidor precisa estar ligado.",
          passos: [
            "Abra um terminal na pasta do projeto e rode npm run server.",
            "Abra outro terminal e rode npm run dev para ligar o site.",
            "Se aparecer aviso de erro ao carregar, confira se o servidor está rodando."
          ]
        },
        {
          titulo: "Menu e rodapé",
          texto: "Ajudam a navegar por todo o site.",
          passos: [
            "O menu do topo leva para Início, Projetos e Login. Depois de entrar, aparecem Painel de Controle, Cadastrar Projeto e Conta.",
            "No rodapé ficam os atalhos de Ajuda, Suporte e Voltar ao topo."
          ]
        }
      ],

      perguntas: [
        { p: "Meus projetos sumiram. O que fazer?", r: "Confira se o servidor está ligado com npm run server. Os projetos ficam no arquivo db/db.json e não são apagados ao reiniciar." },
        { p: "Posso mudar a categoria de um projeto depois?", r: "Por enquanto só o status pode ser alterado no card. Para mudar a categoria, exclua o projeto e cadastre de novo." },
        { p: "Posso escolher mais de um item?", r: "Sim. Marque quantos itens quiser. Clique de novo para desmarcar." },
        { p: "Por que a lista de itens mudou?", r: "Os itens dependem da subcategoria. Ao trocar a subcategoria, aparecem os itens daquele tipo de trabalho." },
        { p: "Como ver o texto completo de uma descrição?", r: "Clique em Ver mais no card do projeto. Para voltar a resumir, clique em Ver menos." }
      ]
    }
  }
}
</script>

<style scoped>
.intro {
  max-width: 720px;
  margin: 0 auto 30px;
  text-align: center;
  color: var(--texto-suave);
}

.guias {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* Caixa com detalhes pretos marcantes */
.guia {
  position: relative;
  min-width: 0;
  padding: 26px 24px 24px;
  background: var(--branco);
  border: 3px solid var(--preto);
  border-radius: 16px;
  box-shadow: 6px 6px 0 var(--preto);
  transition: var(--transicao);
}

.guia:hover {
  transform: translate(-3px, -3px);
  box-shadow: 10px 10px 0 var(--azul);
}

.num {
  display: inline-block;
  margin-bottom: 12px;
  padding: 4px 14px;
  background: var(--preto);
  color: var(--azul-claro);
  font-size: 20px;
  font-weight: 700;
  border-radius: 8px;
}

.guia h2 {
  margin-bottom: 6px;
  color: var(--preto);
  font-size: 22px;
}

.guia > p { color: var(--texto-suave); margin-bottom: 14px; overflow-wrap: anywhere; }

.guia ol { padding-left: 22px; }

.guia li {
  margin-bottom: 8px;
  font-size: 15px;
  overflow-wrap: anywhere;
}

.guia li::marker { color: var(--azul); font-weight: 700; }

.ir {
  display: inline-block;
  margin-top: 10px;
  padding: 8px 16px;
  background: var(--preto);
  color: var(--branco);
  font-weight: 700;
  border-radius: 8px;
  transition: var(--transicao);
}

.ir:hover { background: var(--azul); transform: translateX(4px); }

/* ---- Perguntas frequentes ---- */
.sub-titulo {
  margin: 50px 0 20px;
  padding-left: 14px;
  color: var(--preto);
  border-left: 8px solid var(--preto);
}

.faq { display: grid; gap: 12px; }

details {
  background: var(--branco);
  border: 3px solid var(--preto);
  border-radius: 12px;
  overflow: hidden;
}

summary {
  padding: 14px 18px;
  font-weight: 700;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  transition: var(--transicao);
}

summary::-webkit-details-marker { display: none; }
summary::after { content: "+"; font-size: 22px; line-height: 1; color: var(--azul); transition: transform 0.25s ease; }
summary:hover { background: #eef7ff; }
details[open] summary { background: var(--preto); color: var(--branco); }
details[open] summary::after { transform: rotate(45deg); color: var(--azul-claro); }

details p {
  padding: 14px 18px;
  color: var(--texto-suave);
  overflow-wrap: anywhere;
  animation: aparecer 0.4s ease both;
}

/* ---- Final ---- */
.ajuda-final {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 50px;
  padding: 24px 28px;
  background: var(--preto);
  color: var(--branco);
  border-bottom: 6px solid var(--azul);
  border-radius: 16px;
}

.ajuda-final strong { color: var(--azul-claro); font-size: 20px; }
.ajuda-final .btn { margin-left: auto; }

@media (max-width: 700px) {
  .guias { grid-template-columns: 1fr; }
  .ajuda-final .btn { margin-left: 0; }
}
</style>
