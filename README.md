# Central Projetos

Projeto Vue.js para cadastro e gerenciamento de projetos, com contas de usuário e login. Os dados ficam em `db/db.json`.

## Contas e login

- Cada pessoa cria a própria conta (nome, e-mail e senha) e entra com ela.
- Sem login: o site mostra **Projetos Prontos** (exemplos em `db/vitrine.json`) e o botão **Login** aparece no lugar de *Cadastrar Projeto*.
- Com login: o botão *Login* some e aparecem **Cadastrar Projeto** e **Conta** (dados da conta e resumo dos projetos).
- Os projetos de cada pessoa ficam salvos dentro do próprio usuário no `db/db.json` e só ela enxerga.
- A senha nunca é guardada: só um hash (scrypt). O login dura 7 dias.
- O servidor (`server/index.js`) só usa módulos do Node. O `json-server` não é mais usado e pode ser removido com `npm uninstall json-server`.
- Pare o servidor antes de editar o `db/db.json` na mão (ele mantém o arquivo em memória). A chave dos logins fica em `db/.segredo` (criada sozinha, já está no `.gitignore`).

## O que foi melhorado

- Dashboard com total, status e categorias.
- Pesquisa por nome, descrição, responsável e categoria.
- Filtro por categoria e status.
- Página de detalhes de cada projeto.
- Edição completa de projetos.
- Status pode ser alterado diretamente nos cards.
- Confirmação antes de excluir.
- Data de criação e prazo.
- Orçamento e informações organizadas.
- Layout responsivo para telas menores.

## Novidades desta versão

- **Itens com quantidade e valor:** cada item do projeto tem quantidade, valor unitário e a marcação “já comprado”. O detalhe e o Dashboard mostram o total previsto, o quanto já foi comprado e a comparação com o orçamento planejado. (Projetos e exemplos antigos, que tinham só o nome do item, continuam funcionando e aparecem como etiquetas.)
- **Progresso e prazos:** cada projeto tem um progresso de 0 a 100% (barra nos cards e no detalhe) e alertas de prazo (atrasado ou vence em até 7 dias).
- **Conta mais completa:** recuperar senha esquecida, trocar a senha, editar o perfil (nome e e-mail) e excluir a conta.
- **Prioridade e favoritos:** cada projeto tem prioridade (Alta, Média ou Baixa) e pode ser marcado como favorito; dá para filtrar só os favoritos e a lista já ordena favoritos e prioridade alta primeiro.
- **Exportar e imprimir:** botão para exportar os projetos em CSV e opção de imprimir / salvar o detalhe em PDF.

> A recuperação de senha funciona em **modo demonstração**: como o projeto não envia e-mails, o próprio sistema mostra o código de recuperação na tela para você concluir a troca.

## Como executar

Abra o projeto no terminal e rode:

```bash
npm install
```

Depois abra dois terminais.

Terminal 1:

```bash
npm run server
```

Terminal 2:

```bash
npm run dev
```

Acesse o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

## Rotas principais

- `/` - Início
- `/Login` - Entrar / criar conta
- `/Conta` - Dados da conta (exige login)
- `/Dashboard` - Painel (exige login)
- `/Projetos` - Meus projetos (logado) ou Projetos Prontos (visitante)
- `/ProjetosProntos/:id` - Detalhes de um projeto pronto
- `/CadastrosProjetos` - Cadastro (exige login)
- `/Projetos/:id` - Detalhes (exige login)
- `/EditarProjeto/:id` - Edição (exige login)
