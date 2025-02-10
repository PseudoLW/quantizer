async function promptInputSrc() {
    const inp = document.createElement('input');
    inp.type = 'file';
    document.body.appendChild(inp);
    await new Promise((res) => {
        inp.addEventListener('change', res);
    });
    document.body.removeChild(inp);
    const file = inp.files![0];
    const reader = new FileReader();

    return await new Promise<string>((res) => {
        reader.addEventListener('load', () => res(reader.result as string));
        reader.readAsDataURL(file);
    });
}

function readImagePixels(
    canv: OffscreenCanvas, image: HTMLImageElement
) {
    const ctx = canv.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canv.width, canv.height);
    return imageData.data;
}

async function writeImagePixels(
    canv: OffscreenCanvas,
    image: HTMLImageElement, data: Uint8ClampedArray
) {
    const ctx = canv.getContext('2d')!;
    const imageData = new ImageData(data, canv.width, canv.height);
    ctx.putImageData(imageData, 0, 0);
    const blob = await canv.convertToBlob();
    const url = URL.createObjectURL(blob);

    image.src = url;
}

function loadImage(img: HTMLImageElement, src: string) {
    return new Promise((res) => { img.addEventListener('load', res); img.src = src; });
}

function countColorsReduced(data: Uint8ClampedArray) {
    const colorCounts: Map<number, number> = new Map();

    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = data.slice(i, i + 3);
        const colorKey = (r >> 4) | (g >> 4 << 4) | (b >> 4 << 8);

        colorCounts.set(colorKey, (colorCounts.get(colorKey) ?? 0) + 1);
    }

    return colorCounts;
}

async function main() {
    const src = await promptInputSrc();

    const img1 = document.createElement('img');
    const img2 = document.createElement('img');

    await loadImage(img1, src);

    const canv = new OffscreenCanvas(img1.width, img1.height);

    const pixels = readImagePixels(canv, img1);

    console.log(countColorsReduced(pixels));

    await writeImagePixels(canv, img2, pixels);

    document.body.appendChild(img1);
    document.body.appendChild(img2);
}

main();