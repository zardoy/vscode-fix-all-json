//@ts-check

/** @type{import('vscode-framework/build/config').UserConfig} */
const config = {
    esbuild: {
        production: {
            defineEnv: {
                // @ts-ignore
                EXTENSION_BOOTSTRAP_CONFIG: null,
            },
        },
        mainFields: ['module', 'main'],
    },
    // target: 'web',
    // webOpen: 'web',
    target: { desktop: true, web: true },
}

module.exports = config
