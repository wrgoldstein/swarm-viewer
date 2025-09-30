<script>
	import { onMount, tick } from 'svelte';
	import SessionList from '$lib/components/SessionList.svelte';
	import EventMessage from '$lib/components/EventMessage.svelte';

	let sessions = $state([]);
	let selectedSessionId = $state(null);
	let sessionData = $state(null);
	let loading = $state(false);
	let error = $state(null);
	let autoRefresh = $state(true);
	let showAll = $state(false);
	let scrollContainer = $state(null);
	let expandedThinking = $state(new Set());

	async function loadSessions() {
		try {
			const response = await fetch('/api/sessions');
			const data = await response.json();
			// Filter out sessions shorter than 30 seconds
			sessions = data.filter(session => !session.duration_seconds || session.duration_seconds >= 30);
		} catch (err) {
			error = err.message;
		}
	}

	async function startSession(sessionId){
		selectedSessionId = sessionId
		loadSession(sessionId)
	}

	async function loadSession(sessionId) {
		try {
			const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
			const data = await response.json();
			// console.log(data)

			if (!sessionData || sessionData.id !== sessionId){
				// New session selected, load completely
				sessionData = data
			} else {
				// Same session, append only new events
				const existingCount = sessionData.events.length;
				const newEvents = data.events.slice(existingCount);
				if (newEvents.length > 0) {
					sessionData.events.push(...newEvents);

					// Scroll to bottom after new events are added
					await tick();
					if (scrollContainer) {
						scrollContainer.scrollTop = scrollContainer.scrollHeight;
					}
				}
			}
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function formatTimestamp(timestamp) {
		return new Date(timestamp).toLocaleString();
	}

	function formatDuration(seconds) {
		if (!seconds) return 'Active';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	onMount(() => {
		loadSessions();

		// Auto-refresh every 2 seconds if enabled
		const interval = setInterval(() => {
			if (autoRefresh) {
				loadSessions();
				// Only refresh session data if it's an active session
				if (selectedSessionId && sessionData?.metadata?.active !== false) {
					const currentSession = sessions.find(s => s.id === selectedSessionId);
					if (currentSession?.active) {
						loadSession(selectedSessionId);
					}
				}
			}
		}, 2000);

		return () => clearInterval(interval);
	});

	function getEventType(event) {
		return event.event?.type || event.type || 'unknown';
	}

	function getInstanceInfo(event) {
		const eventType = event.event?.type || event.type;
		if (eventType === 'request') {
			const from = event.event?.from_instance || 'user';
			const to = event.event?.to_instance || event.instance;
			return { from, to, isToolResult: false };
		} else {
			return { from: event.instance, to: null, isToolResult: false };
		}
	}

	function isToolResultFollowingToolUse(currentEvent, previousEvent) {
		// Check if current event is a request from "user"
		const currentType = currentEvent.event?.type || currentEvent.type;
		const currentFrom = currentEvent.event?.from_instance;
		if (currentType !== 'request' || currentFrom !== 'user') {
			return false;
		}

		// Check if previous event is a "result" type (from an agent execution)
		if (!previousEvent) return false;
		const prevType = previousEvent.event?.type || previousEvent.type;

		return prevType === 'result';
	}

	function getMessageContent(event) {
		if (event.event?.message?.content) {
			const content = event.event.message.content;
			if (Array.isArray(content)) {
				return content;
			}
			return content;
		}
		if (event.event?.prompt) {
			return event.event.prompt;
		}
		return JSON.stringify(event, null, 2);
	}

	function hasVisibleContent(content, showAllFlag) {
		if (!Array.isArray(content)) {
			return content && content.toString().trim().length > 0;
		}
		return content.some(block => {
			if (block.type === 'text') {
				return block.text && block.text.trim().length > 0;
			}
			if (block.type === 'tool_result' || block.type === 'tool_use' || block.type === 'thinking') {
				return showAllFlag;
			}
			return showAllFlag;
		});
	}
</script>

<div class="h-screen flex flex-col bg-gray-900 text-gray-100">
	<!-- Header -->
	<header class="bg-gray-800 border-b border-gray-700 p-4">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold text-blue-400">Claude Swarm Viewer</h1>
			<div class="flex items-center gap-4">
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={showAll} class="rounded" />
					Show all details
				</label>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={autoRefresh} class="rounded" />
					Auto-refresh
				</label>
			</div>
		</div>
	</header>

	<div class="flex-1 flex overflow-hidden">
		<SessionList {sessions} {selectedSessionId} onSelectSession={startSession} />

		<!-- Main Content -->
		<main class="flex-1 flex flex-col overflow-hidden">
			{#if loading}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-gray-400">Loading session...</div>
				</div>
			{:else if error}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-red-400">Error: {error}</div>
				</div>
			{:else if sessionData}
				<!-- Session Header -->
				<div class="bg-gray-800 border-b border-gray-700 p-4">
					<h2 class="text-xl font-semibold text-gray-100">{sessionData.metadata.swarm_name}</h2>
					<div class="text-sm text-gray-400 mt-1">
						{sessionData.metadata.root_directory}
					</div>
				</div>

				<!-- Events Stream -->
				<div bind:this={scrollContainer} class="flex-1 overflow-y-auto p-4 space-y-2">
					{#each sessionData.events as event, i (event.event_id)}
						{@const eventType = getEventType(event)}
						{@const instanceInfo = getInstanceInfo(event)}
						{@const content = getMessageContent(event)}
						{@const previousEvent = i > 0 ? sessionData.events[i - 1] : null}
						{@const isToolResult = isToolResultFollowingToolUse(event, previousEvent)}
						{@const isAgentToAgentRequest = (eventType === 'request' && instanceInfo.from !== 'user') || isToolResult}
						{@const isSubAgentExecution = event.calling_instance != null}
						{@const isSystemInit = eventType === 'system' && event.event?.subtype === 'init'}
						{@const isVisible = !isSystemInit && hasVisibleContent(content, showAll) && (showAll || (eventType !== 'result' && eventType !== 'system' && !isAgentToAgentRequest && !isSubAgentExecution))}

						{#if isVisible}
							<EventMessage {event} sessionId={sessionData.id} eventIndex={i} {showAll} {expandedThinking} {isSubAgentExecution} />
						{/if}
					{/each}
				</div>
			{:else}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-center text-gray-400">
						<div class="text-4xl mb-4">👈</div>
						<div>Select a session to view</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>