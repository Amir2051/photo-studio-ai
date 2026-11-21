<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { requestPersistentStorage } from '#lib/storage/persist.ts';
  import TopBar from '#lib/ui/TopBar.svelte';
  import StatusBar from '#lib/ui/StatusBar.svelte';
  import PanelTabs from '#lib/ui/PanelTabs.svelte';
  import Resizer from '#lib/ui/Resizer.svelte';
  import ToolStrip from '#lib/ui/ToolStrip.svelte';
  import CommandPalette from '#lib/ui/CommandPalette.svelte';
  import ContextMenu from '#lib/ui/ContextMenu.svelte';
  import Dialogs from '#lib/ui/Dialogs.svelte';
  import DropOverlay from '#lib/ui/DropOverlay.svelte';
  import Welcome from '#lib/ui/Welcome.svelte';

  import SourceMonitor from '#lib/ui/SourceMonitor.svelte';
  import EffectControls from '#lib/ui/EffectControls.svelte';
  import AudioMixer from '#lib/ui/AudioMixer.svelte';
  import ColorPanel from '#lib/ui/ColorPanel.svelte';
  import MulticamEditor from '#lib/ui/MulticamEditor.svelte';
  import MicrophoneRecorder from '#lib/ui/MicrophoneRecorder.svelte';
  import LiveCameraCapture from '#lib/ui/LiveCameraCapture.svelte';
  import MultiCameraStudio from '#lib/ui/MultiCameraStudio.svelte';
  import LocalAudioAnalysis from '#lib/ui/LocalAudioAnalysis.svelte';
  import ScopesPanel from '#lib/ui/ScopesPanel.svelte';
  import ProgramMonitor from '#lib/ui/ProgramMonitor.svelte';
  import ProjectPanel from '#lib/ui/ProjectPanel.svelte';
  import EffectsPanel from '#lib/ui/EffectsPanel.svelte';
  import MarkersPanel from '#lib/ui/MarkersPanel.svelte';
  import HistoryPanel from '#lib/ui/HistoryPanel.svelte';
  import TextPanel from '#lib/ui/TextPanel.svelte';
  import AIReviewPanel from '#lib/ui/AIReviewPanel.svelte';
  import MIAChatPanel from '#lib/ui/MIAChatPanel.svelte';
  import VisualFrameReview from '#lib/ui/VisualFrameReview.svelte';
  import Timeline from '#lib/ui/timeline/Timeline.svelte';

  import { importFiles } from '#lib/media/import.ts';
  import { createClipFromMedia } from '#lib/project/defaults.ts';
  import { addTrack, canPlace, placeClips } from '#lib/project/ops.ts';
  import { activeSequence, cancelPreview, editSequence, isPreviewing, project, projectSession } from '#lib/project/store.ts';
  import type { RecentProject } from '#lib/project/persistence.ts';
  import { destroySessions, program } from '#lib/engine/session.ts';
  import { pickFiles } from '#lib/media/import.ts';
  import { installShortcuts } from '#lib/editor/shortcuts.ts';
  import { installClaudeBridge } from '#lib/agent/bridge.ts';
  import { activeProposalPreview, clearProposals, pendingProposalCount } from '#lib/agent/proposals.ts';
  import { pendingVisualAnalysis } from '#lib/agent/visual-analysis.ts';
  import { buildCommands } from '#lib/editor/commands.ts';
  import { exportCurrentFrame } from '#lib/editor/export-actions.ts';
  import {
    ensureProjectForImport,
    installProjectLifecycle,
    openProjectFile,
    openRecent,
    recentProjects,
    saveProject
  } from '#lib/editor/project-actions.ts';
  import {
    leftPanelTab,
    bottomPanelTab,
    panelSizes,
    dialog,
    addToast,
    selection,
    playhead,
    workspace,
    type LeftPanelTab,
    type BottomPanelTab
  } from '#lib/stores/app.ts';

  const MIN_LEFT = 280;
  const MIN_ROW = 180;

  let main = $state<HTMLElement | null>(null);
  let recents = $state<RecentProject[]>([]);

  const commands = buildCommands();

  const topTabs = [
    { id: 'source', label: 'Source' },
    { id: 'effect-controls', label: 'Adjust' },
    { id: 'color', label: 'Color' },
    { id: 'scopes', label: 'Scopes' },
    { id: 'audio-mixer', label: 'Audio Mixer' },
    { id: 'record', label: 'Record' },
    { id: 'capture', label: 'Capture' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'multicam', label: 'Multicam' },
    { id: 'production', label: 'Production' }
  ];

  // Tools opened deliberately stay put when a timeline clip is selected.
  // 'multicam' was already protected; the dedicated tool tabs follow the
  // same rule so a selection cannot yank the user out of them.
  const stickyLeftTabs = new Set<LeftPanelTab>([
    'multicam', 'scopes', 'record', 'capture', 'analysis', 'production'
  ]);

  const bottomTabs = $derived([
    { id: 'project', label: 'Media' },
    { id: 'effects', label: 'Effects' },
    { id: 'text', label: 'Text' },
    { id: 'markers', label: 'Markers' },
    { id: 'history', label: 'History' },
    { id: 'mia', label: 'MIA' },
    { id: 'visual-intelligence', label: 'Visual Intelligence' },
    { id: 'ai-review', label: 'AI Review', badge: $pendingProposalCount }
  ]);

  // a workspace is just a pair of tabs to start from, any tab stays a click away
  const workspaceTabs: Record<string, { left: LeftPanelTab; bottom: BottomPanelTab }> = {
    edit: { left: 'effect-controls', bottom: 'project' },
    color: { left: 'color', bottom: 'project' },
    effects: { left: 'effect-controls', bottom: 'effects' },
    audio: { left: 'audio-mixer', bottom: 'project' },
    record: { left: 'record', bottom: 'project' }
  };

  // The Record / Analysis tabs mount the same AudioMixer children with the
  // same inputs and recording handler, so the tool behaves identically no
  // matter which tab it is reached from.
  const audioTracks = $derived($activeSequence?.tracks.filter((t) => t.kind === 'audio') ?? []);
  const analysisClips = $derived(
    audioTracks
      .flatMap((track) => track.clips)
      .filter((clip) => clip.kind === 'audio' && clip.enabled !== false && !!clip.mediaId)
  );

  async function addRecording(file: File, requestedTrackId: string) {
    const imported = await importFiles([file]);
    const media = imported.find((item) => item.kind === 'audio' && item.status === 'ready');
    if (!media) throw new Error('The recording was captured, but the editor could not decode it as audio.');
    const seq = get(activeSequence);
    if (!seq) throw new Error('Open a sequence before recording audio.');
    const clip = createClipFromMedia(media, get(playhead), { kind: 'audio', fps: seq.fps }).audio;
    if (!clip) throw new Error('The captured file did not contain a usable audio stream.');
    let placedTrackId: string | null = null;
    editSequence('record microphone audio', (draftSeq) => {
      let target = draftSeq.tracks.find((track) => track.id === requestedTrackId && track.kind === 'audio' && !track.locked);
      if (!target || !canPlace(draftSeq, target.id, clip.start, clip.duration)) {
        target = draftSeq.tracks.find((track) => track.kind === 'audio' && !track.locked && canPlace(draftSeq, track.id, clip.start, clip.duration));
      }
      if (!target) {
        const newTrackId = addTrack(draftSeq, 'audio');
        target = draftSeq.tracks.find((track) => track.id === newTrackId);
      }
      if (!target) return;
      const placed = placeClips(draftSeq, [{ trackId: target.id, clip }], 'overwrite');
      if (placed.includes(clip.id)) placedTrackId = target.id;
    });
    if (!placedTrackId) throw new Error('No audio track was available for the new recording.');
    selection.set([clip.id]);
    addToast(`Recorded audio added to ${draftSeqTrackName(get(activeSequence), placedTrackId)}.`, 'success');
  }

  function draftSeqTrackName(seq: import('#lib/project/types.ts').Sequence | null, id: string): string {
    return seq?.tracks.find((track) => track.id === id)?.name ?? 'the timeline';
  }

  function resizeLeft(delta: number) {
    const limit = (main?.clientWidth ?? 1200) - 320;
    panelSizes.update((sizes) => ({
      ...sizes,
      leftWidth: Math.max(MIN_LEFT, Math.min(sizes.leftWidth + delta, Math.max(MIN_LEFT, limit)))
    }));
  }

  function resizeTop(delta: number) {
    const height = main?.clientHeight ?? 800;
    if (height <= MIN_ROW * 2) return;
    const min = MIN_ROW / height;
    panelSizes.update((sizes) => ({
      ...sizes,
      topHeight: Math.max(min, Math.min(sizes.topHeight + delta / height, 1 - min))
    }));
  }

  async function refreshRecents() {
    recents = await recentProjects();
  }

  function importFootage() {
    ensureProjectForImport();
    void pickFiles();
  }

  // selecting a clip brings its inspector into focus, like a contextual editor
  // audio clips open the mixer; visual clips open their effect/transform controls
  let lastSelection = '';
  $effect(() => {
    const ids = $selection.join('|');
    if (ids && ids !== lastSelection) {
      const seq = $activeSequence;
      const picked = seq?.tracks.flatMap((track) => track.clips).filter((clip) => $selection.includes(clip.id)) ?? [];
      if (!stickyLeftTabs.has($leftPanelTab)) {
        if (picked.length && picked.every((clip) => clip.kind === 'audio')) leftPanelTab.set('audio-mixer');
        else if (picked.length) leftPanelTab.set('effect-controls');
      }
    }
    lastSelection = ids;
  });

  // Pending proposals belong to one open project only. If a preview is
  // cancelled by another edit or a sequence switch, restore the old playhead.
  let lastProposalSession = $state(0);
  $effect(() => {
    const currentSession = $projectSession;
    if (currentSession !== lastProposalSession) {
      if ($isPreviewing) cancelPreview();
      clearProposals();
      lastProposalSession = currentSession;
    }
    const activePreview = $activeProposalPreview;
    if (activePreview && !$isPreviewing) {
      if ($project?.id === activePreview.projectId && $activeSequence?.id === activePreview.sequenceId) {
        playhead.set(activePreview.previousPlayhead);
      }
      activeProposalPreview.set(null);
    }
  });

  // the welcome screen lists what this browser remembers, fresh every time
  // it shows
  $effect(() => {
    if ($project === null) void refreshRecents();
  });

  onMount(() => {
    // ask once whether the browser will keep our derived storage (proxies,
    // converted copies); the answer is the browser's to give
    void requestPersistentStorage();
    // the program session mirrors the stores and redraws on every project
    // change by itself; the source session is built when a clip is opened
    program();
    const removeShortcuts = installShortcuts();
    const removeLifecycle = installProjectLifecycle();
    const removeBridge = installClaudeBridge();
    const unsubscribeWorkspace = workspace.subscribe((ws) => {
      const tabs = workspaceTabs[ws];
      if (!tabs) return;
      leftPanelTab.set(tabs.left);
      bottomPanelTab.set(tabs.bottom);
    });
    const onExportFrame = () => void exportCurrentFrame();
    window.addEventListener('braincut:export-frame', onExportFrame);

    return () => {
      window.removeEventListener('braincut:export-frame', onExportFrame);
      unsubscribeWorkspace();
      removeBridge();
      removeLifecycle();
      removeShortcuts();
      destroySessions();
    };
  });
