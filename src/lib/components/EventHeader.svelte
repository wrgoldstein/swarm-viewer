<script>
	import { getAgentHexColor } from '$lib/utils/agentColors.js';

	let { event, compact = false } = $props();

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

{#if compact}
	<!-- Compact inline header for tool calls -->
	<div class="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-750/50 rounded text-xs border border-gray-700/50">
		{#if instanceInfo.to}
			<span class="font-mono" style="color: {getAgentHexColor(instanceInfo.to)}">{instanceInfo.to}</span>
		{:else}
			<span class="font-mono" style="color: {getAgentHexColor(instanceInfo.label)}">{instanceInfo.label}</span>
		{/if}
	</div>
{:else}
	<!-- Full header for regular messages -->
	<div class="flex items-center gap-3 px-4 py-2 bg-gray-750 border-b border-gray-700">
		{#if instanceInfo.to}
			<span class="text-sm font-semibold">
				<span style="color: {getAgentHexColor(instanceInfo.from)}">{instanceInfo.from}</span>
				<span class="text-gray-400"> → </span>
				<span style="color: {getAgentHexColor(instanceInfo.to)}">{instanceInfo.to}</span>
			</span>
		{:else}
			<span class="text-sm font-semibold" style="color: {getAgentHexColor(instanceInfo.label)}">{instanceInfo.label}</span>
		{/if}
		<span class="text-xs text-gray-500 ml-auto">
			{formatTimestamp(event.timestamp)}
		</span>
	</div>
{/if}