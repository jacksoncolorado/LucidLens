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
    margin-bottom: 14px;
    position: relative;
}

.item-title {
    color: #e6e6e6;
    font-weight: 600;
    margin-bottom: 2px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
}

.item-desc {
    color: #aaa;
    font-size: 0.85rem;
}

/* Tooltip styles */
.info-icon {
    margin-left: 6px;
    font-size: 0.8rem;
    color: #7da7ff;
    cursor: pointer;
    user-select: none;
}

.info-icon:hover {
    color: #a5c8ff;
}

.tooltip-parent {
    position: relative;
}

.tooltip-box {
    position: absolute;
    top: 20px;
    left: 0;
    width: 260px;
    background: #0f0f11;
    border: 1px solid #333;
    padding: 10px 12px;
    border-radius: 6px;
    color: #ddd;
    font-size: 0.78rem;
    line-height: 1.15rem;
    max-height: 160px;
    overflow-y: auto;
    z-index: 99;
    box-shadow: 0 0 12px rgba(0, 132, 255, 0.35);
}

.final {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #333;
    color: #ccc;
    font-size: 0.85rem;
}
</style>
