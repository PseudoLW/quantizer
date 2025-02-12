// Function to apply gamma correction and linearize RGB values
function gammaCorrectToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// RGB to Linear RGB
function rgbToLinearRGB(r: number, g: number, b: number): [number, number, number] {
    return [
        gammaCorrectToLinear(r),
        gammaCorrectToLinear(g),
        gammaCorrectToLinear(b),
    ];
}

// RGB to OKLab
function rgbToOKLab(r: number, g: number, b: number): [number, number, number] {
    const [rLinear, gLinear, bLinear] = rgbToLinearRGB(r, g, b);

    // Matrix transformation from linear RGB to OKLab
    const L = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    const a = 0.5382 * rLinear - 0.4600 * gLinear - 0.0782 * bLinear;
    const bVal = -0.0781 * rLinear - 0.3663 * gLinear + 0.4444 * bLinear;

    return [L, a, bVal];
}

// OKLab to Linear RGB (Inverse transformation)
function okLabToLinearRGB(L: number, a: number, b: number): [number, number, number] {
    // Use the inverse matrix to map back to RGB space
    const rLinear = L + 0.3983 * a + 0.0893 * b;
    const gLinear = L - 0.1289 * a - 0.0918 * b;
    const bLinear = L - 0.1543 * a + 0.5193 * b;

    return [rLinear, gLinear, bLinear];
}

// Linear RGB to RGB (gamma correction)
function linearRGBToRGB(r: number, g: number, b: number): [number, number, number] {
    const gammaCorrect = (c: number) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return [
        gammaCorrect(r),
        gammaCorrect(g),
        gammaCorrect(b),
    ];
}

// OKLab to RGB
function okLabToRGB(L: number, a: number, b: number): [number, number, number] {
    const [rLinear, gLinear, bLinear] = okLabToLinearRGB(L, a, b);
    return linearRGBToRGB(rLinear, gLinear, bLinear);
}

// Example: RGB to OKLab
const rgb = [0.5, 0.2, 0.7];
const oklab = rgbToOKLab(rgb[0], rgb[1], rgb[2]);
console.log('OKLab:', oklab);

// Example: OKLab to RGB
const decodedRGB = okLabToRGB(oklab[0], oklab[1], oklab[2]);
console.log('Decoded RGB:', decodedRGB);
