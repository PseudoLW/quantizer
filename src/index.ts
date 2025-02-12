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


function ImageArrayConverter({ width, height }: { width: number, height: number; }) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    return {
        read(image: HTMLImageElement) {
            ctx.drawImage(image, 0, 0);
            return ctx.getImageData(0, 0, width, height).data;
        },

        async write(image: HTMLImageElement, pixels: Uint8ClampedArray) {
            const imgDataObj = new ImageData(pixels, width, height);
            ctx.putImageData(imgDataObj, 0, 0);
            const blob = await canvas.convertToBlob();
            const url = URL.createObjectURL(blob);
            image.src = url;
        }
    };
}

function loadImage(img: HTMLImageElement, src: string) {
    return new Promise((res) => { img.addEventListener('load', res); img.src = src; });
}

function colorBitsAmount(totalBits: number) {
    return [1, 2, 0].map(i => Math.floor((totalBits + i) / 3)) as [number, number, number];
}

type Triple = [number, number, number];
namespace OKlab {
    export function fromRgb(r: number, g: number, b: number) {
        const [rr, gg, bb] = [r, g, b].map(
            c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );
        const L = +0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
        const A = +0.5382 * rr - 0.4600 * gg - 0.0782 * bb;
        const B = -0.0781 * rr - 0.3663 * gg + 0.4444 * bb;
        return [L, A, B] as Triple;
    }
    export function toRgb(L: number, A: number, B: number) {
        const rr = L + 0.3983 * A + 0.0893 * B;
        const gg = L - 0.1289 * A - 0.0918 * B;
        const bb = L - 0.1543 * A + 0.5193 * B;
        return [rr, gg, bb].map(
            c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
        ) as Triple;
    }
}
namespace ColorPacker {
    export function pack(r: number, g: number, b: number) {
        return (r << 12) | (g << 8) | (b << 0);
    }
    export function unpack(code: number) {
        const r = (code >> 12) & 0xFF;
        const g = (code >> 8) & 0xFF;
        const b = (code >> 0) & 0xFF;
        return [r, g, b] as Triple;
    }
}


function countColors(data: Uint8ClampedArray) {
    const colorCounts: Map<number, number> = new Map();
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = data.slice(i, i + 3);
        const colorKey = ColorPacker.pack(r, g, b);
        colorCounts.set(colorKey, (colorCounts.get(colorKey) ?? 0) + 1);
    }

    return colorCounts;
}

function pruneRgbBits(pixels: Uint8ClampedArray, totalBits: number) {
    const bits = colorBitsAmount(totalBits);
    for (let i = 0; i < pixels.length; i += 4) {
        bits.forEach((bitcount, j) => {
            const index = i + j;
            const val = pixels[index];
            const maxVal = (1 << bitcount) - 1;
            const bitCompressed = Math.floor(maxVal / 255 * val + 0.5);

            const restored = Math.round(255 * bitCompressed / maxVal);
            pixels[index] = restored;
        });
    }
}

async function main() {
    const src = await promptInputSrc();

    const img1 = document.createElement('img');
    await loadImage(img1, src);
    document.body.appendChild(img1);
    const pixelReader = ImageArrayConverter(img1);

    const pixels = pixelReader.read(img1);
    pruneRgbBits(pixels, 12);
    console.log(countColors(pixels));

    const img2 = document.createElement('img');
    await pixelReader.write(img2, pixels);
    document.body.appendChild(img2);
}

main();