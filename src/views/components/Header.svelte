<!-- src/views/components/Header.svelte -->
<script>
    export let title = "Privacy Lens";
</script>

<div class="header">
    <div class="logo">
        <span class="logo-icon">🔍</span>
        <span class="logo-text">{title}</span>
    </div>
</div>

<style>
    .header {
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 2px solid #2a2a2a;
    }

    .logo {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .logo-icon {
        font-size: 1.8rem;
    }

    .logo-text {
        font-size: 1.4rem;
        font-weight: 700;
        color: #ffffff;
    }
</style>

