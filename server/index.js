// Servidor da Central Projetos: contas, login e projetos de cada usuário.
// Usa só módulos que já vêm com o Node (nada novo para instalar).
// Rode com: npm run server

import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'

const scrypt = promisify(scryptCb)

const PASTA_DB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'db')
const ARQ_DB = path.join(PASTA_DB, 'db.json')
const ARQ_VITRINE = path.join(PASTA_DB, 'vitrine.json')
const ARQ_SEGREDO = path.join(PASTA_DB, '.segredo')

const PORTA = Number(process.env.PORT) || 3000
const VALIDADE_TOKEN_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias
const VALIDADE_RESET_MS = 15 * 60 * 1000 // 15 minutos
const STATUS = ['Planejamento', 'Em andamento', 'Concluído']
const PRIORIDADES = ['Alta', 'Média', 'Baixa']

/* =====================================================
   BANCO DE DADOS
   O arquivo db/db.json é lido uma vez e fica em memória (consultas
   instantâneas). Cada usuário guarda os próprios projetos dentro dele,
   então uma conta nunca enxerga os projetos de outra.
===================================================== */
const lerJson = arquivo => JSON.parse(readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, ''))

if (!existsSync(ARQ_DB)) {
  console.error(`Não encontrei o banco de dados em ${ARQ_DB}.\nCopie o arquivo db/db.json do projeto para essa pasta e rode de novo.`)
  process.exit(1)
}
// Deixa um item de projeto no formato novo: { nome, quantidade, valorUnitario, comprado }.
// Projetos antigos guardavam só o nome (texto); aqui eles são convertidos sem perder nada.
function normalizarItemGuardado(i) {
  if (typeof i === 'string') return { nome: i, quantidade: 1, valorUnitario: 0, comprado: false }
  return {
    nome: String(i?.nome || ''),
    quantidade: Number(i?.quantidade) || 0,
    valorUnitario: Number(i?.valorUnitario) || 0,
    comprado: i?.comprado === true
  }
}

const db = lerJson(ARQ_DB)
db.categorias ??= []
db.usuarios ??= []
if (Array.isArray(db.projetos) && db.projetos.length === 0) delete db.projetos // lista antiga, sem dono
// Migração automática: garante que todo projeto tenha os campos novos (itens detalhados,
// progresso, prioridade e favorito). Vale tanto para dados antigos quanto novos.
for (const u of db.usuarios) {
  u.projetos ??= []
  for (const p of u.projetos) {
    p.itens = Array.isArray(p.itens) ? p.itens.map(normalizarItemGuardado).filter(i => i.nome) : []
    p.progresso = Number.isFinite(Number(p.progresso)) ? Math.min(100, Math.max(0, Math.round(Number(p.progresso)))) : 0
    p.prioridade = PRIORIDADES.includes(p.prioridade) ? p.prioridade : 'Média'
    p.favorito = p.favorito === true
  }
}

const maiorId = lista => lista.reduce((maior, x) => Math.max(maior, Number(x.id) || 0), 0)
db.contadores ??= {}
db.contadores.usuarios = Math.max(db.contadores.usuarios || 0, maiorId(db.usuarios))
db.contadores.projetos = Math.max(db.contadores.projetos || 0, ...db.usuarios.map(u => maiorId(u.projetos)))

// Projetos prontos (exemplos que qualquer visitante pode ver). Só leitura.
const vitrine = existsSync(ARQ_VITRINE) ? lerJson(ARQ_VITRINE) : []

// Salva no disco depois de uma pequena espera, juntando várias alterações
// seguidas em uma gravação só. Grava num arquivo temporário e troca, para
// nunca deixar o db.json pela metade.
let temporizador = null
function salvar() {
  clearTimeout(temporizador)
  temporizador = setTimeout(gravar, 200)
}
function gravar() {
  clearTimeout(temporizador)
  temporizador = null
  writeFileSync(ARQ_DB + '.tmp', JSON.stringify(db, null, 2))
  renameSync(ARQ_DB + '.tmp', ARQ_DB)
}
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    if (temporizador) gravar()
    process.exit(0)
  })
}

