import * as vscode from 'vscode'

import { expect } from 'chai'
// import delay from 'delay'
import { getTextNormalizedEol, setupFixtureContent, waitForJsonDiagnostics } from './utils'
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
