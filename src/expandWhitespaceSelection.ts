import * as vscode from 'vscode'

// seems to be working good enough
/**
 * Example should say everything (imagine - is whitespace):
 * abc----
 * -----
 *
 * -------position
 *
 * return position here will be after abc
 */
export default (document: vscode.TextDocument, position: vscode.Position) => {
    let pos = position
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let range: vscode.Range | undefined
        const line = document.lineAt(pos)
        if (pos.character === 0 || (range = document.getWordRangeAtPosition(pos, /[\s\t]+/))?.start.character === 0) {
            const lineAbove = pos.line - 1
            if (lineAbove === -1) return line.range.start
            pos = document.lineAt(lineAbove).range.end
        } else {
            if (range) pos = range.start
            break
        }
    }

    return pos
}
