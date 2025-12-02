<script>
    import { onMount } from "svelte";
    import PopupController from "../controllers/PopupController.js";
    import Header from "./components/Header.svelte";
    import UrlDisplay from "./components/UrlDisplay.svelte";
    import PrivacyScore from "./components/PrivacyScore.svelte";
    import DataCollectionSummary from "./components/DataCollectionSummary.svelte";

    let info = {
        fullUrl: null,
        host: null,
        isSecure: false,
        privacyScore: null,
        privacyData: null,
        privacyScoreDetails: null,
        message: "Loading..."
    };

    let loading = true;
    let privacyDataModel = null;

    async function load() {
        loading = true;
        try {
            const data = await PopupController.loadWebsiteInfo();
            info = data;
            
            // Create PrivacyData model from response if available
            if (data.privacyData) {
                // Reconstruct privacy data for display
                privacyDataModel = {
                    getSummary: () => data.privacyData.summary || {
                        totalCookies: data.privacyData.cookies?.total || 0,
                        thirdPartyCookies: data.privacyData.cookies?.thirdParty || 0,
                        trackingCookies: data.privacyData.cookies?.tracking || 0,
                        storageItems: 0,
                        trackingScripts: data.privacyData.tracking?.scripts || 0,
                        thirdPartyRequests: 0,
                        trackingRequests: data.privacyData.tracking?.requests || 0,
                        privacyPolicyFound: data.privacyData.privacyPolicy?.found || false
                    }
                };
            }
        } catch (error) {
            console.error("Error loading website info:", error);
            info.message = "Error loading website information";
        } finally {
            loading = false;
        }
    }

    onMount(load);
</script>

<div class="popup-container">
    <Header title="Privacy Lens" />

    {#if loading}
        <div class="loading-state">
            <p class="loading-text">Loading...</p>
        </div>
    {:else if !info.fullUrl}
        <div class="error-state">
            <p class="error-text">{info.message || "Cannot analyze this page"}</p>
            <p class="error-hint">Navigate to a website to see privacy information.</p>
        </div>
    {:else}
        <UrlDisplay 
            url={info.fullUrl} 
            hostname={info.host} 
            isSecure={info.isSecure} 
        />

        <PrivacyScore 
            score={info.privacyScore} 
            rating={info.privacyScoreDetails?.rating || "Unknown"}
            color={info.privacyScoreDetails ? 
                (info.privacyScore >= 80 ? "#10b981" : 
                 info.privacyScore >= 60 ? "#3b82f6" : 
                 info.privacyScore >= 40 ? "#f59e0b" : "#ef4444") : "#666"}
        />

        {#if info.privacyData}
            <DataCollectionSummary privacyData={privacyDataModel} />
        {/if}

        {#if info.privacyScoreDetails?.recommendations && info.privacyScoreDetails.recommendations.length > 0}
            <div class="recommendations">
                <div class="recommendations-header">
                    <span class="label">Recommendations</span>
                </div>
                <div class="recommendations-list">
                    {#each info.privacyScoreDetails.recommendations as rec}
                        <div class="recommendation-item priority-{rec.priority}">
                            <span class="rec-action">{rec.action}</span>
                            <span class="rec-description">{rec.description}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if info.privacyData?.privacyPolicy?.found}
            <div class="privacy-policy">
                <div class="policy-header">
                    <span class="label">Privacy Policy</span>
                    <span class="policy-status success">Found</span>
                </div>
                {#if info.privacyData.privacyPolicy.url}
                    <a 
                        href={info.privacyData.privacyPolicy.url} 
                        target="_blank" 
                        class="policy-link"
                    >
                        View Privacy Policy →
                    </a>
                {/if}
            </div>
        {/if}

        <button class="refresh-btn" on:click={load}>Refresh</button>
    {/if}
</div>

<style>
    .popup-container {
        background: #0d0d0f;
        border-radius: 10px;
        padding: 20px;
        width: 380px;
        max-height: 600px;
        overflow-y: auto;
        box-shadow: 0 0 15px rgba(0, 132, 255, 0.5);
        border: 1px solid #1a1a1a;
    }

    .loading-state, .error-state {
        padding: 20px;
        text-align: center;
    }

    .loading-text, .error-text {
        color: #e6e6e6;
        font-size: 0.95rem;
        margin-bottom: 8px;
    }

    .error-hint {
        color: #999;
        font-size: 0.85rem;
    }

    .recommendations {
        margin-top: 16px;
        margin-bottom: 16px;
        background: #1a1a1a;
        border-radius: 8px;
        border: 1px solid #2a2a2a;
        overflow: hidden;
    }

    .recommendations-header {
        padding: 12px 16px;
        border-bottom: 1px solid #2a2a2a;
    }

    .label {
        font-weight: 600;
        color: #66b3ff;
        font-size: 0.9rem;
    }

    .recommendations-list {
        padding: 8px 16px;
    }

    .recommendation-item {
        padding: 10px 0;
        border-bottom: 1px solid #252525;
    }

    .recommendation-item:last-child {
        border-bottom: none;
    }

    .rec-action {
        display: block;
        color: #e6e6e6;
        font-weight: 600;
        font-size: 0.85rem;
        margin-bottom: 4px;
    }

    .rec-description {
        display: block;
        color: #999;
        font-size: 0.8rem;
    }

    .recommendation-item.priority-high .rec-action {
        color: #ef4444;
    }

    .recommendation-item.priority-medium .rec-action {
        color: #f59e0b;
    }

    .privacy-policy {
        margin-top: 16px;
        margin-bottom: 16px;
        padding: 12px 16px;
        background: #1a1a1a;
        border-radius: 8px;
        border: 1px solid #2a2a2a;
    }

    .policy-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .policy-status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .policy-status.success {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border: 1px solid #10b981;
    }

    .policy-link {
        display: block;
        color: #66b3ff;
        text-decoration: none;
        font-size: 0.85rem;
        margin-top: 8px;
        transition: color 0.2s;
    }

    .policy-link:hover {
        color: #99ccff;
    }

    .refresh-btn {
        width: 100%;
        margin-top: 16px;
        background: #0084ff;
        padding: 10px 16px;
        color: white;
        border-radius: 6px;
        border: none;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }

    .refresh-btn:hover {
        background: #0a93ff;
    }

    .refresh-btn:active {
        background: #0066cc;
    }
</style>
