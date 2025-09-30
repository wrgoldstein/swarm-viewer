<script>
	import EventHeader from './EventHeader.svelte';
	import ContentBlock from './ContentBlock.svelte';

	let { event, sessionId, eventIndex, expandedThinking } = $props();

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

	function isFileContent(text) {
		if (typeof text !== 'string') return false;
		const lines = text.split('\n');
		if (lines.length < 3) return false;
		return lines.slice(0, 3).every(line => /^\s+\d+→/.test(line) || line.trim() === '');
	}

	function hasOnlyToolCalls(content) {
		if (!Array.isArray(content)) return false;
		return content.every(block => block.type === 'tool_use' || block.type === 'tool_result');
	}

	const content = getMessageContent(event);
	const isToolCallOnly = hasOnlyToolCalls(content);
</script>

{#if isToolCallOnly}
	<!-- Compact tool call display -->
	<div class="flex items-center gap-2 flex-wrap">
		<EventHeader {event} compact={true} />
		{#if Array.isArray(content)}
			{#each content as block, blockIdx}
				<ContentBlock {block} {sessionId} eventIndex={eventIndex} {blockIdx} {expandedThinking} />
			{/each}
		{/if}
	</div>
{:else}
	<!-- Regular message display -->
	<div class="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
		<EventHeader {event} />

		<!-- Event Content -->
		<div class="p-4 space-y-2">
			{#if Array.isArray(content)}
				{#each content as block, blockIdx}
					<ContentBlock {block} {sessionId} eventIndex={eventIndex} {blockIdx} {expandedThinking} />
				{/each}
			{:else if isFileContent(content)}
				<div class="bg-gray-900 rounded border border-gray-700 overflow-hidden">
					<div class="bg-gray-800 px-3 py-1.5 border-b border-gray-700">
						<span class="text-xs font-mono text-gray-400">File Content</span>
					</div>
					<pre class="text-xs text-gray-300 font-mono overflow-x-auto p-3">{content}</pre>
				</div>
			{:else}
				<pre class="text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">{content}</pre>
			{/if}
		</div>
	</div>
{/if}