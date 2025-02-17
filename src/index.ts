type Triple = [number, number, number];

namespace Algos {
    export function quickSelect<T>(arr: T[], n: number, compare: (a: T, b: T) => number): T {
        function partition(arr: T[], low: number, high: number): number {
            const randomIndex = Math.floor(Math.random() * (high - low + 1)) + low;
            const pivot = arr[randomIndex];
            let i = low - 1, j = high + 1;

            while (true) {
                do i++; while (compare(arr[i], pivot) < 0);
                do j--; while (compare(arr[j], pivot) > 0);
                if (i >= j) return j;

                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }

        function qs(arr: T[], lo: number, hi: number, n: number): T {
            if (lo === hi) return arr[lo];
            const pivotIndex = partition(arr, lo, hi);

            if (n <= pivotIndex) {
                return qs(arr, lo, pivotIndex, n);
            } else {
                return qs(arr, pivotIndex + 1, hi, n);
            }
        }

        return qs(arr, 0, arr.length - 1, n);
    }

    type Triple = [number, number, number];

    function bbDistance([px, py, pz]: Triple, [minX, minY, minZ]: Triple, [maxX, maxY, maxZ]: Triple): number {
        const dx = Math.max(0, Math.max(minX - px, px - maxX));
        const dy = Math.max(0, Math.max(minY - py, py - maxY));
        const dz = Math.max(0, Math.max(minZ - pz, pz - maxZ));

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

namespace UI {
    export async function promptInputSrc() {
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

    export function createLabel(text: string) {
        const el = document.createElement('div');
        el.textContent = text;
        document.body.appendChild(el);
        return el;
    }
}

namespace Data {
    export function ImageArrayConverter({ width, height }: { width: number, height: number; }) {
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

    export function loadImage(img: HTMLImageElement, src: string) {
        return new Promise((res) => { img.addEventListener('load', res); img.src = src; });
    }
}

namespace OKlab {
    export function fromRgb(r: number, g: number, b: number) {
        const [rr, gg, bb] = [r, g, b].map(
            c => {
                const c01 = c / 255;
                return c01 <= 0.04045 ? c01 / 12.92 : Math.pow((c01 + 0.055) / 1.055, 2.4);
            }
        );
        let l = 0.4122214708 * rr + 0.5363325363 * gg + 0.0514459929 * bb;
        let m = 0.2119034982 * rr + 0.6806995451 * gg + 0.1073969566 * bb;
        let s = 0.0883024619 * rr + 0.2817188376 * gg + 0.6299787005 * bb;
        // Math.crb (cube root) here is the equivalent of the C++ cbrtf function here: https://bottosson.github.io/posts/oklab/#converting-from-linear-srgb-to-oklab
        l = Math.cbrt(l); m = Math.cbrt(m); s = Math.cbrt(s);
        return [
            l * +0.2104542553 + m * +0.7936177850 + s * -0.0040720468,
            l * +1.9779984951 + m * -2.4285922050 + s * +0.4505937099,
            l * +0.0259040371 + m * +0.7827717662 + s * -0.8086757660
        ] as Triple;
    }
    export function toRgb(L: number, A: number, B: number) {
        let l = L + A * +0.3963377774 + B * +0.2158037573;
        let m = L + A * -0.1055613458 + B * -0.0638541728;
        let s = L + A * -0.0894841775 + B * -1.2914855480;
        l = l ** 3; m = m ** 3; s = s ** 3;
        let rr = l * +4.0767416621 + m * -3.3077115913 + s * +0.2309699292;
        let gg = l * -1.2684380046 + m * +2.6097574011 + s * -0.3413193965;
        let bb = l * -0.0041960863 + m * -0.7034186147 + s * +1.7076147010;
        return [rr, gg, bb].map(c => {
            const c01 = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
            return Math.max(Math.min(Math.round(c01 * 255), 255), 0);
        }) as Triple;
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

type ColorData = {
    count: number;
    rgbColor: Triple;
    oklabColor: Triple;
};
function indexColors(data: Uint8ClampedArray) {
    const colorCodeToIndex = new Map<number, number>();
    const colorData = <ColorData[]>[];
    const indexArr = new Array<number>(data.length / 4);
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = data.slice(i, i + 3);
        const colorKey = ColorPacker.pack(r, g, b);
        let colorIndex = colorCodeToIndex.get(colorKey);
        if (colorIndex === undefined) {
            colorIndex = colorData.length;
            colorCodeToIndex.set(colorKey, colorIndex);
            colorData.push({
                count: 1,
                rgbColor: [r, g, b],
                oklabColor: OKlab.fromRgb(r, g, b)
            });
        }
        colorData[colorIndex].count++;
        indexArr[i / 4] = colorIndex;
    }
    return { colorData, indexArr };
}

function naiveKmeansQuantizer(
    data: ColorData[],
    finalCount: number,
    attempts: number, maxIteration = 100
) {
    const shuffleArray = data.map((_, i) => i);
    const allAttemptPoints: Triple[][] = [];
    for (let i = 0; i < attempts; i++) {
        // Partial Fisher-Yates
        const n = shuffleArray.length;
        const attemptPoints: Triple[] = [];
        for (let ii = 0; ii < finalCount; ii++) {
            const swapIndex = Math.floor(Math.random() * (n - ii));
            const targetIndex = n - ii - 1;
            [shuffleArray[swapIndex], shuffleArray[targetIndex]] = [shuffleArray[targetIndex], shuffleArray[swapIndex]];
            attemptPoints.push(data[shuffleArray[targetIndex]].oklabColor);
        }
        allAttemptPoints.push(attemptPoints);
    }
    let attempt = 0;
    // for (let attempt = 0; attempt < attempts; attempt++) {

    for (let iteration = 0; iteration < maxIteration; iteration++) {
        const centroids = allAttemptPoints[attempt].slice();
        // console.log(centroids);

        const centroidAssignedPoints = centroids.map(() => [] as ColorData[]);
        // Assign each point to the centroid
        for (const color of data) {
            // Find closest centroid to that point
            const { oklabColor: [pl, pa, pb] } = color;
            let minDist = Infinity, minCentroidIndex = NaN;
            for (let i = 0; i < centroids.length; i++) {
                const [cl, ca, cb] = centroids[i];
                const distance = Math.hypot(pl - cl, pa - ca, pb - cb);
                if (distance < minDist) {
                    minCentroidIndex = i;
                    minDist = distance;
                }
            }
            centroidAssignedPoints[minCentroidIndex].push(color);
        }

        // console.log('Centroid assigned points', centroidAssignedPoints);
        const newCentroids = centroidAssignedPoints.map((points) => {
            let totalL = 0, totalA = 0, totalB = 0;
            let totalWeight = 0;
            for (const { oklabColor: [l, a, b], count: weight } of points) {
                totalL += weight * l;
                totalA += weight * a;
                totalB += weight * b;
                totalWeight += weight;
            }
            return [totalL / totalWeight, totalA / totalWeight, totalB / totalWeight] as Triple;
        });
        // console.log('new Centroids:', newCentroids);

        const centroidMovements = newCentroids.map(([l0, a0, b0], i) => {
            const [l1, a1, b1] = centroids[i];
            return Math.hypot(l1 - l0, a1 - a0, b1 - b0);
        });
        console.log('Centroid movements:\n' + centroidMovements.join('\n'));
        allAttemptPoints[attempt] = newCentroids;

        if (centroidMovements.every((s) => s < 0.00001)) {
            break;
        }
    }

    // Assign each point to the centroid
    const centroids = allAttemptPoints[attempt];
    const assignment = data.map(({ oklabColor: [pl, pa, pb] }, i) => {
        let minDist = Infinity, minCentroidIndex = NaN;
        for (let i = 0; i < centroids.length; i++) {
            const [cl, ca, cb] = centroids[i];
            const distance = Math.hypot(pl - cl, pa - ca, pb - cb);
            if (distance < minDist) {
                minCentroidIndex = i;
                minDist = distance;
            }
        }

        return OKlab.toRgb(...centroids[minCentroidIndex]);
    });
    // }

    return assignment;
}

function pruneRgbBits(pixels: Uint8ClampedArray, totalBits: number) {
    const bits = [1, 2, 0].map(i => Math.floor((totalBits + i) / 3));
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
    const src = await UI.promptInputSrc();

    const img1 = document.createElement('img');
    await Data.loadImage(img1, src);
    document.body.appendChild(img1);
    const pixelReader = Data.ImageArrayConverter(img1);

    const pixels = pixelReader.read(img1);
    pruneRgbBits(pixels, 12);
    const pixelCounts = countColors(pixels);
    const { indexArr, colorData } = indexColors(pixels);
    console.log(colorData);

    const result = naiveKmeansQuantizer(colorData, 8, 8);
    console.log(result);

    for (let i = 0; i < indexArr.length; i++) {
        const [r, g, b] = result[indexArr[i]];
        pixels[4 * i + 0] = r;
        pixels[4 * i + 1] = g;
        pixels[4 * i + 2] = b;
    }

    UI.createLabel(`Counted ${pixelCounts.size} pixels`);
    const img2 = document.createElement('img');
    await pixelReader.write(img2, pixels);
    document.body.appendChild(img2);
}

main();