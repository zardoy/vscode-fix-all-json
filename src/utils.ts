export function getTextByLine(text:string, line: number) {
    return text.split("\n").at(line);
}

export function isNumber(text: string) {
    return !Number.isNaN(Number.parseInt(text, 10));
}
