<script lang="ts">
  // Thin wrapper: Scopes needs the program monitor's live canvas. This is the
  // same source ColorPanel passes, so the dedicated tab shows identical scopes
  // without reimplementing the histogram / waveform code.
  import { onMount } from 'svelte';
  import { program, type Session } from '#lib/engine/session.ts';
  import Scopes from './Scopes.svelte';

  let session = $state<Session | null>(null);

  onMount(() => {
    session = program();
  });
</script>

<div class="scopes-panel">
  {#if session}
    <Scopes source={session.canvas} />
  {:else}
    <div class="empty">Scopes will appear once the program monitor is ready.</div>
  {/if}
</div>

<style>
  .scopes-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: var(--bg-surface);
    container-type: inline-size;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    text-align: center;
    font-size: 11.5px;
    color: var(--text-muted);
  }
</style>
