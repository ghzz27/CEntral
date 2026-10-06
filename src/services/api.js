// Único ponto de comunicação com o servidor.
// Coloca o token do login em todo pedido e guarda uma cópia dos dados que não mudam.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const CHAVE_TOKEN = 'cp_token'

// localStorage pode estar bloqueado (aba anônima): nesse caso o login vale só até fechar a aba
function lerLocal(chave) {
  try { return localStorage.getItem(chave) } catch { return null }
}
export function guardarLocal(chave, valor) {
  try { valor == null ? localStorage.removeItem(chave) : localStorage.setItem(chave, valor) } catch { /* ignora */ }
}
export { lerLocal }

export const sessao = {
  token: lerLocal(CHAVE_TOKEN),
  aoExpirar: null, // função definida no main.js
  definir(token) {
    this.token = token
    guardarLocal(CHAVE_TOKEN, token)
  }
}

export class ApiError extends Error {
  constructor(status, mensagem) {
    super(mensagem)
    this.status = status
  }
}

export async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const cabecalhos = {}
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'
  if (sessao.token) cabecalhos.Authorization = `Bearer ${sessao.token}`

  let resposta
  try {
    resposta = await fetch(API_URL + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Rode npm run server.')
  }

  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null)

  if (!resposta.ok) {
    // Estava logado e o servidor recusou o token: a sessão acabou
    if (resposta.status === 401 && sessao.token) sessao.aoExpirar?.()
    throw new ApiError(resposta.status, dados?.erro || 'Algo deu errado. Tente novamente.')
  }
  return dados
}

// Categorias e projetos prontos não mudam: busca uma vez só e reaproveita
const guardados = {}
const umaVez = (chave, caminho) =>
  (guardados[chave] ??= api(caminho).catch(erro => {
    delete guardados[chave]
    throw erro
  }))

export const categorias = () => umaVez('categorias', '/categorias')
export const vitrine = () => umaVez('vitrine', '/vitrine')
