<template>
  <div>
    <!-- Imagem azul + detalhes animados só no banner de cima -->
    <Banner :title="auth.usuario ? 'Meus Projetos' : 'Projetos Prontos'"
            :subtitle="auth.usuario
              ? 'Pesquise, filtre, edite e acompanhe seus projetos'
              : 'Veja exemplos de projetos já montados. Entre na sua conta para criar os seus'"
            imagem="/img/fundoVariado.png" variante="claro" />

    <div class="main-container">
      <!-- Logado: os projetos da própria conta. Visitante: projetos prontos de exemplo -->
      <Dashboard v-if="auth.usuario" />
      <Vitrine v-else />
    </div>
  </div>
</template>

<script setup>
import Banner from '../components/Banner.vue'
import Dashboard from '../components/Dashboard.vue'
import Vitrine from '../components/Vitrine.vue'
import { auth } from '../stores/auth'
</script>
