<script>
	import EventHeader from './EventHeader.svelte';
	import ContentBlock from './ContentBlock.svelte';

	let { event, sessionId, eventIndex, expandedThinking, isUserMessageInToolContext = false } = $props();

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
	<div class="bg-white rounded border border-gray-200 overflow-hidden">
		{#if !isUserMessageInToolContext}
			<EventHeader {event} />
		{/if}

		<!-- Event Content -->
		<div class="p-5 space-y-2" class:pt-3={isUserMessageInToolContext}>
			{#if isUserMessageInToolContext}
				<div class="bg-gray-50 rounded border border-gray-200 overflow-hidden">
					<div class="bg-white px-3 py-2 border-b border-gray-200">
						<span class="text-xs font-mono text-gray-500 uppercase tracking-wide">Tool Output</span>
					</div>
					<div class="p-4">
						{#if Array.isArray(content)}
							{#each content as block, blockIdx}
								<ContentBlock {block} {sessionId} eventIndex={eventIndex} {blockIdx} {expandedThinking} />
							{/each}
						{:else if isFileContent(content)}
							<pre class="text-xs text-gray-800 font-mono overflow-x-auto leading-relaxed">{content}</pre>
						{:else}
							<pre class="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed">{content}</pre>
						{/if}
					</div>
				</div>
			{:else}
				{#if Array.isArray(content)}
					{#each content as block, blockIdx}
						<ContentBlock {block} {sessionId} eventIndex={eventIndex} {blockIdx} {expandedThinking} />
					{/each}
				{:else if isFileContent(content)}
					<div class="bg-gray-50 rounded border border-gray-200 overflow-hidden">
						<div class="bg-white px-3 py-2 border-b border-gray-200">
							<span class="text-xs font-mono text-gray-500 uppercase tracking-wide">File Content</span>
						</div>
						<pre class="text-xs text-gray-800 font-mono overflow-x-auto p-4 leading-relaxed">{content}</pre>
					</div>
				{:else}
					<pre class="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed">{content}</pre>
				{/if}
			{/if}
		</div>
	</div>
{/if}