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

<style>
	@keyframes rainbow-shimmer {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	.rainbow-text {
		background: linear-gradient(
			90deg,
			#0066cc,
			#7c3f8f,
			#dc143c,
			#d94f00,
			#00a86b,
			#0066cc
		);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: rainbow-shimmer 3s ease-in-out infinite;
	}
</style>

<aside class="w-80 bg-white border-r border-gray-200 flex flex-col">
	<div class="px-6 py-4 border-b border-gray-200">
		<h2 class="text-sm font-light text-gray-900 uppercase tracking-wide">Sessions <span class="text-gray-400">({sessions.length})</span></h2>
	</div>
	<div class="flex-1 overflow-y-auto">
		{#each sessions as session}
			<button
				onclick={() => onSelectSession(session.id)}
				class="w-full text-left px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors relative {selectedSessionId === session.id ? 'bg-gray-50 border-l-2 border-gray-900' : ''}"
			>
				<div class="flex items-start justify-between gap-2 mb-1">
					<div class="font-light text-sm text-gray-900">
						{session.swarm_name || 'Unnamed Swarm'}
					</div>
					{#if session.active}
						<span class="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 rounded-full border border-gray-300">
							<span class="w-1.5 h-1.5 bg-gray-900 rounded-full animate-pulse"></span>
							<span class="rainbow-text font-medium">Active</span>
						</span>
					{/if}
				</div>
				<div class="text-xs text-gray-500 mb-1 font-mono">
					{formatTimestamp(session.timestamp)}
				</div>
				<div class="text-xs text-gray-400">
					{formatDuration(session.duration_seconds)}
				</div>
				<div class="text-xs text-gray-400 truncate mt-1 font-mono">
					{session.root_directory?.split('/').pop()}
				</div>
			</button>
		{/each}
	</div>
</aside>