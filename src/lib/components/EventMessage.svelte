<script>
	import EventHeader from './EventHeader.svelte';
	import ContentBlock from './ContentBlock.svelte';

	let { event, sessionId, eventIndex, showAll = false, expandedThinking, isSubAgentExecution = false } = $props();

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

	const content = getMessageContent(event);
</script>

<div class="bg-gray-800 rounded-lg border overflow-hidden {isSubAgentExecution ? 'border-l-4 border-l-purple-500 border-r-gray-700 border-t-gray-700 border-b-gray-700 ml-8' : 'border-gray-700'}">
	<EventHeader {event} {isSubAgentExecution} />

	<!-- Event Content -->
	<div class="p-4 space-y-2">
		{#if Array.isArray(content)}
			{#each content as block, blockIdx}
				<ContentBlock {block} {sessionId} eventIndex={eventIndex} {blockIdx} {showAll} {expandedThinking} />
			{/each}
		{:else}
			<pre class="text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">{content}</pre>
		{/if}
	</div>
</div>