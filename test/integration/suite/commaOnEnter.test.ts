import * as vscode from 'vscode'

import { expect } from 'chai'
import { clearEditorText, getTextNormalizedEol, offsetToPosition, stringWithPositions } from './utils'
import dedent from 'string-dedent'

describe('Comma on Enter', () => {
    let document: vscode.TextDocument
    let editor: vscode.TextEditor

    // positions markers description:
    // /*|*/ - valid position to insert comma after ctrl+Enter (adding empty newline below)
    // /*$*/ - invalid position to insert comma after ctrl+Enter (adding empty newline below)
    // use editor text selection highlighting for faster navigation between positions
    const FULL_FIXTURE = dedent/* json */ `
    {
        "key1": 43,/*$*/
        "key2": 43/*|*/
        /* key description */ "key3": "test"/*|*/ /* test comment */ // another commend
        /*$*/
        "key4": true/*|*/
        "key4": false/*|*/
        "key5": []/*|*/
        "key6": {/*$*/
        }/*|*/
        "key7": "value",/*$*/
        // Comment with number 3/*$*/
    }
    `

    const [FULL_FIXTURE_CONTENT, FIXTURE_POSITIONS] = stringWithPositions(FULL_FIXTURE, ['/*|*/', '/*$*/'])

    before(done => {
        void vscode.workspace
            .openTextDocument({
                // don't prefil content with \n as vscode won't normalize eol here
                content: '',
                language: 'jsonc',
            })
            .then(async newDocument => {
                document = newDocument
                editor = await vscode.window.showTextDocument(document)
                if (process.env.CI) {
                    await new Promise(resolve => {
                        setTimeout(resolve, 1000)
                    })
                }
            })
            .then(done)
    })

    const testPosition = (num: number, offset: number, isExpected: boolean) => {
        it(`${isExpected ? 'Valid' : 'Invalid'} position ${num}`, async () => {
            await clearEditorText(editor, FULL_FIXTURE_CONTENT)
            const pos = offsetToPosition(FULL_FIXTURE_CONTENT, offset)
            editor.selection = new vscode.Selection(pos, pos)
            await vscode.commands.executeCommand('editor.action.insertLineAfter')
            if (isExpected) {
                // wait for expected changes to be done
                await new Promise<void>(resolve => {
                    const { dispose } = vscode.workspace.onDidChangeTextDocument(({ document: changedDocument }) => {
                        if (changedDocument !== document) return
                        dispose()
                        resolve()
                    })
                })
                const text = getTextNormalizedEol(document)
                // assert that comma is inserted at expected marker position
                expect(text.at(offset)).to.equal(',')
            } else {
                // todo would be better to remove timeout in favor of cleaner solution
                await new Promise(resolve => {
                    setTimeout(resolve, 40)
                })
                const text = getTextNormalizedEol(document)
                // assert document text remains unchanged (except empty newline that we just added)
                expect(
                    text
                        .split('\n')
                        .filter((x, i) => i !== editor.selection.active.line)
                        .join('\n'),
                ).to.equal(FULL_FIXTURE_CONTENT)
            }
        })
    }

    for (const [i, validPosition] of FIXTURE_POSITIONS['/*|*/'].entries()) {
        testPosition(i, validPosition, true)
    }

    for (const [i, invalidPosition] of FIXTURE_POSITIONS['/*$*/'].entries()) {
        testPosition(i, invalidPosition, false)
    }
})
