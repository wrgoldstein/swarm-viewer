<script>
	let { block, sessionId, eventIndex, blockIdx, showAll = false, expandedThinking } = $props();

	const blockKey = `${sessionId}-${eventIndex}-${blockIdx}`;
	const isExpanded = $derived(expandedThinking.has(blockKey));

	function toggleExpanded() {
		if (isExpanded) {
			expandedThinking.delete(blockKey);
		} else {
			expandedThinking.add(blockKey);
		}
	}
</script>

{#if block.type === 'thinking'}
	{#if showAll}
		<div class="bg-gray-700 rounded border border-gray-600 overflow-hidden">
			<button
				onclick={toggleExpanded}
				class="w-full flex items-center gap-3 px-3 py-2 bg-gray-700 hover:bg-gray-600 transition-colors"
			>
				<span class="text-xs font-mono px-2 py-0.5 rounded bg-gray-600 text-gray-200">
					thinking
				</span>
				<span class="text-xs text-gray-400 ml-auto mr-2">
					Click to {isExpanded ? 'collapse' : 'expand'}
				</span>
				<svg class="w-4 h-4 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if isExpanded}
				<div class="p-3 border-t border-gray-600">
					<pre class="text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">{block.thinking}</pre>
				</div>
			{/if}
		</div>
	{/if}
{:else if block.type === 'text'}
	<pre class="text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">{block.text}</pre>
{:else if block.type === 'tool_use'}
	{#if showAll}
		<div class="text-sm text-blue-300 font-mono bg-gray-750 p-2 rounded border border-gray-600">
			<div class="text-xs text-gray-400 mb-1">[Tool: {block.name}]</div>
			<pre class="text-xs text-gray-400 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(block.input, null, 2)}</pre>
		</div>
	{/if}
{:else if block.type === 'tool_result'}
	{#if showAll}
		<div class="text-sm text-green-300 font-mono bg-gray-750 p-2 rounded border border-gray-600">
			<div class="text-xs text-gray-400 mb-1">[Tool Result]</div>
			<pre class="text-xs text-gray-400 whitespace-pre-wrap overflow-x-auto">{typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}</pre>
		</div>
	{/if}
{:else}
	{#if showAll}
		<pre class="text-sm text-gray-400 whitespace-pre-wrap font-mono overflow-x-auto">{JSON.stringify(block, null, 2)}</pre>
	{/if}
{/if}