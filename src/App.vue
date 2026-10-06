<template>
  <Navbar />

  <main class="main-content">
    <!-- Animação simples ao trocar de página -->
    <router-view v-slot="{ Component }">
      <Transition name="pagina" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
  </main>

  <Footer />
</template>

<script setup>
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}

/* Transição entre páginas */
.pagina-enter-active,
.pagina-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.pagina-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.pagina-leave-to {
  opacity: 0;
}
</style>