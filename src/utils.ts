export function getTextByLine(text:string, line: number) {
    return text.split("\n").at(line);
}

export function isNumber(text: string) {
    return !Number.isNaN(Number.parseInt(text, 10));
}

export function isContainEoL(text: string) {
    return text.includes('\n') || text.includes('\n\r')
}
