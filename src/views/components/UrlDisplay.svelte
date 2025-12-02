<!-- src/views/components/UrlDisplay.svelte -->
<script>
    export let url = "";
    export let hostname = "";
    export let isSecure = false;

    function copyToClipboard() {
        if (url) {
            navigator.clipboard.writeText(url).then(() => {
                // Could add a toast notification here
                console.log("URL copied to clipboard");
            });
        }
    }

    function truncateUrl(url, maxLength = 60) {
        if (!url) return "";
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + "...";
    }
</script>

<div class="url-display">
    <div class="url-header">
        <span class="label">Website:</span>
        {#if isSecure}
            <span class="secure-badge" title="Secure connection (HTTPS)">🔒</span>
        {:else}
            <span class="insecure-badge" title="Insecure connection (HTTP)">⚠️</span>
        {/if}
    </div>
    <div class="url-content">
        <span class="url-text" title={url}>{truncateUrl(url)}</span>
        {#if url}
            <button class="copy-btn" on:click={copyToClipboard} title="Copy URL">
                📋
            </button>
        {/if}
    </div>
    {#if hostname}
        <div class="hostname">Host: {hostname}</div>
    {/if}
</div>

<style>
    .url-display {
        margin-bottom: 16px;
    }

    .url-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
    }

    .label {
        font-weight: 600;
        color: #66b3ff;
        font-size: 0.9rem;
    }

    .secure-badge, .insecure-badge {
        font-size: 0.85rem;
    }

    .url-content {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #1a1a1a;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #2a2a2a;
    }

    .url-text {
        color: #e6e6e6;
        font-size: 0.85rem;
        word-break: break-all;
        flex: 1;
    }

    .copy-btn {
        background: transparent;
        border: none;
        color: #66b3ff;
        cursor: pointer;
        padding: 4px;
        font-size: 0.9rem;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .copy-btn:hover {
        opacity: 1;
    }

    .hostname {
        margin-top: 6px;
        color: #999;
        font-size: 0.8rem;
    }
</style>

