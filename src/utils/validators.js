export const validators = {
    isValidHttpUrl(url) {
        return url && (url.startsWith('http://') || url.startsWith('https://'));
    },

    isLocalhost(hostname) {
        return hostname === 'localhost' ||
               hostname === '127.0.0.1' ||
               hostname.endsWith('.local');
    },

    isSpecialUrl(url) {
        const specialProtocols = ['chrome:', 'about:', 'chrome-extension:', 'file:', 'edge:', 'brave:'];
        return specialProtocols.some(proto => url.startsWith(proto));
    },

    canAnalyze(url) {
        if (!url) return false;
        if (validators.isSpecialUrl(url)) return false;
        return validators.isValidHttpUrl(url);
    }
};