/* =====================================================
   SEGURANÇA: senha e token
===================================================== */
function carregarSegredo() {
  if (process.env.SEGREDO_TOKEN) return process.env.SEGREDO_TOKEN
  if (existsSync(ARQ_SEGREDO)) return readFileSync(ARQ_SEGREDO, 'utf8').trim()
  const novo = randomBytes(32).toString('hex')
  writeFileSync(ARQ_SEGREDO, novo, { mode: 0o600 })
  return novo
}
const SEGREDO = carregarSegredo()

// A senha nunca é guardada: só o "hash" (scrypt + sal aleatório).
async function gerarHash(senha) {
  const sal = randomBytes(16)
  const hash = await scrypt(senha, sal, 64)
  return `${sal.toString('hex')}:${hash.toString('hex')}`
}
async function conferirSenha(senha, guardado) {
  const [sal, hash] = guardado.split(':')
  const esperado = Buffer.from(hash, 'hex')
  const calculado = await scrypt(senha, Buffer.from(sal, 'hex'), esperado.length)
  return timingSafeEqual(calculado, esperado)
}
const HASH_FALSO = await gerarHash('senha-falsa') // gasta o mesmo tempo quando o e-mail não existe

const assinar = corpo => createHmac('sha256', SEGREDO).update(corpo).digest()

function emitirToken(usuario, tipo = 'sessao', validadeMs = VALIDADE_TOKEN_MS) {
  const corpo = Buffer.from(JSON.stringify({ sub: usuario.id, tipo, exp: Date.now() + validadeMs })).toString('base64url')
  return `${corpo}.${assinar(corpo).toString('base64url')}`
}
function lerToken(token) {
  const [corpo, assinatura] = String(token).split('.')
  if (!corpo || !assinatura) return null
  const recebida = Buffer.from(assinatura, 'base64url')
  const esperada = assinar(corpo)
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return null
  try {
    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString())
    return dados.exp > Date.now() ? dados : null
  } catch {
    return null
  }
}

// Limita tentativas de login/cadastro por IP (evita adivinhar senhas)
const tentativas = new Map()
function limitar(chave, maximo = 10, janelaMs = 10 * 60 * 1000) {
  const agora = Date.now()
  const registro = tentativas.get(chave)
  if (!registro || registro.fim < agora) return void tentativas.set(chave, { n: 1, fim: agora + janelaMs })
  if (++registro.n > maximo) throw new ErroHttp(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.')
}
setInterval(() => {
  const agora = Date.now()
  for (const [chave, r] of tentativas) if (r.fim < agora) tentativas.delete(chave)
}, 10 * 60 * 1000).unref()

/* =====================================================
   AUXILIARES
===================================================== */
class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem)
    this.status = status
  }
}

function enviar(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(dados === undefined ? undefined : JSON.stringify(dados))
}

// Respostas que não mudam (categorias e projetos prontos): o navegador guarda
// uma cópia e só baixa de novo se o conteúdo mudar.
function prepararEstatico(dados) {
  const corpo = JSON.stringify(dados)
  return { corpo, etag: `"${createHash('sha1').update(corpo).digest('base64url')}"` }
}
const estaticos = { categorias: prepararEstatico(db.categorias), vitrine: prepararEstatico(vitrine) }

function enviarEstatico(req, res, { corpo, etag }) {
  const cabecalhos = { ETag: etag, 'Cache-Control': 'public, max-age=300' }
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, cabecalhos)
    return res.end()
  }
  res.writeHead(200, { ...cabecalhos, 'Content-Type': 'application/json; charset=utf-8' })
  res.end(corpo)
}

function lerCorpo(req, limite = 100_000) {
  return new Promise((resolve, reject) => {
    const partes = []
    let tamanho = 0
    req.on('data', parte => {
      tamanho += parte.length
      if (tamanho <= limite) partes.push(parte)
    })
    req.on('error', reject)
    req.on('end', () => {
      if (tamanho > limite) return reject(new ErroHttp(413, 'Dados grandes demais.'))
      try {
        const corpo = partes.length ? JSON.parse(Buffer.concat(partes).toString()) : {}
        if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) throw new Error()
        resolve(corpo)
      } catch {
        reject(new ErroHttp(400, 'Dados inválidos.'))
      }
    })
  })
}

