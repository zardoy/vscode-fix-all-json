import * as vscode from 'vscode'

import { expect } from 'chai'
import { clearEditorText, getTextNormalizedEol, prepareFileEditor, waitForJsonDiagnostics } from './utils'

describe('Quotes on Colon', () => {
    let document: vscode.TextDocument
    let editor: vscode.TextEditor

    const TYPE_CONTENT = 'key1:'
    const FULL_FIXTURE_EXPECTED = '{"key1":, "key1":,\n"key1":}'
    const FULL_FIXTURE_UNCHANGED = '{key1:, key1:,\nkey1:}'

    before(done => {
        prepareFileEditor().then(async () => {
            editor = vscode.window.activeTextEditor!
            document = editor.document
            // make sure JSON server is started and diagnostics are here
            await Promise.all([clearEditorText(editor, '{'), waitForJsonDiagnostics(document)])
            done()
        })
    })

    const typeSequence = async (seq: string) => {
        for (const letter of seq) await vscode.commands.executeCommand('type', { text: letter })
    }

    const execTest = (title: string | undefined, isExpected: boolean) => {
        const cb = async () => {
            await clearEditorText(editor, '{, ,\n}')
            const pos = new vscode.Position(0, 1)
            const multiCursorPositions = [pos, pos.translate(0, 2), new vscode.Position(1, 0)]
            editor.selections = multiCursorPositions.map(pos => new vscode.Selection(pos, pos))
            await typeSequence(TYPE_CONTENT)
            if (isExpected) {
                // wait for expected changes to be done
                await new Promise<void>(resolve => {
                    const { dispose } = vscode.workspace.onDidChangeTextDocument(({ document: changedDocument }) => {
                        if (changedDocument !== document) return
                        dispose()
                        resolve()
                    })
                })
                expect(getTextNormalizedEol(document)).to.equal(FULL_FIXTURE_EXPECTED)
            } else {
                // todo would be better to remove timeout in favor of cleaner solution
                await new Promise(resolve => {
                    setTimeout(resolve, 60)
                })
                expect(getTextNormalizedEol(document)).to.equal(FULL_FIXTURE_UNCHANGED)
            }
        }
        if (title) it(title, cb)
        else return cb()
        return
    }

    execTest('Double quotes basic case', true)

    it('Extension setting disabled', async () => {
        await vscode.workspace.getConfiguration().update('fixAllJson.insertMissingDoubleQuotesOnColon', false, vscode.ConfigurationTarget.Global)
        await execTest(undefined, false)
    })
})
