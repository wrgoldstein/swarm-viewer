<script>
	import { onMount } from 'svelte';
	import { getAgentHexColor } from '$lib/utils/agentColors.js';

	let { events = [], scrollContainer = null, selectedAgents = new Set() } = $props();

	let minimapHeight = $state(0);
	let viewportIndicatorTop = $state(0);
	let viewportIndicatorHeight = $state(0);
	let isDragging = $state(false);
	let dragStartY = $state(0);
	let dragStartScroll = $state(0);

	function getEventAgent(event) {
		const eventType = event.event?.type || event.type;
		if (eventType === 'request') {
			return event.event?.to_instance || event.instance;
		}
		return event.instance || 'system';
	}

	function isAgentSelected(event) {
		const eventType = event.event?.type || event.type;
		if (eventType === 'request') {
			const from = event.event?.from_instance || 'user';
			const to = event.event?.to_instance || event.instance;
			return selectedAgents.has(from) || selectedAgents.has(to);
		} else {
			const instance = event.instance || 'system';
			return selectedAgents.has(instance);
		}
	}

	function updateViewportIndicator() {
		if (!scrollContainer) return;

		const scrollTop = scrollContainer.scrollTop;
		const scrollHeight = scrollContainer.scrollHeight;
		const clientHeight = scrollContainer.clientHeight;

		// Calculate viewport position and height as percentage
		const topPercent = (scrollTop / scrollHeight) * 100;
		const heightPercent = (clientHeight / scrollHeight) * 100;

		viewportIndicatorTop = topPercent;
		viewportIndicatorHeight = heightPercent;
	}

	function startDrag(e) {
		e.stopPropagation();
		isDragging = true;
		dragStartY = e.clientY;
		dragStartScroll = scrollContainer.scrollTop;
	}

	function onDrag(e) {
		if (!isDragging || !scrollContainer) return;

		const minimapElement = document.getElementById('minimap');
		if (!minimapElement) return;

		const rect = minimapElement.getBoundingClientRect();
		const deltaY = e.clientY - dragStartY;
		const deltaPercent = deltaY / rect.height;
		const scrollHeight = scrollContainer.scrollHeight;
		const deltaScroll = deltaPercent * scrollHeight;

		scrollContainer.scrollTop = dragStartScroll + deltaScroll;
	}

	function stopDrag() {
		isDragging = false;
	}

	function scrollToPosition(clickY) {
		if (!scrollContainer) return;

		const minimapElement = document.getElementById('minimap');
		if (!minimapElement) return;

		const rect = minimapElement.getBoundingClientRect();
		const clickPercent = clickY / rect.height;

		const scrollHeight = scrollContainer.scrollHeight;
		const targetScroll = clickPercent * scrollHeight;

		scrollContainer.scrollTop = targetScroll;
	}

	onMount(() => {
		if (scrollContainer) {
			// Update on scroll
			scrollContainer.addEventListener('scroll', updateViewportIndicator);

			// Update on window resize
			window.addEventListener('resize', updateViewportIndicator);

			// Handle dragging at window level
			window.addEventListener('mousemove', onDrag);
			window.addEventListener('mouseup', stopDrag);

			// Initial update
			updateViewportIndicator();

			return () => {
				scrollContainer.removeEventListener('scroll', updateViewportIndicator);
				window.removeEventListener('resize', updateViewportIndicator);
				window.removeEventListener('mousemove', onDrag);
				window.removeEventListener('mouseup', stopDrag);
			};
		}
	});

	// Update when events change
	$effect(() => {
		if (events && scrollContainer) {
			updateViewportIndicator();
		}
	});

	// Filter visible events
	let visibleEvents = $derived(events.filter(event => isAgentSelected(event)))
</script>

<div
	id="minimap"
	class="w-16 bg-white border-l border-gray-200 relative cursor-pointer flex-shrink-0"
	style="height: 100%;"
	onclick={(e) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const clickY = e.clientY - rect.top;
		scrollToPosition(clickY);
	}}
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			const rect = e.currentTarget.getBoundingClientRect();
			const clickY = rect.height / 2;
			scrollToPosition(clickY);
		}
	}}
>
	<!-- Event markers -->
	{#each visibleEvents as event, i}
		{@const agent = getEventAgent(event)}
		{@const color = getAgentHexColor(agent)}
		{@const position = (i / visibleEvents.length) * 100}

		<div
			class="absolute w-full h-px opacity-70 hover:opacity-100 transition-opacity"
			style="top: {position}%; background-color: {color};"
			title="{agent} - event {i + 1}"
		></div>
	{/each}

	<!-- Viewport indicator -->
	<div
		class="absolute w-full border border-gray-900 bg-gray-900/5 {isDragging ? 'cursor-grabbing' : 'cursor-grab'}"
		style="top: {viewportIndicatorTop}%; height: {viewportIndicatorHeight}%;"
		onmousedown={startDrag}
		role="slider"
		tabindex="0"
		aria-label="Viewport position"
	></div>
</div>