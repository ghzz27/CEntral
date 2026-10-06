<template>
  <Transition name="msg">
    <div class="message-container" v-if="msg">
      <p>{{ msg }}</p>
    </div>
  </Transition>
</template>

<script>
export default {
  name: "Message",
  props: {
    msg: String
  }
}
</script>

<style scoped>
.message-container {
  position: fixed;
  top: 88px;
  right: 20px;
  z-index: 20;
  max-width: 360px;
  margin: 0;
  box-shadow: var(--sombra);
  padding: 12px 16px;
  text-align: center;
  font-weight: 600;
  color: #0b3a5c;
  background: #dff1ff;
  border: 2px solid var(--azul-claro);
  border-left: 6px solid var(--azul);
  border-radius: 8px;
}

/* Animação de entrada e saída */

.msg-enter-active,
.msg-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.msg-enter-from,
.msg-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>