<script lang="ts">
  import CloseIcon from "./CloseIcon.svelte";

  import { alert } from "../store";
  import { onMount } from "svelte";

  let resetTimeout: NodeJS.Timeout = null;
  let subscriptionTimeout: NodeJS.Timeout = null;
  let error: string = "bg-red-100 border border-red-400 text-red-700";
  let warning: string =
    "bg-orange-100 border border-orange-400 text-orange-700";
  let success: string = "bg-green-100 border border-green-400 text-green-700";
  let info: string = "bg-blue-100 border border-blue-400 text-blue-700";
  let style: string = "";
  let iconColor: string = "";
  let fade: boolean = false;

  const reset = () => {
    if (resetTimeout) clearTimeout(resetTimeout);
    fade = false;
    resetTimeout = setTimeout(() => alert.set(null), 500);
  };

  const updateStyle = () => {
    switch ($alert?.variant) {
      case "error":
        style = error;
        iconColor = "text-red-500";
        break;
      case "warning":
        style = warning;
        iconColor = "text-orange-500";
        break;
      case "success":
        style = success;
        iconColor = "text-green-500";
        break;
      case "info":
        style = info;
        iconColor = "text-blue-500";
        break;
      default:
        style = error;
        iconColor = "text-red-500";
        break;
    }
  };

  onMount(() => {
    alert.subscribe((message) => {
      if (message) {
        updateStyle();
        fade = true;
      }
    });
  });
</script>

<div
  class="pl-4 pr-8 py-3 rounded fixed top-6 left-0 right-0 w-72 mx-auto
    lg:w-fit-content lg:max-w-2/3 lg:min-w-72
    transition-all ease-in-out duration-500
    {style} "
  role="alert"
  class:opacity-0={!fade}
  class:hidden={!$alert?.message}
>
  <span class="block sm:inline pr-4">{$alert?.message}</span>
  <span class="absolute top-0 bottom-0 right-0 px-4 py-3" on:click={reset}>
    <CloseIcon class="fill-current h-6 w-6 {iconColor}" />
  </span>
</div>
