export function getTextByLine(text: string, line: number) {
    return text.split('\n').at(line)
}

export function isNumber(text: string) {
    return !Number.isNaN(Number.parseInt(text, 10))
}

export function isEoL(text: string) {
    return text.startsWith('\n') && text.trim() === ''
}

export function startsWithComment(text: string) {
    return text.startsWith('//') || text.startsWith('/*')
}
