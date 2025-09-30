<script>
	let { event, isSubAgentExecution = false } = $props();

	const agentColorPalette = [
		'text-cyan-400',
		'text-emerald-400',
		'text-violet-400',
		'text-pink-400',
		'text-amber-400',
		'text-teal-400',
		'text-rose-400',
		'text-indigo-400',
		'text-lime-400',
		'text-fuchsia-400'
	];

	function hashString(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i);
			hash = hash & hash;
		}
		return Math.abs(hash);
	}

	function getAgentColor(agentName) {
		if (agentName === 'user' || agentName === 'system') {
			return 'text-orange-400';
		}
		const hash = hashString(agentName);
		return agentColorPalette[hash % agentColorPalette.length];
	}

	function isToolResultRequest(event) {
		const prompt = event.event?.prompt;
		if (!prompt || typeof prompt !== 'string') return false;
		return prompt.includes('"type" =>') ||
		       (prompt.startsWith('{') && prompt.includes('"type"') && prompt.includes('"text"'));
	}

	function getInstanceInfo(event) {
		const eventType = event.event?.type || event.type;

		if (eventType === 'request') {
			const from = event.event?.from_instance || 'user';
			const to = event.event?.to_instance || event.instance;
			return { from, to, label: `${from} → ${to}`, isToolResult: isToolResultRequest(event) };
		} else {
			return { from: event.instance, to: null, label: event.instance || 'system', isToolResult: false };
		}
	}

	function formatTimestamp(timestamp) {
		return new Date(timestamp).toLocaleString();
	}

	const instanceInfo = getInstanceInfo(event);
</script>

<div class="flex items-center gap-3 px-4 py-2 bg-gray-750 border-b border-gray-700">
	{#if isSubAgentExecution}
		<span class="text-xs px-2 py-0.5 rounded bg-purple-900 text-purple-300 border border-purple-700">
			sub-agent
		</span>
	{/if}
	{#if instanceInfo.to}
		<span class="text-sm font-semibold">
			<span class={getAgentColor(instanceInfo.from)}>{instanceInfo.from}</span>
			<span class="text-gray-400"> → </span>
			<span class={getAgentColor(instanceInfo.to)}>{instanceInfo.to}</span>
		</span>
	{:else}
		<span class="text-sm font-semibold {getAgentColor(instanceInfo.label)}">{instanceInfo.label}</span>
	{/if}
	<span class="text-xs text-gray-500 ml-auto">
		{formatTimestamp(event.timestamp)}
	</span>
</div>