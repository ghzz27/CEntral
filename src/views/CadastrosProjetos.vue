<template>
  <div>
    <!-- Imagem escura + detalhes animados só no banner de cima -->
    <Banner title="Cadastrar Projeto" subtitle="Preencha os dados para criar um novo projeto"
            imagem="/img/fundoCadastro.jpg" variante="escuro" />

    <div class="main-container">
      <ProjetosForm />
    </div>
  </div>
</template>

<script>
import Banner from '../components/Banner.vue';
import ProjetosForm from '../components/ProjetosForm.vue';

export default {
  name: 'CadastrosProjetos',
  components: { Banner, ProjetosForm }
}
</script>
