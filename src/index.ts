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
        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        document.body.appendChild(imageInput);

        await new Promise((res) => { imageInput.addEventListener('change', res); });
        document.body.removeChild(imageInput);

        const file = imageInput.files![0];
        const reader = new FileReader();

        return await new Promise<string>((res) => {
            reader.addEventListener('load', () => res(reader.result as string));
            reader.readAsDataURL(file);
        });
    }
    export function createInput(
        inputType: string,
        label: string,
        initialValue: string,
        id = 'input-' + Math.floor(100000 * Math.random()).toString().padEnd(5, '0')
    ) {
        const inputEl = document.createElement('input');
        const labelEl = document.createElement('label');

        labelEl.innerText = label;
        labelEl.htmlFor = id;
        inputEl.type = inputType;
        inputEl.value = initialValue;
        inputEl.id = id;

        return [labelEl, inputEl] as const;
    }
    export function createButton(text: string, onClick: () => void) {
        const el = document.createElement('button');
        el.textContent = text;
        el.addEventListener('click', onClick);
        return el;
    }

    export function createGroup<ChildrenType extends readonly HTMLElement[]>(members: ChildrenType) {
        const el = document.createElement('div');
        members.forEach((member) => { el.appendChild(member); });

        return {
            el,
            children: members
        };
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

type ColorData = {
    count: number;
    oklabColor: Triple;
};

function workerize<I, O>(
    fn: (event: I, postProgress: (n: number) => void) => O
) {
    const fnStr = `
    self.onmessage = (ev) => {
        const fn = (n) => { postMessage({ done: false, prog: n }) };
        const out = (${fn.toString()})(ev.data, fn);
        postMessage({ done: true, out });
    };`;

    const fileBlob = new Blob([fnStr], { type: 'text/javascript' });
    const fileUrl = URL.createObjectURL(fileBlob);
    const worker = new Worker(fileUrl);
    URL.revokeObjectURL(fileUrl);
    return {
        run(arg: I, onProgress: (progress: number) => void) {
            return new Promise<O>((res) => {
                type EventType = { done: true; out: O; } | { done: false; prog: number; };

                const fn = ({ data }: MessageEvent<EventType>) => {
                    if (data.done) {
                        worker.removeEventListener('message', fn);
                        res(data.out);
                    } else {
                        onProgress(data.prog);
                    }
                };
                worker.addEventListener('message', fn);
                worker.postMessage(arg);
            });
        }
    };
}

function indexColors(data: Uint8ClampedArray, postProgress: (n: number) => void) {
    function fromRgb(r: number, g: number, b: number) {
        const [rr, gg, bb] = [r, g, b].map(
            c => {
                const c01 = c / 255;
                return c01 <= 0.04045 ? c01 / 12.92 : Math.pow((c01 + 0.055) / 1.055, 2.4);
            }
        );
        let l = 0.4122214708 * rr + 0.5363325363 * gg + 0.0514459929 * bb;
        let m = 0.2119034982 * rr + 0.6806995451 * gg + 0.1073969566 * bb;
        let s = 0.0883024619 * rr + 0.2817188376 * gg + 0.6299787005 * bb;
        l = Math.cbrt(l); m = Math.cbrt(m); s = Math.cbrt(s);
        return [
            l * +0.2104542553 + m * +0.7936177850 + s * -0.0040720468,
            l * +1.9779984951 + m * -2.4285922050 + s * +0.4505937099,
            l * +0.0259040371 + m * +0.7827717662 + s * -0.8086757660
        ] as Triple;
    }

    const colorCodeToIndex = new Map<number, number>();
    const colorData = <ColorData[]>[];
    const indexArr = new Array<number>(data.length / 4);
    let lastProgressPercent = 0;
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = data.slice(i, i + 4);
        const colorKey = (r << 24) | (g << 12) | (b << 0);
        let colorIndex = colorCodeToIndex.get(colorKey);
        if (colorIndex === undefined) {
            colorIndex = colorData.length;
            colorCodeToIndex.set(colorKey, colorIndex);
            colorData.push({
                count: a / 255,
                oklabColor: fromRgb(r, g, b)
            });
        }
        colorData[colorIndex].count += a / 255;
        indexArr[i / 4] = colorIndex;
        if (Math.floor(100 * i / data.length) > lastProgressPercent) {
            postProgress(i / data.length);
            lastProgressPercent = 100 * i / data.length;
        }
    }
    return { colorData, indexArr };
}

