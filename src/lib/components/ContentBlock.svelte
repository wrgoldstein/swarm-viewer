<script>
	import ToolResult from './ToolResult.svelte';

	let { block, sessionId, eventIndex, blockIdx, expandedThinking } = $props();

	const blockKey = `${sessionId}-${eventIndex}-${blockIdx}`;
	let isExpanded = $state(false)

	function toggleExpanded() {
		isExpanded = !isExpanded
	}

	function isFileContent(text) {
		// Detect Read tool output format with line numbers like "     1→"
		const lines = text.split('\n');
		if (lines.length < 3) return false;
		return lines.slice(0, 3).every(line => /^\s+\d+→/.test(line) || line.trim() === '');
	}
</script>

{#if block.type === 'text'}
	{#if isFileContent(block.text)}
		<div class="bg-gray-50 rounded border border-gray-200 overflow-hidden">
			<div class="bg-white px-3 py-2 border-b border-gray-200">
				<span class="text-xs font-mono text-gray-500 uppercase tracking-wide">File Content</span>
			</div>
			<pre class="text-xs text-gray-800 font-mono overflow-x-auto p-4 leading-relaxed">{block.text}</pre>
		</div>
	{:else}
		<pre class="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed">{block.text}</pre>
	{/if}
{:else if block.type === 'tool_use'}
	<div>
		<button
			onclick={toggleExpanded}
			class="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs hover:bg-gray-100 transition-colors cursor-pointer"
		>
			<svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<span class="font-mono text-gray-700 font-light">{block.name}</span>
			{#if block.input && Object.keys(block.input).length > 0}
				<svg class="w-3 h-3 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			{/if}
		</button>
		{#if isExpanded && block.input}
			<div class="mt-2 bg-gray-50 rounded border border-gray-200 overflow-hidden">
				<div class="bg-white px-3 py-2 border-b border-gray-200">
					<span class="text-xs font-mono text-gray-500 uppercase tracking-wide">Tool Input</span>
				</div>
				<pre class="text-xs text-gray-800 font-mono overflow-x-auto p-4 leading-relaxed">{JSON.stringify(block.input, null, 2)}</pre>
			</div>
		{/if}
	</div>
{:else if block.type === 'tool_result'}
	<ToolResult {block} />
{/if}