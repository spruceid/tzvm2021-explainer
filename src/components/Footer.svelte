<script>
  import BrandIcon from "./BrandIcon.svelte";
  import TwitterIcon from "./TwitterIcon.svelte";
  import GithubIcon from "./GithubIcon.svelte";
</script>

<div class="items-center text-white sm:flex-row flex-col flex sm:px-12 px-8">
  <a
    href="https://www.spruceid.com/"
    class="flex items-center sm:flex-grow sm:my-8 my-2 font-bold text-4xl"
    target="_blank"
  >
    <BrandIcon class="sm:h-12 h-8 mr-2" />
    Spruce
  </a>
  <a
    class="flex items-center sm:mr-12 sm:my-8 my-2"
    href="https://github.com/spruceid/"
    target="_blank"
  >
    <GithubIcon class="h-8 mr-2" />
    Github
  </a>
  <a
    class="flex items-center"
    href="https://twitter.com/sprucesystems/"
    target="_blank"
  >
    <TwitterIcon class="h-8 mr-2 sm:my-8 my-2" />
    Twitter
  </a>
</div>
