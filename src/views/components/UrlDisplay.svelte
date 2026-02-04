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
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: var(--radius);
        padding: 12px 14px;
        box-shadow: var(--panel-shadow);
    }

    .url-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
    }

    .label {
        font-weight: 650;
        color: var(--red);
        font-size: 0.95rem;
    }

    .secure-badge, .insecure-badge {
        font-size: 0.9rem;
    }

    .url-content {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--panel-strong);
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--panel-border);
    }

    .url-text {
        color: var(--text-strong);
        font-size: 0.9rem;
        word-break: break-all;
        flex: 1;
    }

    .copy-btn {
        background: var(--panel);
        border: 1px solid var(--panel-border);
        color: var(--text-muted);
        cursor: pointer;
        padding: 6px;
        font-size: 0.95rem;
        border-radius: 8px;
        transition: border-color 0.2s, color 0.2s, background 0.2s;
    }

    .copy-btn:hover {
        color: var(--text-strong);
        border-color: rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.05);
    }

    .hostname {
        margin-top: 6px;
        color: var(--text-subtle);
        font-size: 0.82rem;
    }
</style>

