<template>
  <nav class="navbar">
    <!-- Logo -->
    <RouterLink to="/" class="logo">
      <img src="/img/LogoProjetos.png" alt="Logo Central Projetos" />
      <span>Central Projetos</span>
    </RouterLink>

    <!-- Menu -->
    <button class="menu-btn" :aria-expanded="aberto" aria-label="Abrir menu" @click="aberto = !aberto">
      <span></span><span></span><span></span>
    </button>

    <div class="menu" :class="{ aberto }">
      <RouterLink to="/">Início</RouterLink>
      <RouterLink v-if="auth.usuario" to="/Dashboard">Painel de Controle</RouterLink>
      <RouterLink to="/Projetos">Projetos</RouterLink>

      <!-- Logado: Cadastrar Projeto + Conta. Visitante: só o botão Login -->
      <template v-if="auth.usuario">
        <RouterLink to="/CadastrosProjetos" class="botao">Cadastrar Projeto</RouterLink>
        <RouterLink to="/Conta" class="conta">
          <span class="avatar">{{ inicial }}</span>Conta
        </RouterLink>
      </template>
      <RouterLink v-else to="/Login" class="botao">Login</RouterLink>
    </div>

    <!-- Rastro de luz: corre pela borda de baixo a cada troca de página -->
    <span class="rastro" :key="chave"></span>
  </nav>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { auth } from "../stores/auth";

const route = useRoute();

// Mudar a "chave" recria o rastro e a animação começa de novo
const chave = ref(0);
const aberto = ref(false);
const inicial = computed(() => (auth.usuario?.nome || "?").charAt(0).toUpperCase());
watch(() => route.path, () => { chave.value++; aberto.value = false; });
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 70px;
  padding: 0 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--preto);

  border-bottom: 3px solid var(--azul);
  animation: aparecer 0.6s ease both;
}

/* ---- Rastro de luz na borda ---- */
.rastro {
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--azul-claro) 75%, var(--branco));
  box-shadow: 0 0 12px var(--azul-claro);
  transform-origin: left;
  transform: scaleX(0);
  pointer-events: none;
  animation: rastro 1s cubic-bezier(0.3, 0.7, 0.2, 1) both;
}

@keyframes rastro {
  0%   { transform: scaleX(0); opacity: 1; }
  65%  { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}

/* ---- Logo ---- */
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--branco);
  font-size: 22px;
  font-weight: 700;
}

.logo img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 10px;
}

/* ---- Menu ---- */
.menu {
  display: flex;
  align-items: center;
  gap: 28px;
}

.menu a {
  position: relative;
  color: var(--branco);
  padding: 6px 0;

  transition: var(--transicao);
}

/* Linha animada embaixo do link */
.menu a::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 0;
  height: 2px;
  background: var(--azul-claro);
  transition: var(--transicao);
}

.menu a:hover,
.menu a.router-link-active:not([href="/"]),
.menu a.router-link-exact-active {
  color: var(--azul-claro);
}

.menu a:hover::after,
.menu a.router-link-active:not([href="/"])::after,
.menu a.router-link-exact-active::after {
  width: 100%;
}

/* ---- Botão de cadastro ---- */
.menu a.botao {
  background: var(--azul);
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
}


.menu a.botao::after {
  display: none;
}

.menu a.botao.router-link-active { color: var(--branco); }

.menu a.botao:hover {
  background: var(--azul-claro);
  color: var(--preto);
}

/* ---- Botão da conta ---- */
.menu a.conta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 5px;
  border: 2px solid var(--azul-claro);
  border-radius: 999px;
  font-weight: 600;
}

.menu a.conta::after { display: none; }

.menu a.conta:hover {
  background: var(--azul-claro);
  color: var(--preto);
}

.avatar {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--azul-claro);
  color: var(--preto);
  font-size: 13px;
  font-weight: 800;
}

/* ---- Botão do menu (só no celular) ---- */
.menu-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  background: none;
  border: 0;
  cursor: pointer;
}

.menu-btn span {
  width: 24px;
  height: 2px;
  background: var(--branco);
}

/* ---- Celular ---- */
@media (max-width: 700px) {
  .navbar { padding: 0 16px; }
  .logo span { display: none; }
  .menu-btn { display: flex; }

  .menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 12px 16px 18px;
    background: var(--preto);
    border-bottom: 3px solid var(--azul);
  }

  .menu.aberto { display: flex; }
  .menu a { padding: 10px 0; }
  .menu a.botao { text-align: center; }
  .menu a.conta { justify-content: center; }
}
</style>
