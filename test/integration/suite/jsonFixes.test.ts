import * as vscode from 'vscode'

import { expect } from 'chai'
// import delay from 'delay'
import { getTextNormalizedEol, prepareFileEditor, setupFixtureContent, waitForJsonDiagnostics } from './utils'
import { jsonFixesFixtures } from '../fixtures/files'
import dedent from 'string-dedent'

describe('Json Fixes', () => {
    let document: vscode.TextDocument
    let editor: vscode.TextEditor
    before(done => {
        prepareFileEditor()
            .then(async () => {
                editor = vscode.window.activeTextEditor!
                document = editor.document
                await vscode.workspace.getConfiguration('').update('editor.codeActionsOnSave', { 'source.fixAll': true }, vscode.ConfigurationTarget.Global)
                await vscode.workspace.getConfiguration('').update('editor.formatOnSave', true, vscode.ConfigurationTarget.Global)
            })
            .then(done)
    })
    for (const [name, content] of Object.entries(jsonFixesFixtures)) {
        it(`Fix JSON issues: ${name}`, async () => {
            await Promise.all([setupFixtureContent(editor, content.input), waitForJsonDiagnostics(document)])
            console.log(
                '[debug] diagnostics:',
                vscode.languages.getDiagnostics(document.uri).map(({ message }) => message),
            )
            await document.save()
            expect(getTextNormalizedEol(document)).to.equal(dedent(content.expected))
        })
    }
})