namespace KMeans {
    export const promptInput = () => {
        return new Promise<{ colorCount: number; bitCount: number; }>((res) => {
            const colorInputGroup = UI.createGroup(UI.createInput('number', 'Color count', '8'));
            const colorPruneGroup = UI.createGroup(UI.createInput('number', 'Bit reduction', '12'));
            const button = UI.createButton('Quantize!', () => {
                res({
                    colorCount: colorInputGroup.children[1].valueAsNumber,
                    bitCount: colorPruneGroup.children[1].valueAsNumber
                });

                document.body.removeChild(colorPruneGroup.el);
                document.body.removeChild(colorInputGroup.el);
                document.body.removeChild(button);
            });

            document.body.appendChild(colorInputGroup.el);
            document.body.appendChild(colorPruneGroup.el);
            document.body.appendChild(button);
        });
    };

    export const quantize = (
        { data, finalCount, attempts, maxIteration }: {
            data: ColorData[];
            finalCount: number;
            attempts: number;
            maxIteration: number;
        },
        postProgress: (n: number) => void
    ) => {
        function toRgb(L: number, A: number, B: number) {
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

        function closestCentroidIndex(centroids: Triple[], [pl, pa, pb]: Triple) {
            let minDist = Infinity, minCentroidIndex = NaN;
            for (let i = 0; i < centroids.length; i++) {
                const [cl, ca, cb] = centroids[i];
                const distance = Math.hypot(pl - cl, pa - ca, pb - cb);
                if (distance < minDist) {
                    minCentroidIndex = i;
                    minDist = distance;
                }
            }
            return [minCentroidIndex, minDist] as const;
        }

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


        let bestAssignment: Triple[] = [];
        let bestScore = Infinity;
        for (let attempt = 0; attempt < attempts; attempt++) {
            let bestProgress = 0;
            for (let iteration = 0; iteration < maxIteration; iteration++) {
                const centroids = allAttemptPoints[attempt].slice();

                const centroidAssignedPoints = centroids.map(() => [] as ColorData[]);
                for (const color of data) {
                    const [index] = closestCentroidIndex(centroids, color.oklabColor);
                    centroidAssignedPoints[index].push(color);
                }

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

                const centroidMovements = newCentroids.map(([l0, a0, b0], i) => {
                    const [l1, a1, b1] = centroids[i];
                    return Math.hypot(l1 - l0, a1 - a0, b1 - b0);
                });
                allAttemptPoints[attempt] = newCentroids;
                const maxCentroidMovements = Math.max(...centroidMovements);
                const absoluteProgress = Math.min(-Math.log10(maxCentroidMovements) / 5, 1);
                bestProgress = Math.max(absoluteProgress, bestProgress);

                if (centroidMovements.every((s) => s < 0.00001)) {
                    break;
                }

                postProgress((attempt + Math.max(bestProgress, iteration / 100)) / attempts);
            }

            const centroids = allAttemptPoints[attempt];
            let score = 0;
            const assignment = data.map(({ oklabColor }) => {
                const [index, distance] = closestCentroidIndex(centroids, oklabColor);
                score += distance;
                return centroids[index];
            });

            if (score < bestScore) {
                bestAssignment = assignment;
                bestScore = score;
            }
        }
        return bestAssignment.map(oklab => toRgb(...oklab));
    };
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
    const IndexerRunner = workerize(indexColors);
    const kMeansRunner = workerize(KMeans.quantize);

    const src = await UI.promptInputSrc();

    const img1 = document.createElement('img');
    await Data.loadImage(img1, src);
    const pixelReader = Data.ImageArrayConverter(img1);

    const progressDisplay = document.createElement('div');
    const setProgress = (label: string) => (progress: number) => {
        const loadingBar = '█'
            .repeat(Math.floor(50 * progress))
            .padEnd(50, '░');
        progressDisplay.textContent = `${label} [${loadingBar}]`;
    };
    const pixels = pixelReader.read(img1);

    const parameter = await KMeans.promptInput();
    
    pruneRgbBits(pixels, parameter.bitCount);

    document.body.appendChild(progressDisplay);
    const { indexArr, colorData } = await IndexerRunner.run(
        pixels,
        setProgress('Counting colors...')
    );
    pruneRgbBits(pixels, parameter.colorCount);

    const result = await kMeansRunner.run({
        data: colorData,
        finalCount: parameter.colorCount,
        attempts: 8,
        maxIteration: 100
    }, setProgress('Quantizing...'));
    document.body.removeChild(progressDisplay);

    for (let i = 0; i < indexArr.length; i++) {
        const [r, g, b] = result[indexArr[i]];
        pixels[4 * i + 0] = r;
        pixels[4 * i + 1] = g;
        pixels[4 * i + 2] = b;
    }

    const img2 = document.createElement('img');
    await pixelReader.write(img2, pixels);
    document.body.appendChild(img2);
}

main();