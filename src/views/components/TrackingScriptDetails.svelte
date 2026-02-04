<script>
    export let scripts = [];

    const riskOrder = ["High"]; // show only High risk bucket
    const friendlyRisk = {
        High: "High risk"
    };

    let openState = {
        High: true
    };

    $: groups = riskOrder.map(risk => ({
        risk,
        items: (scripts || []).filter(s => (s.risk || "Low") === risk)
    }));

    function toggle(risk) {
        openState = { ...openState, [risk]: !openState[risk] };
    }
</script>

<div class="script-details">
    <div class="header">
        <span>Tracking Script Details ({scripts?.length || 0})</span>
    </div>

    {#if scripts && scripts.length > 0}
        {#each groups as group}
            <div class="group">
                <button class="group-header" on:click={() => toggle(group.risk)}>
                    <div class="left">
                        <span class="risk-chip {group.risk.toLowerCase()}">
                            {friendlyRisk[group.risk] || group.risk}
                        </span>
                        <span class="count">{group.items.length} {group.items.length === 1 ? "script" : "scripts"}</span>
                    </div>
                    <span class="arrow">{openState[group.risk] ? "▼" : "▶"}</span>
                </button>

                {#if openState[group.risk]}
                <div class="content">
                    {#if group.items.length === 0}
                        <div class="item muted">No scripts in this bucket.</div>
                    {:else}
                        {#each group.items as s}
                            <div class="item">
                                <div class="top-row">
                                    <span class="url">{s.domain || s.url}</span>
                                </div>

                                <div class="meta">
                                    <span class="badge {s.isThirdParty ? 'third' : 'first'}">
                                        {s.isThirdParty ? "3rd-Party" : "1st-Party"}
                                    </span>

                                    <span class="source-badge">
                                        {s.source || "Script"}
                                    </span>

                                    {#if s.owner}
                                        <span class="owner">{s.owner}</span>
                                    {/if}

                                    <span class="category">{s.category}</span>

                                    <span class="risk {s.risk ? s.risk.toLowerCase() : 'low'}">
                                        {s.risk || "Low"} Risk
                                    </span>
                                </div>

                                <div class="desc">
                                    <div class="purpose">{s.purpose}</div>
                                    {#if s.why}<div class="why">Why: {s.why}</div>{/if}
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
                {/if}
            </div>
        {/each}
    {:else}
        <div class="content">
            <div class="item">
                <div class="desc">No tracking scripts detected.</div>
            </div>
        </div>
    {/if}
</div>

<style>
.script-details {
    margin-top: 14px;
    background: var(--panel);
    border-radius: var(--radius);
    border: 1px solid var(--panel-border);
    overflow: hidden;
    box-shadow: var(--panel-shadow);
}

.header {
    padding: 12px 16px;
    color: var(--red);
    font-weight: 650;
    font-size: 0.95rem;
    border-bottom: 1px solid var(--panel-divider);
}

.group {
    border-bottom: 1px solid #232323;
}

.group:last-child {
    border-bottom: none;
}

.group-header {
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--text-strong);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
}

.group-header:hover {
    background: var(--panel-strong);
}

.left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.risk-chip {
    padding: 4px 8px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.75rem;
}

.risk-chip.high {
    background: var(--red-soft);
    color: var(--red);
    border: 1px solid rgba(223, 38, 56, 0.5);
}

.risk-chip.low {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.6);
}

.risk-chip.none {
    background: rgba(107, 114, 128, 0.15);
    color: #d1d5db;
    border: 1px solid rgba(107, 114, 128, 0.4);
}

.count {
    color: var(--text-subtle);
    font-size: 0.82rem;
}

.arrow {
    font-size: 0.9rem;
    color: var(--text-subtle);
}

.content {
    max-height: 220px;
    overflow-y: auto;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.02);
}

.item {
    padding: 10px 0;
    border-bottom: 1px solid var(--panel-divider);
}

.item:last-child {
    border-bottom: none;
}

.item.muted {
    color: var(--text-subtle);
    font-size: 0.82rem;
}

.top-row {
    margin-bottom: 6px;
}

.url {
    color: var(--text-strong);
    font-size: 0.82rem;
    word-break: break-all;
}

.meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
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

.source-badge {
    padding: 2px 6px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.7rem;
    background: var(--panel-strong);
    color: var(--text-muted);
    border: 1px solid var(--panel-border);
}

.first {
    background: rgba(96, 165, 250, 0.12);
    color: #8ab8ff;
    border: 1px solid rgba(96, 165, 250, 0.4);
}

.third {
    background: var(--red-soft);
    color: var(--red);
    border: 1px solid rgba(223, 38, 56, 0.45);
}

.owner {
    color: var(--text-muted);
}

.category {
    color: var(--text-muted);
}

.risk {
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
}

.risk.high {
    background: var(--red-soft);
    color: var(--red);
    border: 1px solid rgba(223, 38, 56, 0.6);
}

.risk.low {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.6);
}

.risk.none {
    background: rgba(107, 114, 128, 0.15);
    color: #d1d5db;
    border: 1px solid rgba(107, 114, 128, 0.4);
}

.desc {
    color: var(--text-muted);
    font-size: 0.8rem;
    line-height: 1.2rem;
}

.purpose {
    margin-bottom: 4px;
}

.why {
    color: var(--text-subtle);
    font-size: 0.75rem;
}
</style>
