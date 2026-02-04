<!-- src/views/components/DataCollectionSummary.svelte -->
<script>
    export let privacyData = null;
    export let expanded = false;

    let isExpanded = expanded;

    function toggleExpanded() {
        isExpanded = !isExpanded;
    }

    $: summary = privacyData ? privacyData.getSummary() : null;
</script>

{#if summary}
    <div class="data-summary">
        <div class="summary-header" on:click={toggleExpanded}>
            <span class="label">Data Collection Summary</span>
            <span class="toggle-icon">{isExpanded ? "▼" : "▶"}</span>
        </div>

        {#if isExpanded}
            <div class="summary-content">
                <div class="summary-item">
                    <span class="item-label">Total Cookies:</span>
                    <span class="item-value">{summary.totalCookies}</span>
                </div>
                <div class="summary-item">
                    <span class="item-label">Third-Party Cookies:</span>
                    <span class="item-value warning">{summary.thirdPartyCookies}</span>
                </div>
                <div class="summary-item">
                    <span class="item-label">Tracking Cookies:</span>
                    <span class="item-value danger">{summary.trackingCookies}</span>
                </div>
                <div class="summary-item">
                    <span class="item-label">Storage Items:</span>
                    <span class="item-value">{summary.storageItems}</span>
                </div>
                <div class="summary-item">
                    <span class="item-label">Tracking Scripts:</span>
                    <span class="item-value danger">{summary.trackingScripts}</span>
                </div>
                <div class="summary-item">
                    <span class="item-label">Third-Party Requests:</span>
                    <span class="item-value warning">{summary.thirdPartyRequests}</span>
                </div>
                <div class="summary-item">
                    <span class="item-label">Privacy Policy:</span>
                    <span class="item-value {summary.privacyPolicyFound ? 'success' : 'danger'}">
                        {summary.privacyPolicyFound ? "Found" : "Not Found"}
                    </span>
                </div>
            </div>
        {:else}
            <div class="summary-preview">
                <span class="preview-text">
                    {summary.trackingCookies} tracking cookies • {summary.trackingScripts} tracking scripts • {summary.thirdPartyRequests} third-party requests
                </span>
            </div>
        {/if}
    </div>
{/if}

<style>
    .data-summary {
        margin-bottom: 16px;
        background: var(--panel);
        border-radius: var(--radius);
        border: 1px solid var(--panel-border);
        overflow: hidden;
        box-shadow: var(--panel-shadow);
    }

    .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        user-select: none;
        transition: background 0.2s;
    }

    .summary-header:hover {
        background: var(--panel-strong);
    }

    .label {
        font-weight: 650;
        color: var(--red);
        font-size: 0.95rem;
    }

    .toggle-icon {
        color: var(--text-subtle);
        font-size: 0.82rem;
    }

    .summary-content {
        padding: 12px 16px;
        border-top: 1px solid var(--panel-divider);
    }

    .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--panel-divider);
    }

    .summary-item:last-child {
        border-bottom: none;
    }

    .item-label {
        color: var(--text-muted);
        font-size: 0.86rem;
    }

    .item-value {
        color: var(--text-strong);
        font-weight: 700;
        font-size: 0.86rem;
    }

    .item-value.warning {
        color: #f59e0b;
    }

    .item-value.danger {
        color: var(--red);
    }

    .item-value.success {
        color: #10b981;
    }

    .summary-preview {
        padding: 8px 16px;
        border-top: 1px solid var(--panel-divider);
    }

    .preview-text {
        color: var(--text-subtle);
        font-size: 0.82rem;
    }
</style>

