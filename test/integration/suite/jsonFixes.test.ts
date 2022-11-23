import * as vscode from 'vscode'

import { expect } from 'chai'
// import delay from 'delay'
import { setupFixtureContent } from './utils'
import { jsonFixesFixtures } from '../fixtures/files'
import dedent from 'string-dedent'
import { join } from 'path'
import fs from 'fs'

describe('Json Fixes', () => {
    let document: vscode.TextDocument
    let editor: vscode.TextEditor
    let temporaryFile = join(__dirname, '../temp.json')
    fs.writeFileSync(temporaryFile, '', 'utf8')
    before(done => {
        void vscode.window
            .showTextDocument(vscode.Uri.file(temporaryFile))
            .then(async newEditor => {
                editor = newEditor
                document = editor.document
                await vscode.workspace.getConfiguration('').update('editor.codeActionsOnSave', { 'source.fixAll': true }, vscode.ConfigurationTarget.Global)
                await vscode.workspace.getConfiguration('').update('editor.formatOnSave', true, vscode.ConfigurationTarget.Global)
                await vscode.workspace.getConfiguration('').update('files.eol', '\n', vscode.ConfigurationTarget.Global)
            })
            .then(done)
    })
    for (const [name, content] of Object.entries(jsonFixesFixtures)) {
        it(`Fix JSON issues: ${name}`, async () => {
            const diagnosticsChangePromise = new Promise<void>(resolve => {
                vscode.languages.onDidChangeDiagnostics(({ uris }) => {
                    if (uris.map(uri => uri.toString()).includes(document.uri.toString())) resolve()
                })
            })
            await Promise.all([setupFixtureContent(editor, content.input), diagnosticsChangePromise])
            console.log(
                '[debug] diagnostics:',
                vscode.languages.getDiagnostics(document.uri).map(({ message }) => message),
            )
            await document.save()
            expect(document.getText()).to.equal(dedent(content.expected))
        })
    }
})
