// Estado do login (sem biblioteca extra: o próprio Vue já resolve).
import { reactive } from 'vue'
import { api, sessao, guardarLocal, lerLocal } from '../services/api'

const CHAVE_USUARIO = 'cp_usuario'

function usuarioSalvo() {
  if (!sessao.token) return null
  try { return JSON.parse(lerLocal(CHAVE_USUARIO)) } catch { return null }
}

// auth.usuario é null quando ninguém está logado
export const auth = reactive({ usuario: usuarioSalvo() })

function iniciarSessao({ token, usuario }) {
  sessao.definir(token)
  guardarLocal(CHAVE_USUARIO, JSON.stringify(usuario))
  auth.usuario = usuario
}

export function limpar() {
  sessao.definir(null)
  guardarLocal(CHAVE_USUARIO, null)
  auth.usuario = null
}

export async function entrar(email, senha) {
  iniciarSessao(await api('/auth/login', { metodo: 'POST', corpo: { email, senha } }))
}

export async function registrar(nome, email, senha) {
  iniciarSessao(await api('/auth/registrar', { metodo: 'POST', corpo: { nome, email, senha } }))
}

// Atualiza nome/e-mail da conta e guarda o novo usuário.
export async function atualizarPerfil(dados) {
  const { usuario } = await api('/auth/perfil', { metodo: 'PATCH', corpo: dados })
  auth.usuario = usuario
  guardarLocal(CHAVE_USUARIO, JSON.stringify(usuario))
  return usuario
}

// Troca a senha (precisa da senha atual).
export async function trocarSenha(senhaAtual, novaSenha) {
  await api('/auth/senha', { metodo: 'PATCH', corpo: { senhaAtual, novaSenha } })
}

// Exclui a conta e encerra a sessão.
export async function excluirConta(senha) {
  await api('/auth/conta', { metodo: 'DELETE', corpo: { senha } })
  limpar()
}

// Esqueci a senha: pede o código de redefinição para o e-mail informado.
export async function esqueciSenha(email) {
  return api('/auth/esqueci', { metodo: 'POST', corpo: { email } })
}

// Redefine a senha com o código recebido e já entra na conta.
export async function redefinirSenha(codigo, senha) {
  iniciarSessao(await api('/auth/redefinir', { metodo: 'POST', corpo: { codigo, senha } }))
}

export const sair = limpar

// Ao abrir o site, confere em segundo plano se o login guardado ainda vale
export async function validarSessao() {
  if (!sessao.token) return
  try {
    const { usuario } = await api('/auth/eu')
    auth.usuario = usuario
    guardarLocal(CHAVE_USUARIO, JSON.stringify(usuario))
  } catch { /* token vencido: o api() já cuida; servidor desligado: mantém o login */ }
}
