import { Writable, writable } from "svelte/store";

export let alert: Writable<{
  message: string;
  variant: "error" | "warning" | "success" | "info";
}> =
  writable<{
    message: string;
    variant: "error" | "warning" | "success" | "info";
  }>(null);

export let output: Writable<any> = writable(null);

export let objectView: Writable<boolean> = writable<boolean>(false);

output.subscribe(console.log);
