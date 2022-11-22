import * as vscode from 'vscode'

import { expect } from 'chai'
import { clearEditorText, stringWithPositions } from './utils'
import dedent from 'string-dedent'

describe('Comma on Enter', () => {
    let document: vscode.TextDocument
    let editor: vscode.TextEditor

    // positions markers description:
    // | - valid position to insert comma after Enter (adding empty newline below)
    // $ - invalid position to insert comma after Enter (adding empty newline below)
    // use editor text selection highlighting for faster navigation between positions
    const FULL_FIXTURE = dedent/* json */ `
    {
        "key1": 43,/*$*/
        "key2": 43/*|*/
        /* key description */ "key3": "test"/*|*/ /* test comment */ // another commend
        /*$*/
        "key4": true/*|*/
        "key4": false/*|*/
    }
    `

    const [FULL_FIXTURE_CONTENT, FIXTURE_POSITIONS] = stringWithPositions(FULL_FIXTURE, ['/*|*/', '/*$*/'])

    before(done => {
        void vscode.workspace
            .openTextDocument({
                content: FULL_FIXTURE_CONTENT,
                language: 'jsonc',
            })
            .then(async newDocument => {
                document = newDocument
                editor = await vscode.window.showTextDocument(document)
            })
            .then(done)
    })

    const testPosition = (num: number, offset: number, isExpected: boolean) => {
        it(`${isExpected ? 'Valid' : 'Invalid'} position ${num}`, async () => {
            await clearEditorText(editor, FULL_FIXTURE_CONTENT)
            const pos = document.positionAt(offset)
            editor.selection = new vscode.Selection(pos, pos)
            await vscode.commands.executeCommand('editor.action.insertLineAfter')
            if (isExpected) {
                // wait for expected changes to be done
                await new Promise<void>(resolve => {
                    const { dispose } = vscode.workspace.onDidChangeTextDocument(() => {
                        dispose()
                        resolve()
                    })
                })
                // assert that comma is inserted at expected marker position
                expect(document.getText().at(offset)).to.equal(',')
            } else {
                // todo would be better to remove timeout in favor of cleaner solution
                await new Promise(resolve => {
                    setTimeout(resolve, 40)
                })
                // assert document text remains unchanged (except empty newline that we just added)
                expect(
                    document
                        .getText()
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
