<!-- src/views/components/Header.svelte -->
<script>
    import logoAndName from "../../assets/LogoandName.svg";
    export let title = "Privacy Lens";
</script>

<div class="header">
    <div class="logo-wrap">
        <img class="logo-lockup" src={logoAndName} alt={`${title} logo`} />
    </div>
</div>

<style>
    .header {
        display: flex;
        justify-content: center;
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .logo-wrap {
        padding: 8px;
        border-radius: 12px;
        background: radial-gradient(circle at 50% 30%, rgba(223, 38, 56, 0.18), rgba(0,0,0,0.0) 65%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.04);
    }

    .logo-lockup {
        width: min(240px, 72%);
        height: auto;
        display: block;
        object-fit: contain;
        filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.35));
    }
</style>

