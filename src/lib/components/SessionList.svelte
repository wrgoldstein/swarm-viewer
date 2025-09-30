<script>
	let { sessions = [], selectedSessionId = null, onSelectSession } = $props();

	function formatTimestamp(timestamp) {
		return new Date(timestamp).toLocaleString();
	}

	function formatDuration(seconds) {
		if (!seconds) return 'Active';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}
</script>

<aside class="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
	<div class="p-4 border-b border-gray-700">
		<h2 class="text-lg font-semibold text-gray-200">Sessions ({sessions.length})</h2>
	</div>
	<div class="flex-1 overflow-y-auto">
		{#each sessions as session}
			<button
				onclick={() => onSelectSession(session.id)}
				class="w-full text-left p-4 border-b border-gray-700 hover:bg-gray-700 transition-colors relative {selectedSessionId === session.id ? 'bg-gray-700 border-l-4 border-blue-500' : ''}"
			>
				<div class="flex items-start justify-between gap-2 mb-1">
					<div class="font-semibold text-sm text-blue-300">
						{session.swarm_name || 'Unnamed Swarm'}
					</div>
					{#if session.active}
						<span class="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-900 text-green-300 rounded-full border border-green-700">
							<span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
							Active
						</span>
					{/if}
				</div>
				<div class="text-xs text-gray-400 mb-2">
					{formatTimestamp(session.timestamp)}
				</div>
				<div class="text-xs text-gray-500">
					Duration: {formatDuration(session.duration_seconds)}
				</div>
				<div class="text-xs text-gray-600 truncate mt-1">
					{session.root_directory?.split('/').pop()}
				</div>
			</button>
		{/each}
	</div>
</aside>