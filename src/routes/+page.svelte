<script>
	import { onMount, tick } from 'svelte';
	import SessionList from '$lib/components/SessionList.svelte';
	import EventMessage from '$lib/components/EventMessage.svelte';
	import ClaudeMessage from '$lib/components/ClaudeMessage.svelte';
	import Minimap from '$lib/components/Minimap.svelte';
	import { getAgentTextColor, getAgentBgColor, getAgentBorderColor, resetColorAssignments } from '$lib/utils/agentColors.js';

	let sessions = $state([]);
	let selectedSessionId = $state(null);
	let sessionData = $state(null);
	let loading = $state(false);
	let error = $state(null);
	let autoRefresh = $state(true);
	let autoScroll = $state(false);
	let showSystemMessages = $state(false);
	let scrollContainer = $state(null);
	let expandedThinking = $state(new Set());
	let selectedAgents = $state(new Set());
	let availableAgents = $state([]);
	let currentTime = $state(Date.now());
	let sessionType = $state('all'); // 'all', 'swarm', 'claude'

	async function loadSessions() {
		try {
			const response = await fetch(`/api/sessions?type=${sessionType}`);
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

					// Check for new agents in the new events
					const newAgents = extractAgents(newEvents);
					const addedAgents = newAgents.filter(agent => !availableAgents.includes(agent));
					if (addedAgents.length > 0) {
						availableAgents = [...availableAgents, ...addedAgents].sort();
						selectedAgents = new Set([...selectedAgents, ...addedAgents]);
					}

					// Scroll to bottom after new events are added
					if (autoScroll) {
						await tick();
						if (scrollContainer) {
							scrollContainer.scrollTop = scrollContainer.scrollHeight;
						}
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

	function calculateSessionDuration(sessionData, now) {
		if (!sessionData?.metadata) return null;

		const startTime = new Date(sessionData.metadata.start_time).getTime();

		// For active sessions, use current time (ticking)
		// For inactive sessions, use the last message timestamp
		let endTime;
		if (sessionData.metadata.active) {
			endTime = now;
		} else if (sessionData.metadata.end_time) {
			endTime = new Date(sessionData.metadata.end_time).getTime();
		} else {
			// Find last message timestamp for inactive sessions
			const events = sessionData.events || [];
			const lastEvent = events
				.filter(e => e.timestamp && (e.type === 'user' || e.type === 'assistant'))
				.pop();
			endTime = lastEvent ? new Date(lastEvent.timestamp).getTime() : now;
		}

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
			const isSystemInit = eventType === 'system' && event.event?.subtype === 'init';
			const isSystemInstance = event.instance === 'system';
			const toolOutput = isToolOutput(event);

			// If showSystemMessages is enabled, don't filter out system messages
			const hideSystem = !showSystemMessages && (isSystemInit || isSystemInstance);

			return !hideSystem && hasVisibleContent(content) && (eventType !== 'result' && eventType !== 'system' && !isToolResult && !toolOutput);
		}).length;
	}

	function toggleAgent(agent) {
		// If all agents are currently selected, select only this one
		if (selectedAgents.size === availableAgents.length) {
			selectedAgents = new Set([agent]);
		} else if (selectedAgents.has(agent)) {
			// If clicking on an already selected agent, deselect it
			selectedAgents.delete(agent);
			// If that was the last one, select all
			if (selectedAgents.size === 0) {
				selectedAgents = new Set(availableAgents);
			}
		} else {
			// Otherwise, add the agent to selection
			selectedAgents.add(agent);
		}
		selectedAgents = new Set(selectedAgents);
	}

	function toggleAutoScroll() {
		autoScroll = !autoScroll;
		// Immediately scroll to bottom when enabled
		if (autoScroll && scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	$effect(() => {
		if (autoScroll && scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	});

	onMount(() => {
		loadSessions();

		// Auto-refresh every 1 second if enabled
		const interval = setInterval(() => {
			if (autoRefresh) {
				loadSessions();
				// Refresh the currently selected session
				if (selectedSessionId) {
					loadSession(selectedSessionId);
				}
			}
			// Update current time for live duration calculation
			currentTime = Date.now();
		}, 1000);

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
			<h1 class="text-xl tracking-tight text-gray-900">Claude Sessions</h1>
			<div class="flex items-center gap-4">
				<select bind:value={sessionType} onchange={loadSessions} class="text-sm px-3 py-1 border border-gray-300 rounded bg-white text-gray-700">
					<option value="all">All Sessions</option>
					<option value="swarm">Swarm</option>
					<option value="claude">Claude</option>
				</select>
				<label class="flex items-center gap-2 text-sm text-gray-600">
					<input type="checkbox" bind:checked={autoRefresh} class="rounded border-gray-300" />
					Auto-refresh
				</label>
				<label class="flex items-center gap-2 text-sm text-gray-600">
					<input type="checkbox" checked={autoScroll} onchange={toggleAutoScroll} class="rounded border-gray-300" />
					Auto-scroll
				</label>
				<label class="flex items-center gap-2 text-sm text-gray-600">
					<input type="checkbox" bind:checked={showSystemMessages} class="rounded border-gray-300" />
					Show system
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
									<div class="text-2xl font-light text-gray-900 tabular-nums">{formatDuration(calculateSessionDuration(sessionData, currentTime))}</div>
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
							{#if countVisibleMessages(sessionData.events) === 0}
								<div class="flex items-center justify-center h-full">
									<div class="text-gray-400 text-sm">No messages to display</div>
								</div>
							{:else}
								{@const eventsWithToolDepth = (() => {
									let toolDepth = 0;
									return sessionData.events.map(event => {
										const content = getMessageContent(event);
										if (Array.isArray(content)) {
											content.forEach(block => {
												if (block.type === 'tool_use') toolDepth++;
												if (block.type === 'tool_result') toolDepth = Math.max(0, toolDepth - 1);
											});
										}
										return { event, toolDepth };
									});
								})()}

								{#each eventsWithToolDepth as { event, toolDepth }, i (event.event_id)}
									{#if event.sessionType === 'claude'}
										{@const isUserOrAssistant = event.type === 'user' || event.type === 'assistant'}
										{@const isSelected = isAgentSelected(event)}

										{#if isUserOrAssistant && isSelected}
											<ClaudeMessage {event} {expandedThinking} />
										{/if}
									{:else}
										{@const eventType = getEventType(event)}
										{@const instanceInfo = getInstanceInfo(event)}
										{@const content = getMessageContent(event)}
										{@const previousEvent = i > 0 ? sessionData.events[i - 1] : null}
										{@const isToolResult = isToolResultFollowingToolUse(event, previousEvent)}
										{@const isSystemInit = eventType === 'system' && event.event?.subtype === 'init'}
										{@const isSystemInstance = event.instance === 'system'}
										{@const toolOutput = isToolOutput(event)}
										{@const isUserMessageInToolContext = eventType === 'request' && instanceInfo.from === 'user' && toolDepth > 0}
										{@const hideSystem = !showSystemMessages && (isSystemInit || isSystemInstance)}
										{@const isVisible = !hideSystem && isAgentSelected(event) && hasVisibleContent(content) && (eventType !== 'result' && eventType !== 'system' && !isToolResult && !toolOutput)}

										{#if isVisible}
											<EventMessage {event} sessionId={decodeURIComponent(sessionData.id.replace(/\+/g, "/"))} eventIndex={i} {expandedThinking} {isUserMessageInToolContext} />
										{/if}
									{/if}
								{/each}
							{/if}
						</div>
						<Minimap events={sessionData.events} {scrollContainer} {selectedAgents} />
					</div>
				</div>
			{:else}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-center text-gray-400">
						<div>Select a session to view</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>