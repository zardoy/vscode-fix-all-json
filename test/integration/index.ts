import { join } from 'path'
import glob from 'glob'
import Mocha from 'mocha'

export const run = async () => {
    const mocha = new Mocha({
        color: true,
        parallel: false,
        timeout: process.env.CI ? 4000 : 2000,
    })
    const testsRoot = join(__dirname, './suite')
    await new Promise<void>(resolve => {
        glob('**/**.test.js', { cwd: testsRoot }, (err, files: string[]) => {
            if (err) throw err

            const fixedOrderFiles = ['jsonFixes.test.js', 'commaOnEnter.test.js']

            for (const file of fixedOrderFiles) {
                mocha.addFile(join(testsRoot, file))
            }
            for (const file of files.filter(file => !fixedOrderFiles.includes(file))) {
                mocha.addFile(join(testsRoot, file))
            }

            mocha.run(failures => {
                if (failures > 0) {
                    console.error(`${failures} tests failed.`)
                    setImmediate(() => {
                        // comment this to skip closing vscode after tests fail
                        process.exit(1)
                    })
                } else {
                    resolve()
                }
            })
        })
    })
}