function autenticar(req) {
  const cabecalho = req.headers.authorization || ''
  const dados = cabecalho.startsWith('Bearer ') ? lerToken(cabecalho.slice(7)) : null
  // Um código de redefinição de senha não serve para entrar nas rotas protegidas
  const usuario = dados && dados.tipo !== 'reset' && db.usuarios.find(u => u.id === dados.sub)
  if (!usuario) throw new ErroHttp(401, 'Sessão expirada. Faça login novamente.')
  return usuario
}

const publico = ({ id, nome, email, criadoEm }) => ({ id, nome, email, criadoEm })
const normalizarEmail = v => (typeof v === 'string' ? v.trim().toLowerCase() : '')

/* ---------- Validação dos campos ---------- */
function texto(valor, campo, max, obrigatorio = false) {
  const s = typeof valor === 'string' ? valor.trim() : ''
  if (obrigatorio && !s) throw new ErroHttp(400, `Preencha o campo ${campo}.`)
  if (s.length > max) throw new ErroHttp(400, `O campo ${campo} aceita no máximo ${max} caracteres.`)
  return s
}

function dia(valor, campo, obrigatorio) {
  const s = typeof valor === 'string' ? valor : ''
  if (!s && !obrigatorio) return ''
  const [a, m, d] = s.split('-').map(Number)
  const data = new Date(Date.UTC(a, m - 1, d))
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(s) && data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d
  if (!valida) throw new ErroHttp(400, `Data inválida em ${campo}.`)
  return s
}

function dinheiro(valor) {
  if (valor === '' || valor == null) return 0
  const n = Number(valor)
  if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new ErroHttp(400, 'Valor inválido.')
  return Math.round(n * 100) / 100
}

function inteiro(valor, campo, max = 1_000_000) {
  if (valor === '' || valor == null) return 0
  const n = Number(valor)
  if (!Number.isInteger(n) || n < 0 || n > max) throw new ErroHttp(400, `${campo} inválido.`)
  return n
}

function progresso(valor) {
  if (valor === '' || valor == null) return 0
  const n = Number(valor)
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new ErroHttp(400, 'Progresso inválido (use de 0 a 100).')
  return Math.round(n)
}

// Cada item do projeto: nome + quantidade + valor unitário + se já foi comprado.
// Aceita o formato antigo (só o nome em texto) para não quebrar projetos existentes.
function item(valor) {
  if (typeof valor === 'string') return { nome: texto(valor, 'item', 80, true), quantidade: 1, valorUnitario: 0, comprado: false }
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new ErroHttp(400, 'Item inválido.')
  return {
    nome: texto(valor.nome, 'item', 80, true),
    quantidade: inteiro(valor.quantidade, 'Quantidade'),
    valorUnitario: dinheiro(valor.valorUnitario),
    comprado: valor.comprado === true
  }
}

function listaDeItens(valor) {
  if (!Array.isArray(valor) || valor.length > 60) throw new ErroHttp(400, 'Lista de itens inválida.')
  return valor.map(item).filter(i => i.nome)
}

// Pega só os campos permitidos (o cliente nunca consegue mexer em id ou dono).
// Com "exigir" os campos principais são obrigatórios (criar e PUT).
function limparProjeto(c, exigir) {
  const d = {}
  const veio = k => k in c
  if (veio('nome') || exigir) d.nome = texto(c.nome, 'Nome', 120, true)
  if (veio('descricao')) d.descricao = texto(c.descricao, 'Descrição', 2000)
  if (veio('categoria') || exigir) d.categoria = texto(c.categoria, 'Categoria', 80, true)
  if (veio('subcategoria')) d.subcategoria = texto(c.subcategoria, 'Subcategoria', 80)
  if (veio('itens')) d.itens = listaDeItens(c.itens)
  if (veio('orcamento')) d.orcamento = dinheiro(c.orcamento)
  if (veio('responsavel') || exigir) d.responsavel = texto(c.responsavel, 'Responsável', 80, true)
  if (veio('dataCriacao')) d.dataCriacao = dia(c.dataCriacao, 'Data de criação', true)
  if (veio('prazo')) d.prazo = dia(c.prazo, 'Prazo', false)
  if (veio('status')) {
    if (!STATUS.includes(c.status)) throw new ErroHttp(400, 'Status inválido.')
    d.status = c.status
  }
  if (veio('progresso')) d.progresso = progresso(c.progresso)
  if (veio('prioridade')) {
    if (!PRIORIDADES.includes(c.prioridade)) throw new ErroHttp(400, 'Prioridade inválida.')
    d.prioridade = c.prioridade
  }
  if (veio('favorito')) d.favorito = c.favorito === true
  return d
}

