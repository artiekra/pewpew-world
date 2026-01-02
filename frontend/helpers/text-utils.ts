export function stripColorCodes(text: string): string {
    if (typeof text !== "string") return text;
    const parts = text.split("#");
    let result = parts[0] || "";
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.length >= 8) {
            // Assuming 8 chars for RRGGBBAA as seen in ColorizedText
            result += part.substring(8);
        } else {
            result += part;
        }
    }
    return result;
}
