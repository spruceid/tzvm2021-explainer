<script lang="ts">
  import Alert from "./Alert.svelte";
  import Footer from "./Footer.svelte";
  let clazz: string;
  export { clazz as class };
</script>

<div
  class="flex flex-grow text-white 2xl:px-16 max-w-full px-8 overflow-hidden-x {clazz}"
>
  <slot />
</div>
<Alert />