const ip = req => req.socket.remoteAddress || 'local'

/* =====================================================
   ROTAS
===================================================== */
const rotas = []
function rota(metodo, padrao, handler, privada = false) {
  rotas.push({ metodo, regex: new RegExp(`^${padrao.replace(':id', '([^/]+)')}$`), handler, privada })
}

/* ---------- Conta ---------- */
rota('POST', '/auth/registrar', async ({ req, res, ler }) => {
  limitar(`registro|${ip(req)}`)
  const c = await ler()
  const nome = texto(c.nome, 'Nome', 60, true)
  const email = normalizarEmail(c.email)
  const senha = typeof c.senha === 'string' ? c.senha : ''

  if (nome.length < 2) throw new ErroHttp(400, 'O nome precisa ter pelo menos 2 letras.')
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, 'Digite um e-mail válido.')
  if (senha.length < 6 || senha.length > 128) throw new ErroHttp(400, 'A senha precisa ter de 6 a 128 caracteres.')
  const jaExiste = () => db.usuarios.some(u => u.email === email)
  if (jaExiste()) throw new ErroHttp(409, 'Já existe uma conta com este e-mail.')

  const senhaHash = await gerarHash(senha)
  if (jaExiste()) throw new ErroHttp(409, 'Já existe uma conta com este e-mail.') // outro cadastro igual terminou antes

  const usuario = { id: ++db.contadores.usuarios, nome, email, senhaHash, criadoEm: new Date().toISOString(), projetos: [] }
  db.usuarios.push(usuario)
  salvar()
  enviar(res, 201, { token: emitirToken(usuario), usuario: publico(usuario) })
})

rota('POST', '/auth/login', async ({ req, res, ler }) => {
  const chave = `login|${ip(req)}`
  limitar(chave)
  const c = await ler()
  const usuario = db.usuarios.find(u => u.email === normalizarEmail(c.email))
  const senha = typeof c.senha === 'string' && c.senha.length <= 128 ? c.senha : ''
  const certa = await conferirSenha(senha, usuario ? usuario.senhaHash : HASH_FALSO)
  if (!usuario || !certa) throw new ErroHttp(401, 'E-mail ou senha incorretos.')
  tentativas.delete(chave)
  enviar(res, 200, { token: emitirToken(usuario), usuario: publico(usuario) })
})

rota('GET', '/auth/eu', ({ res, usuario }) => {
  enviar(res, 200, { usuario: publico(usuario), totalProjetos: usuario.projetos.length })
}, true)

// Esqueci a senha: como o app roda local (sem servidor de e-mail), devolvemos o
// código de redefinição direto para o usuário usá-lo na próxima tela. A resposta
// é sempre "ok" para não revelar quais e-mails têm conta.
rota('POST', '/auth/esqueci', async ({ req, res, ler }) => {
  limitar(`esqueci|${ip(req)}`)
  const c = await ler()
  const usuario = db.usuarios.find(u => u.email === normalizarEmail(c.email))
  const resposta = { ok: true }
  if (usuario) resposta.codigo = emitirToken(usuario, 'reset', VALIDADE_RESET_MS)
  enviar(res, 200, resposta)
})

// Redefinir a senha usando o código gerado acima.
rota('POST', '/auth/redefinir', async ({ req, res, ler }) => {
  limitar(`redefinir|${ip(req)}`)
  const c = await ler()
  const dados = lerToken(c.codigo)
  const usuario = dados && dados.tipo === 'reset' ? db.usuarios.find(u => u.id === dados.sub) : null
  if (!usuario) throw new ErroHttp(400, 'Código inválido ou expirado. Peça um novo.')
  const senha = typeof c.senha === 'string' ? c.senha : ''
  if (senha.length < 6 || senha.length > 128) throw new ErroHttp(400, 'A senha precisa ter de 6 a 128 caracteres.')
  usuario.senhaHash = await gerarHash(senha)
  salvar()
  enviar(res, 200, { token: emitirToken(usuario), usuario: publico(usuario) })
})

