<script>
    export let factors = null;
    export let score = null;

    let expanded = true; // start open by default; change to false if you prefer
    const toggle = () => (expanded = !expanded);

    function level(n) {
        if (n === 0) return "None";
        if (n <= 3) return "Low";
        if (n <= 10) return "Moderate";
        if (n <= 20) return "High";
        return "Very high";
    }
</script>

{#if factors}
<div class="breakdown">
    <div class="breakdown-header" on:click={toggle}>
        <span class="title">Score Breakdown</span>
        <span class="toggle">{expanded ? "▼" : "▶"}</span>
    </div>

    {#if expanded}
    <div class="content">
        <div class="item">
            <div class="item-title">Tracking Scripts</div>
            <div class="item-desc">
                {factors.scripts} detected — {level(factors.scripts)} activity. Penalty: {factors.scriptPenalty}.
            </div>
        </div>

        <div class="item">
            <div class="item-title">Third-Party Requests</div>
            <div class="item-desc">
                {factors.totalRequests} total external requests, {factors.trackingRequests} tracking-related used in scoring. Penalty: {factors.requestPenalty}.
            </div>
        </div>

        <div class="item">
            <div class="item-title">Tracking Cookies</div>
            <div class="item-desc">
                {factors.cookies} cookies — {level(factors.cookies)} tracking risk. Penalty: {factors.cookiePenalty}.
            </div>
        </div>

        <div class="item">
            <div class="item-title">Privacy Policy</div>
            <div class="item-desc">
                {factors.policyFound
                    ? `Found — no penalty.`
                    : `Not found — penalty: ${factors.policyPenalty}.`}
            </div>
        </div>

        <div class="final">
            Total Penalty: {factors.totalPenalty}  
            Final Score: {score}/100
        </div>
    </div>
    {/if}
</div>
{/if}

<style>
.breakdown {
    margin-top: 16px;
    background: #1a1a1a;
    border-radius: 8px;
    border: 1px solid #2a2a2a;
}

.breakdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    color: #66b3ff;
    font-weight: 600;
    font-size: 0.9rem;
}

.content {
    padding: 12px 16px;
    border-top: 1px solid #2a2a2a;
}

.item {
    margin-bottom: 12px;
}

.item-title {
    color: #e6e6e6;
    font-weight: 600;
    margin-bottom: 2px;
    font-size: 0.9rem;
}

.item-desc {
    color: #aaa;
    font-size: 0.85rem;
}

.final {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #333;
    color: #ccc;
    font-size: 0.85rem;
}
</style>
