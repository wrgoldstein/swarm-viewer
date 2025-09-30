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

	function isSystemMessage(text) {
		// Detect Ruby Logger format: "I, [timestamp #pid]  INFO -- logger_name:"
		return /^[A-Z],\s*\[[\d\-T:\.]+\s+#\d+\]\s+(INFO|DEBUG|WARN|ERROR|FATAL)\s+--\s+[\w_]+:\s*\{/.test(text);
	}

	function stripSystemMessage(text) {
		if (!isSystemMessage(text)) return text;

		// Remove the logger prefix and return just the content
		const match = text.match(/^[A-Z],\s*\[[\d\-T:\.]+\s+#\d+\]\s+(INFO|DEBUG|WARN|ERROR|FATAL)\s+--\s+[\w_]+:\s*([\s\S]*)$/);
		return match ? match[2] : text;
	}
</script>

{#if block.type === 'text'}
	{@const cleanedText = stripSystemMessage(block.text)}
	{#if isFileContent(cleanedText)}
		<div class="bg-gray-50 rounded border border-gray-200 overflow-hidden">
			<div class="bg-white px-3 py-2 border-b border-gray-200">
				<span class="text-xs font-mono text-gray-500 uppercase tracking-wide">File Content</span>
			</div>
			<pre class="text-xs text-gray-800 font-mono overflow-x-auto p-4 leading-relaxed">{cleanedText}</pre>
		</div>
	{:else}
		<pre class="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed">{cleanedText}</pre>
	{/if}
{:else if block.type === 'tool_use'}
	<div class="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs">
		<svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
		<span class="font-mono text-gray-700 font-light">{block.name}</span>
	</div>
{:else if block.type === 'tool_result'}
	<ToolResult {block} />
{/if}