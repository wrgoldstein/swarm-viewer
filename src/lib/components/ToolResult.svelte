<script>
	let { block } = $props();
	let isExpanded = $state(false);

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function getPreview(content) {
		if (typeof content !== 'string') {
			const jsonStr = JSON.stringify(content, null, 2);
			return jsonStr.slice(0, 60);
		}
		return content.slice(0, 60);
	}

	function getFullContent(content) {
		if (typeof content !== 'string') {
			return JSON.stringify(content, null, 2);
		}
		return content;
	}

	let preview = $derived(getPreview(block.content));
	let fullContent = $derived(getFullContent(block.content));
	let hasMoreContent = $derived(fullContent.length > 60);
</script>

<button
	onclick={toggleExpanded}
	class="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs hover:bg-gray-100 transition-colors cursor-pointer"
>
	<svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
		<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
	</svg>
	<span class="font-mono text-gray-700 font-light">result</span>
	{#if !isExpanded && hasMoreContent}
		<span class="text-gray-400 truncate ml-1">· {preview}...</span>
		<svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
		</svg>
	{:else if !isExpanded}
		<span class="text-gray-400 truncate ml-1">· {preview}</span>
	{:else}
		<svg class="w-3 h-3 text-gray-400 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
		</svg>
	{/if}
</button>

{#if isExpanded}
	<div class="mt-2 p-4 bg-gray-50 rounded border border-gray-200">
		<pre class="text-xs text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed">{fullContent}</pre>
	</div>
{/if}