// Editar o perfil (nome e/ou e-mail).
rota('PATCH', '/auth/perfil', async ({ res, usuario, ler }) => {
  const c = await ler()
  if ('nome' in c) {
    const nome = texto(c.nome, 'Nome', 60, true)
    if (nome.length < 2) throw new ErroHttp(400, 'O nome precisa ter pelo menos 2 letras.')
    usuario.nome = nome
  }
  if ('email' in c) {
    const email = normalizarEmail(c.email)
    if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, 'Digite um e-mail válido.')
    if (db.usuarios.some(u => u.email === email && u.id !== usuario.id)) throw new ErroHttp(409, 'Já existe uma conta com este e-mail.')
    usuario.email = email
  }
  salvar()
  enviar(res, 200, { usuario: publico(usuario) })
}, true)

// Trocar a senha (confere a senha atual antes).
rota('PATCH', '/auth/senha', async ({ res, usuario, ler }) => {
  const c = await ler()
  const atual = typeof c.senhaAtual === 'string' ? c.senhaAtual : ''
  const nova = typeof c.novaSenha === 'string' ? c.novaSenha : ''
  if (!(await conferirSenha(atual, usuario.senhaHash))) throw new ErroHttp(401, 'Senha atual incorreta.')
  if (nova.length < 6 || nova.length > 128) throw new ErroHttp(400, 'A nova senha precisa ter de 6 a 128 caracteres.')
  usuario.senhaHash = await gerarHash(nova)
  salvar()
  enviar(res, 200, { ok: true })
}, true)

// Excluir a conta (confere a senha; apaga o usuário e todos os projetos dele).
rota('DELETE', '/auth/conta', async ({ res, usuario, ler }) => {
  const c = await ler()
  const senha = typeof c.senha === 'string' ? c.senha : ''
  if (!(await conferirSenha(senha, usuario.senhaHash))) throw new ErroHttp(401, 'Senha incorreta.')
  const i = db.usuarios.findIndex(u => u.id === usuario.id)
  if (i >= 0) db.usuarios.splice(i, 1)
  salvar()
  res.writeHead(204)
  res.end()
}, true)

/* ---------- Dados públicos ---------- */
rota('GET', '/categorias', ({ req, res }) => enviarEstatico(req, res, estaticos.categorias))
rota('GET', '/vitrine', ({ req, res }) => enviarEstatico(req, res, estaticos.vitrine))
rota('GET', '/vitrine/:id', ({ res, id }) => {
  const projeto = vitrine.find(p => String(p.id) === id)
  if (!projeto) throw new ErroHttp(404, 'Projeto não encontrado.')
  enviar(res, 200, projeto)
})

/* ---------- Projetos do usuário logado ---------- */
// Contas (quanto cada item custa) e dias até o prazo: usados no resumo do painel.
const custoItem = i => (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0)
const somaItens = p => (p.itens || []).reduce((s, i) => s + custoItem(i), 0)
const somaComprado = p => (p.itens || []).reduce((s, i) => s + (i.comprado ? custoItem(i) : 0), 0)
const arredondar = v => Math.round(v * 100) / 100
function diasAtePrazo(prazo) {
  if (!prazo) return null
  const hoje = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
  const alvo = new Date(prazo + 'T00:00:00Z')
  return Math.round((alvo - hoje) / 86_400_000)
}

// Números prontos para o painel e a conta: o navegador não precisa baixar todos os projetos.
rota('GET', '/resumo', ({ res, usuario }) => {
  const resumo = {
    total: usuario.projetos.length, planejamento: 0, andamento: 0, concluidos: 0,
    orcamentoTotal: 0, previstoTotal: 0, compradoTotal: 0,
    atrasados: 0, aVencer: 0, favoritos: 0,
    prioridades: { Alta: 0, 'Média': 0, Baixa: 0 }
  }
  const categorias = new Map()
  for (const p of usuario.projetos) {
    if (p.status === 'Concluído') resumo.concluidos++
    else if (p.status === 'Em andamento') resumo.andamento++
    else resumo.planejamento++
    categorias.set(p.categoria, (categorias.get(p.categoria) || 0) + 1)
    resumo.orcamentoTotal += Number(p.orcamento) || 0
    resumo.previstoTotal += somaItens(p)
    resumo.compradoTotal += somaComprado(p)
    if (p.favorito) resumo.favoritos++
    if (resumo.prioridades[p.prioridade] != null) resumo.prioridades[p.prioridade]++
    if (p.status !== 'Concluído') {
      const dias = diasAtePrazo(p.prazo)
      if (dias != null && dias < 0) resumo.atrasados++
      else if (dias != null && dias <= 7) resumo.aVencer++
    }
  }
  resumo.orcamentoTotal = arredondar(resumo.orcamentoTotal)
  resumo.previstoTotal = arredondar(resumo.previstoTotal)
  resumo.compradoTotal = arredondar(resumo.compradoTotal)
  resumo.categorias = [...categorias].sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor }))
  resumo.ultimos = usuario.projetos.slice(-5).reverse().map(({ id, nome, categoria, responsavel, status, prioridade, favorito, prazo, progresso }) =>
    ({ id, nome, categoria, responsavel, status, prioridade, favorito, prazo, progresso }))
  enviar(res, 200, resumo)
}, true)