</script>

<svelte:head>
  <title>{$project ? `Minu Studio | ${$project.name}` : 'Minu Studio | Video Studio'}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="editor-app">
  <TopBar
    onimport={importFootage}
    onsave={() => void saveProject()}
    onopen={() => void openProjectFile()}
    onexport={() => dialog.set({ kind: 'export' })} />

  {#if $project}
    <main
      class="main-area"
      bind:this={main}
      style="grid-template-columns: {$panelSizes.leftWidth}px 3px minmax(0, 1fr) 3px {$panelSizes.leftWidth}px; grid-template-rows: {$panelSizes.topHeight}fr 3px {1 -
        $panelSizes.topHeight}fr">
      <section class="panel left-top" data-panel={$leftPanelTab} tabindex="-1">
        <PanelTabs
          tabs={topTabs}
          active={$leftPanelTab}
          onchange={(id) => leftPanelTab.set(id as LeftPanelTab)} />
        <div class="panel-body">
          {#if $leftPanelTab === 'source'}
            <SourceMonitor />
          {:else if $leftPanelTab === 'effect-controls'}
            <EffectControls />
          {:else if $leftPanelTab === 'color'}
            <ColorPanel />
          {:else if $leftPanelTab === 'scopes'}
            <ScopesPanel />
          {:else if $leftPanelTab === 'record'}
            <MicrophoneRecorder tracks={audioTracks} onrecord={addRecording} />
          {:else if $leftPanelTab === 'capture'}
            <LiveCameraCapture />
          {:else if $leftPanelTab === 'analysis'}
            <LocalAudioAnalysis clips={analysisClips} media={$project?.media ?? []} fps={$activeSequence?.fps ?? 30} />
          {:else if $leftPanelTab === 'production'}
            <MultiCameraStudio />
          {:else if $leftPanelTab === 'multicam'}
            <MulticamEditor />
          {:else}
            <AudioMixer />
          {/if}
        </div>
      </section>

      <div class="rz rz-v-top">
        <Resizer on:resize={(e) => resizeLeft(e.detail.delta)} />
      </div>

      <section class="panel program" data-panel="program" tabindex="-1">
        <ProgramMonitor />
      </section>

      <div class="rz rz-h">
        <Resizer direction="horizontal" on:resize={(e) => resizeTop(e.detail.delta)} />
      </div>

      <section class="panel left-bottom" data-panel={$bottomPanelTab} tabindex="-1">
        <PanelTabs
          tabs={bottomTabs}
          active={$bottomPanelTab}
          onchange={(id) => bottomPanelTab.set(id as BottomPanelTab)} />
        <div class="panel-body">
          {#if $bottomPanelTab === 'project'}
            <ProjectPanel />
          {:else if $bottomPanelTab === 'effects'}
            <EffectsPanel />
          {:else if $bottomPanelTab === 'text'}
            <TextPanel />
          {:else if $bottomPanelTab === 'markers'}
            <MarkersPanel />
          {:else if $bottomPanelTab === 'ai-review'}
            <AIReviewPanel />
          {:else if $bottomPanelTab === 'visual-intelligence'}
            <VisualFrameReview
              onClose={() => bottomPanelTab.set('mia')}
              onUseAnalysis={(result) => {
                pendingVisualAnalysis.set(result);
                bottomPanelTab.set('mia');
              }} />
          {:else if $bottomPanelTab === 'mia'}
            <MIAChatPanel />
          {:else}
            <HistoryPanel />
          {/if}
        </div>
      </section>

      <div class="rz rz-v-bottom">
        <Resizer on:resize={(e) => resizeLeft(e.detail.delta)} />
      </div>

      <section class="panel timeline-area" data-panel="timeline">
        <ToolStrip />
        <div class="timeline-body">
          <Timeline />
        </div>
      </section>
    </main>
  {:else}
    <Welcome
      {recents}
      onopen={(id) => void openRecent(id)}
      onopenfile={() => void openProjectFile()}
      onimport={importFootage}
    />
  {/if}

  <StatusBar />
</div>

<CommandPalette {commands} />
<ContextMenu />
<Dialogs />
<DropOverlay />

<style>
  .editor-app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-deep);
    overflow: hidden;
  }

  .main-area {
    flex: 1;
    min-height: 0;
    display: grid;
    overflow: hidden;
  }

  .panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--bg-elevated);
    outline: none;
  }

  .panel-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .rz {
    display: flex;
  }

  /* Familiar editing layout: media library left, preview center,
     contextual adjustments right, and the multitrack timeline below. */
  .left-bottom {
    grid-column: 1;
    grid-row: 1;
    border-right: 1px solid var(--border);
  }

  .rz-v-top {
    grid-column: 2;
    grid-row: 1;
  }

  .program {
    grid-column: 3;
    grid-row: 1;
    background: var(--bg-deep);
  }

  .rz-v-bottom {
    grid-column: 4;
    grid-row: 1;
  }

  .left-top {
    grid-column: 5;
    grid-row: 1;
    border-left: 1px solid var(--border);
  }

  .rz-h {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .rz-h :global(.resizer) {
    flex: 1;
  }

  .timeline-area {
    grid-column: 1 / -1;
    grid-row: 3;
    flex-direction: column;
    background: var(--bg-surface);
  }

  .timeline-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* one column on a narrow window: the picture first, then the timeline,
     then the panels. everything stays reachable, nothing is dropped */
  @media (max-width: 900px) {
    .main-area {
      grid-template-columns: 1fr !important;
      grid-template-rows: minmax(200px, 1.2fr) minmax(200px, 1fr) minmax(180px, 0.8fr) minmax(180px, 0.8fr) !important;
      overflow-y: auto;
    }

    .rz {
      display: none;
    }

    .program {
      grid-column: 1;
      grid-row: 1;
    }

    .timeline-area {
      grid-column: 1;
      grid-row: 2;
      border-top: 1px solid var(--border);
    }

    .left-bottom {
      grid-column: 1;
      grid-row: 3;
      border-right: none;
      border-top: 1px solid var(--border);
    }

    .left-top {
      grid-column: 1;
      grid-row: 4;
      border-left: none;
      border-top: 1px solid var(--border);
    }
  }
</style>
