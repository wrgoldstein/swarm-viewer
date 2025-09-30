<script>
	import { onMount, tick } from 'svelte';
	import SessionList from '$lib/components/SessionList.svelte';
	import EventMessage from '$lib/components/EventMessage.svelte';
	import Minimap from '$lib/components/Minimap.svelte';
	import { getAgentTextColor, getAgentBgColor, getAgentBorderColor, resetColorAssignments } from '$lib/utils/agentColors.js';

	let sessions = $state([]);
	let selectedSessionId = $state(null);
	let sessionData = $state(null);
	let loading = $state(false);
	let error = $state(null);
	let autoRefresh = $state(true);
	let scrollContainer = $state(null);
	let expandedThinking = $state(new Set());
	let selectedAgents = $state(new Set());
	let availableAgents = $state([]);

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

	function extractAgents(events) {
		const agents = new Set();
		events.forEach(event => {
			const eventType = event.event?.type || event.type;
			if (eventType === 'request') {
				const from = event.event?.from_instance || 'user';
				const to = event.event?.to_instance || event.instance;
				agents.add(from);
				agents.add(to);
			} else {
				const instance = event.instance || 'system';
				agents.add(instance);
			}
		});
		return Array.from(agents).sort();
	}

	async function startSession(sessionId){
		selectedSessionId = sessionId
		resetColorAssignments() // Reset colors for new session
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
			availableAgents = extractAgents(data.events);
			selectedAgents = new Set(availableAgents);
			} else {
				// Same session, append only new events
				const existingCount = sessionData.events.length;
				const newEvents = data.events.slice(existingCount);
				if (newEvents.length > 0) {
					sessionData.events.push(...newEvents);

					// Scroll to bottom after new events are added
					// await tick();
					// if (scrollContainer) {
					// 	scrollContainer.scrollTop = scrollContainer.scrollHeight;
					// }
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

	function calculateSessionDuration(sessionData) {
		if (!sessionData?.metadata) return null;

		const startTime = new Date(sessionData.metadata.start_time).getTime();
		const endTime = sessionData.metadata.end_time
			? new Date(sessionData.metadata.end_time).getTime()
			: Date.now();

		return Math.floor((endTime - startTime) / 1000);
	}

	function countVisibleMessages(events) {
		if (!events) return 0;

		return events.filter((event, i) => {
			const eventType = getEventType(event);
			const instanceInfo = getInstanceInfo(event);
			const content = getMessageContent(event);
			const previousEvent = i > 0 ? events[i - 1] : null;
			const isToolResult = isToolResultFollowingToolUse(event, previousEvent);
			const isAgentToAgentRequest = (eventType === 'request' && instanceInfo.from !== 'user') || isToolResult;
			const isSystemInit = eventType === 'system' && event.event?.subtype === 'init';
			const toolOutput = isToolOutput(event);

			return !isSystemInit && hasVisibleContent(content) && (eventType !== 'result' && eventType !== 'system' && !isAgentToAgentRequest && !toolOutput);
		}).length;
	}

	function toggleAgent(agent) {
		if (selectedAgents.has(agent)) {
			selectedAgents.delete(agent);
		} else {
			selectedAgents.add(agent);
		}
		selectedAgents = new Set(selectedAgents);
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

	function isToolOutput(event) {
		const eventType = event.event?.type || event.type;
		const fromInstance = event.event?.from_instance;

		if (eventType !== 'request' || fromInstance !== 'user') {
			return false;
		}

		const prompt = event.event?.prompt;
		if (typeof prompt !== 'string' || prompt.length === 0) {
			return false;
		}

		// Tool outputs typically start with { or whitespace, or are very long (500+ chars)
		return prompt[0] === '{' || prompt[0] === ' ' || prompt.length >= 500;
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

	function hasVisibleContent(content) {
		if (!Array.isArray(content)) {
			return content && content.toString().trim().length > 0;
		}
		return content.some(block => {
			if (block.type === 'text') {
				return block.text && block.text.trim().length > 0;
			}
			if (block.type === 'tool_use' || block.type === 'tool_result') {
				return true;
			}
			return false;
		});
	}

	function isAgentSelected(event) {
		const eventType = event.event?.type || event.type;
		if (eventType === 'request') {
			const from = event.event?.from_instance || 'user';
			const to = event.event?.to_instance || event.instance;
			return selectedAgents.has(from) || selectedAgents.has(to);
		} else {
			const instance = event.instance || 'system';
			return selectedAgents.has(instance);
		}
	}
</script>

<div class="h-screen flex flex-col bg-white text-gray-900">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<h1 class="text-xl tracking-tight text-gray-900">Claude Swarm</h1>
			<div class="flex items-center gap-4">
				<label class="flex items-center gap-2 text-sm text-gray-600">
					<input type="checkbox" bind:checked={autoRefresh} class="rounded border-gray-300" />
					Auto-refresh
				</label>
			</div>
		</div>
	</header>

	<div class="flex-1 flex overflow-hidden">
		<SessionList {sessions} {selectedSessionId} onSelectSession={startSession} />

		<!-- Main Content -->
		<main class="flex-1 flex overflow-hidden bg-gray-50">
			{#if loading}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-gray-500">Loading session...</div>
				</div>
			{:else if error}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-red-600">Error: {error}</div>
				</div>
			{:else if sessionData}
				<div class="flex-1 flex flex-col overflow-hidden">
					<!-- Session Header -->
					<div class="bg-white border-b border-gray-200 px-6 py-4">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h2 class="text-lg font-light text-gray-900 tracking-tight">{sessionData.metadata.swarm_name}</h2>
								<div class="text-sm text-gray-500 mt-1">
									{sessionData.metadata.root_directory}
								</div>
								<div class="text-xs text-gray-400 font-mono mt-1">
									{decodeURIComponent(sessionData.id.replace(/\+/g, "/"))}
								</div>
							</div>
							<div class="flex gap-6 text-sm">
								<div class="text-right">
									<div class="text-gray-500 text-xs uppercase tracking-wide">Messages</div>
									<div class="text-2xl font-light text-gray-900 tabular-nums">{countVisibleMessages(sessionData.events)}</div>
								</div>
								<div class="text-right">
									<div class="text-gray-500 text-xs uppercase tracking-wide">Duration</div>
									<div class="text-2xl font-light text-gray-900 tabular-nums">{formatDuration(calculateSessionDuration(sessionData))}</div>
								</div>
							</div>
						</div>
						<div class="flex flex-wrap gap-2 mt-4">
							{#each availableAgents as agent}
								<button
									onclick={() => toggleAgent(agent)}
									class="px-3 py-1 text-xs font-light rounded-full border transition-colors bg-transparent {selectedAgents.has(agent) ? '' : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700'}"
									style={selectedAgents.has(agent) ? `border-color: ${getAgentBorderColor(agent)}; color: ${getAgentTextColor(agent)};` : ''}
								>
									{agent}
								</button>
							{/each}
						</div>
					</div>

					<!-- Events Stream with Minimap -->
					<div class="flex-1 flex overflow-hidden">
						<div bind:this={scrollContainer} class="flex-1 overflow-y-auto p-6 space-y-3">
							{#each sessionData.events as event, i (event.event_id)}
								{@const eventType = getEventType(event)}
								{@const instanceInfo = getInstanceInfo(event)}
								{@const content = getMessageContent(event)}
								{@const previousEvent = i > 0 ? sessionData.events[i - 1] : null}
								{@const isToolResult = isToolResultFollowingToolUse(event, previousEvent)}
								{@const isAgentToAgentRequest = (eventType === 'request' && instanceInfo.from !== 'user') || isToolResult}
								{@const isSystemInit = eventType === 'system' && event.event?.subtype === 'init'}
								{@const toolOutput = isToolOutput(event)}
								{@const isVisible = !isSystemInit && isAgentSelected(event) && hasVisibleContent(content) && (eventType !== 'result' && eventType !== 'system' && !isAgentToAgentRequest && !toolOutput)}

								{#if isVisible}
									<EventMessage {event} sessionId={decodeURIComponent(sessionData.id.replace(/\+/g, "/"))} eventIndex={i} {expandedThinking} />
								{/if}
							{/each}
						</div>
						<Minimap events={sessionData.events} {scrollContainer} {selectedAgents} />
					</div>
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