const acharProjeto = (usuario, id) => {
  const posicao = usuario.projetos.findIndex(p => String(p.id) === id)
  if (posicao < 0) throw new ErroHttp(404, 'Projeto não encontrado.')
  return posicao
}

rota('GET', '/projetos', ({ res, usuario }) => enviar(res, 200, usuario.projetos), true)

rota('POST', '/projetos', async ({ res, usuario, ler }) => {
  const d = limparProjeto(await ler(), true)
  const projeto = {
    id: ++db.contadores.projetos,
    nome: d.nome,
    descricao: d.descricao ?? '',
    categoria: d.categoria,
    subcategoria: d.subcategoria ?? '',
    itens: d.itens ?? [],
    orcamento: d.orcamento ?? 0,
    responsavel: d.responsavel,
    dataCriacao: d.dataCriacao ?? new Date().toISOString().slice(0, 10),
    prazo: d.prazo ?? '',
    status: d.status ?? 'Planejamento',
    progresso: d.progresso ?? 0,
    prioridade: d.prioridade ?? 'Média',
    favorito: d.favorito ?? false
  }
  usuario.projetos.push(projeto)
  salvar()
  enviar(res, 201, projeto)
}, true)

rota('GET', '/projetos/:id', ({ res, usuario, id }) => {
  enviar(res, 200, usuario.projetos[acharProjeto(usuario, id)])
}, true)

const atualizar = exigir => async ({ res, usuario, id, ler }) => {
  const projeto = usuario.projetos[acharProjeto(usuario, id)]
  Object.assign(projeto, limparProjeto(await ler(), exigir))
  salvar()
  enviar(res, 200, projeto)
}
rota('PUT', '/projetos/:id', atualizar(true), true)
rota('PATCH', '/projetos/:id', atualizar(false), true)

rota('DELETE', '/projetos/:id', ({ res, usuario, id }) => {
  usuario.projetos.splice(acharProjeto(usuario, id), 1)
  salvar()
  res.writeHead(204)
  res.end()
}, true)

/* =====================================================
   SERVIDOR
===================================================== */
// Só aceita pedidos vindos do site rodando na sua própria máquina
const ORIGEM_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
function liberarCors(req, res) {
  const origem = req.headers.origin
  if (!origem || !ORIGEM_LOCAL.test(origem)) return
  res.setHeader('Access-Control-Allow-Origin', origem)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
}

const servidor = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  liberarCors(req, res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  try {
    const { pathname } = new URL(req.url, 'http://localhost')
    for (const r of rotas) {
      if (r.metodo !== req.method) continue
      const achou = r.regex.exec(pathname)
      if (!achou) continue
      const usuario = r.privada ? autenticar(req) : null
      return await r.handler({ req, res, id: achou[1], usuario, ler: () => lerCorpo(req) })
    }
    throw new ErroHttp(404, 'Rota não encontrada.')
  } catch (erro) {
    if (erro instanceof ErroHttp) return enviar(res, erro.status, { erro: erro.message })
    console.error(erro)
    enviar(res, 500, { erro: 'Erro interno do servidor.' })
  }
})

servidor.on('error', erro => {
  if (erro.code === 'EADDRINUSE') {
    console.error(`A porta ${PORTA} já está em uso. Feche o servidor antigo (json-server) e rode de novo.`)
    process.exit(1)
  }
  throw erro
})

servidor.listen(PORTA, () => console.log(`Servidor rodando em http://localhost:${PORTA}`))
