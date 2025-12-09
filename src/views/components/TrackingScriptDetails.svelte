<script>
    export let scripts = [];

    let open = false;

    function toggle() {
        open = !open;
    }
</script>

{#if scripts && scripts.length > 0}
<div class="script-details">
    <div class="header" on:click={toggle}>
        <span>Tracking Script Details ({scripts.length})</span>
        <span class="arrow">{open ? "▼" : "▶"}</span>
    </div>

    {#if open}
    <div class="content">
        {#each scripts as s}
            <div class="item">
                <div class="top-row">
                    <span class="url">{s.url}</span>
                </div>

                <div class="meta">
                    <span class="badge {s.isThirdParty ? 'third' : 'first'}">
                        {s.isThirdParty ? "3rd-Party" : "1st-Party"}
                    </span>

                    <span class="category">{s.category}</span>

                    <span class="risk {s.risk.toLowerCase()}">
                        {s.risk} Risk
                    </span>
                </div>

                <div class="desc">{s.description}</div>
            </div>
        {/each}
    </div>
    {/if}
</div>

{:else}

<div class="script-details">
    <div class="header" on:click={toggle}>
        <span>Tracking Script Details (0)</span>
        <span class="arrow">{open ? "▼" : "▶"}</span>
    </div>

    {#if open}
        <div class="content">
            <div class="item">
                <div class="desc">No tracking scripts detected.</div>
            </div>
        </div>
    {/if}
</div>

{/if}

<style>
.script-details {
    margin-top: 14px;
    background: #1a1a1a;
    border-radius: 8px;
    border: 1px solid #2a2a2a;
    overflow: hidden;
}

.header {
    padding: 12px 16px;
    cursor: pointer;
    color: #66b3ff;
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    font-size: 0.9rem;
    user-select: none;
}

.arrow {
    font-size: 0.85rem;
}

.content {
    max-height: 180px;
    overflow-y: auto;
    padding: 10px 16px;
    background: #111;
}

.item {
    padding: 10px 0;
    border-bottom: 1px solid #222;
}

.item:last-child {
    border-bottom: none;
}

.top-row {
    margin-bottom: 6px;
}

.url {
    color: #e5e5e5;
    font-size: 0.8rem;
    word-break: break-all;
}

.meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    margin-bottom: 4px;
}

.badge {
    padding: 2px 6px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.7rem;
}

.first {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.5);
}

.third {
    background: rgba(236, 72, 153, 0.15);
    color: #f472b6;
    border: 1px solid rgba(236, 72, 153, 0.6);
}

.category {
    color: #ccc;
}

.risk {
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
}

.low {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.6);
}

.moderate {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.6);
}

.high {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.6);
}

.desc {
    color: #aaa;
    font-size: 0.78rem;
    line-height: 1.2rem;
}
</style>
