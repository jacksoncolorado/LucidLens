<script>
    export let factors = null;
    export let score = null;

    let expanded = true;

    const toggle = () => (expanded = !expanded);

    // Tooltip open states
    let showScriptsTip = false;
    let showRequestsTip = false;
    let showCookiesTip = false;
    let showPolicyTip = false;

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
        
        <!-- TRACKING SCRIPTS -->
        <div class="item">
            <div class="item-title tooltip-parent">
                Tracking Scripts
                <span 
                    class="info-icon"
                    on:click={() => showScriptsTip = !showScriptsTip}
                >ⓘ</span>

                {#if showScriptsTip}
                    <div class="tooltip-box">
                        <b>Tracking Scripts</b><br>
                        JavaScript that monitors behavior on the page. This may include
                        clicks, scrolling, time spent, or device/browser details. 
                        Harmless scripts handle analytics; harmful ones perform tracking 
                        or fingerprinting across websites.
                    </div>
                {/if}
            </div>

            <div class="item-desc">
                {factors.scripts} detected — {level(factors.scripts)} activity. 
                Penalty: {factors.scriptPenalty}.
            </div>
        </div>

        <!-- THIRD-PARTY REQUESTS -->
        <div class="item">
            <div class="item-title tooltip-parent">
                Third-Party Requests
                <span 
                    class="info-icon"
                    on:click={() => showRequestsTip = !showRequestsTip}
                >ⓘ</span>

                {#if showRequestsTip}
                    <div class="tooltip-box">
                        <b>Third-Party Requests</b><br>
                        Connections made from this website to external domains 
                        (ads, analytics, CDNs, social platforms). These requests 
                        expose your IP address and browser details to outside companies. 
                        Some are necessary (fonts/CDNs), while others track behavior.
                    </div>
                {/if}
            </div>

            <div class="item-desc">
                {factors.totalRequests} total external requests, 
                {factors.trackingRequests} tracking-related used in scoring. 
                Penalty: {factors.requestPenalty}.
            </div>
        </div>

        <!-- TRACKING COOKIES -->
        <div class="item">
            <div class="item-title tooltip-parent">
                Tracking Cookies
                <span 
                    class="info-icon"
                    on:click={() => showCookiesTip = !showCookiesTip}
                >ⓘ</span>

                {#if showCookiesTip}
                    <div class="tooltip-box">
                        <b>Tracking Cookies</b><br>
                        Cookies designed to identify you across sessions or websites. 
                        Low-risk ones track only activity on this site. High-risk 
                        cookies are used by advertisers or data brokers to build
                        behavioral profiles across the web.
                    </div>
                {/if}
            </div>

            <div class="item-desc">
                {factors.cookies} cookies — {level(factors.cookies)} tracking risk. 
                Penalty: {factors.cookiePenalty}.
            </div>
        </div>

        <!-- PRIVACY POLICY -->
        <div class="item">
            <div class="item-title tooltip-parent">
                Privacy Policy
                <span 
                    class="info-icon"
                    on:click={() => showPolicyTip = !showPolicyTip}
                >ⓘ</span>

                {#if showPolicyTip}
                    <div class="tooltip-box">
                        <b>Privacy Policy</b><br>
                        Indicates whether the site provides a clear disclosure of its 
                        data collection and usage practices. If missing, the site offers 
                        no transparency, which raises privacy concerns and results in 
                        a penalty.
                    </div>
                {/if}
            </div>

            <div class="item-desc">
                {factors.policyFound
                    ? `Found — no penalty.`
                    : `Not found — penalty: ${factors.policyPenalty}.`}
            </div>
        </div>

        <div class="final">
            Total Penalty: {factors.totalPenalty}<br>
            Final Score: {score}/100
        </div>
    </div>
    {/if}
</div>
{/if}

<style>
.breakdown {
    margin-top: 16px;
    background: var(--panel);
    border-radius: var(--radius);
    border: 1px solid var(--panel-border);
    box-shadow: var(--panel-shadow);
}

.breakdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    color: var(--red);
    font-weight: 650;
    font-size: 0.95rem;
}

.content {
    padding: 12px 16px;
    border-top: 1px solid var(--panel-divider);
}

.item {
    margin-bottom: 14px;
    position: relative;
}

.item-title {
    color: var(--text-strong);
    font-weight: 650;
    margin-bottom: 2px;
    font-size: 0.92rem;
    display: flex;
    align-items: center;
}

.item-desc {
    color: var(--text-muted);
    font-size: 0.86rem;
}

/* Tooltip styles */
.info-icon {
    margin-left: 6px;
    font-size: 0.8rem;
    color: var(--red);
    cursor: pointer;
    user-select: none;
}

.info-icon:hover {
    color: #ff4a59;
}

.tooltip-parent {
    position: relative;
}

.tooltip-box {
    position: absolute;
    top: 20px;
    left: 0;
    width: 260px;
    background: rgba(0,0,0,0.7);
    border: 1px solid var(--panel-border);
    padding: 10px 12px;
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 0.78rem;
    line-height: 1.15rem;
    max-height: 160px;
    overflow-y: auto;
    z-index: 99;
    box-shadow: 0 0 12px rgba(223, 38, 56, 0.25);
}

.final {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--panel-divider);
    color: var(--text-muted);
    font-size: 0.86rem;
}
</style>
