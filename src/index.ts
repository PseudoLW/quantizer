type Triple<T = number> = [T, T, T];
type ColorData = { count: number; oklabColor: Triple; };
type QuantizationParameter = { paramName: string, tip: string, defaultVal: number; };

namespace UI {
    export function append(parent: HTMLElement, children: HTMLElement[]) {
        children.forEach((c) => parent.appendChild(c));
    }
    export function detach(children: HTMLElement[]) {
        children.forEach((c) => c.parentElement?.removeChild(c));
    }

    export function createProgressBar() {
        const el = document.createElement('div');
        const progEl = document.createElement('progress');
        const labelEl = document.createElement('label');
        el.classList.add('progress-bar');
        UI.append(el, [progEl, labelEl]);
        let label = '';
        const set = (progress: number) => {
            progEl.value = progress;

            labelEl.textContent = `${label} [${(progress * 100).toFixed(0)}%]`;
        };

        return {
            el, set,
            setLabel(l: string) {
                label = l;
                return this;
            },
            append(parent: HTMLElement) {
                parent.appendChild(el);
                return this;
            },
            detach() {
                el.parentElement?.removeChild(el);
                return this;
            }
        };
    }

    export function createInput(
        inputType: string,
        label: string,
        initialValue?: string | undefined,
        id = 'input-' + Math.floor(100000 * Math.random()).toString().padEnd(5, '0'),
        tooltip = ''
    ) {
        const inputEl = document.createElement('input');
        const labelEl = document.createElement('label');

        labelEl.innerText = label;
        labelEl.htmlFor = id;
        inputEl.type = inputType;
        if (initialValue !== undefined) {
            inputEl.value = initialValue;
        }
        inputEl.id = id;
        if (tooltip) {
            labelEl.title = tooltip;
        }

        return [labelEl, inputEl] as const;
    }

    export function createButton(text: string, onClick?: () => void | undefined) {
        const el = document.createElement('button');
        el.textContent = text;
        if (onClick) {
            el.addEventListener('click', onClick);
        }
        return el;
    }

    export function createGroup<ChildrenType extends readonly HTMLElement[]>(members: ChildrenType) {
        const el = document.createElement('div');
        members.forEach((member) => { el.appendChild(member); });

        return { el, children: members };
    }

    export function createTextDiv(text: string) {
        const el = document.createElement('p');
        el.textContent = text;
        return el;
    }
}

namespace Data {
    export function ImageArrayConverter() {
        const canvas = new OffscreenCanvas(0, 0);
        const ctx = canvas.getContext('2d')!;

        return {
            read(image: HTMLImageElement) {
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                return ctx.getImageData(0, 0, image.width, image.height).data;
            },

            async write(image: HTMLImageElement, pixels: Uint8ClampedArray) {
                const imgDataObj = new ImageData(pixels, canvas.width, canvas.height);
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
        if (a === 0) {
            indexArr[i / 4] = -1;
            continue;
        }
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

function createQuantizationAlgorithm<const P extends QuantizationParameter[]>(
    name: string,
    description: string,
    params: P,
    algorithm: (
        args: { param: { [key in keyof P]: number }, data: ColorData[]; },
        postProgress: (n: number) => void
    ) => {
        assignment: Triple[];
        colors: Triple[];
    }
) {
    const runner = workerize(algorithm);
    const normalizedName = name.toLowerCase().replaceAll(/[^a-z0-9]/g, '-');
    let storedParameters = params.map((s) => s.defaultVal);
    return {
        name,
        normalizedName,
        buildParameterPrompt(onClick: (arg: { [k in keyof P]: number }) => void) {
            const inputGroups = params.map(({ paramName: label, tip }, i) => {
                const inputGroup = UI.createGroup(UI.createInput(
                    'number', label,
                    `${storedParameters[i]}`,
                    `inputgroup-${normalizedName}-${i}`, tip));
                inputGroup.el.classList.add('input-group');
                return inputGroup;
            });

            const executeButton = UI.createButton('Quantize!', () => {
                onClick(inputGroups.map((g) => g.children[1].valueAsNumber) as { [k in keyof P]: number });
            });
            const descriptionEl = UI.createTextDiv(description);
            const elements = [
                descriptionEl,
                ...inputGroups.map(g => g.el),
                executeButton
            ];
            const group = UI.createGroup(elements);
            group.el.classList.add('parameter-group');
            document.body.appendChild(group.el);

            return group.el;
        },
        run(
            data: ColorData[],
            param: { [k in keyof P]: number },
            onProgress: (n: number) => void
        ) {
            storedParameters = param;
            return runner.run({ param, data }, onProgress);
        }
    };
};


const ALGORITHMS = [
    createQuantizationAlgorithm('K-Means',
        'Tries to find the best set of colors that is the closest to each ' +
        'color in the original image. This method is probabilistic and ' +
        'will give different results each time it is run.',
        [
            { paramName: 'Color count', defaultVal: 8, tip: 'How many colors to use' },
            { paramName: 'Attempts', defaultVal: 8, tip: 'How many times to try to find the best colors' },
        ],
        (({ param: [colorCount, attempts], data }, postProgress) => {
            if (colorCount > data.length) {
                colorCount = data.length;
            }
            const maxIteration = 100;
            function toRgb([L, A, B]: Triple) {
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

            function squaredDistance([ax, ay, az]: Triple, [bx, by, bz]: Triple) {
                const dx = ax - bx, dy = ay - by, dz = az - bz;
                return dx * dx + dy * dy + dz * dz;
            }

            function closestCentroidIndex(centroids: Triple[], p: Triple) {
                let minSquaredDist = Infinity, minCentroidIndex = NaN;
                for (let i = 0; i < centroids.length; i++) {
                    const d = squaredDistance(p, centroids[i]);
                    if (d < minSquaredDist) {
                        minCentroidIndex = i;
                        minSquaredDist = d;
                    }
                }
                return [minCentroidIndex, minSquaredDist] as const;
            }

            const shuffleArray = data.map((_, i) => i);
            const allAttemptPoints: Triple[][] = [];
            for (let i = 0; i < attempts; i++) {
                // Partial Fisher-Yates
                const n = shuffleArray.length;
                const attemptPoints: Triple[] = [];
                for (let ii = 0; ii < colorCount; ii++) {
                    const swapIndex = Math.floor(Math.random() * (n - ii));
                    const targetIndex = n - ii - 1;
                    [shuffleArray[swapIndex], shuffleArray[targetIndex]] = [shuffleArray[targetIndex], shuffleArray[swapIndex]];
                    attemptPoints.push(data[shuffleArray[targetIndex]].oklabColor);
                }
                allAttemptPoints.push(attemptPoints);
            }

            let bestScore = Infinity;
            let bestAssignment: Triple[] = [];
            let bestColors: Triple[] = [];
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

                    let maxCentroidMovement = -Infinity;
                    for (let i = 0; i < newCentroids.length; i++) {
                        maxCentroidMovement = Math.max(
                            maxCentroidMovement, squaredDistance(centroids[i], newCentroids[i]));
                    }

                    const absoluteProgress = Math.min(-Math.log10(maxCentroidMovement) / 5, 1);
                    bestProgress = Math.max(absoluteProgress, bestProgress);
                    if (maxCentroidMovement < 0.00001) { break; }

                    postProgress((attempt + Math.max(bestProgress, iteration / 100)) / attempts);
                }

                const centroids = allAttemptPoints[attempt];
                let score = 0;
                const assignment = data.map(({ oklabColor }) => {
                    const [index, squaredDistance] = closestCentroidIndex(centroids, oklabColor);
                    score += squaredDistance;
                    return centroids[index];
                });

                if (score < bestScore) {
                    bestAssignment = assignment;
                    bestScore = score;
                    bestColors = centroids;
                }
            }
            return {
                assignment: bestAssignment.map(oklab => toRgb(oklab)),
                colors: bestColors.map(oklab => toRgb(oklab))
            };
        })
    ),

    createQuantizationAlgorithm('Mean shift',
        'Moves each color a little bit towards its neighbors. This method ' +
        'can be slow for images with vast amounts of colors.',
        [{ paramName: 'Closeness', defaultVal: 0.07, tip: 'How close the colors should be to be considered neighbors' }],
        ({ param: [radius], data }, postProgress) => {
            const maxIteration = 100;
            function toRgb([L, A, B]: Triple) {
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
            let currentPoints = data.slice();
            let bestProgress = 0;
            for (let i = 0; i < maxIteration; i++) {
                const newPoints = currentPoints.map((point) => {
                    const pointSum = [0, 0, 0] as Triple;
                    let totalWeight = 0;
                    for (const otherPoint of currentPoints) {
                        const [xp, yp, zp] = point.oklabColor;
                        const [xo, yo, zo] = otherPoint.oklabColor;

                        const distance = Math.hypot(xp - xo, yp - yo, zp - zo);
                        if (distance < radius) {
                            const w = otherPoint.count;
                            totalWeight += w;
                            pointSum[0] += xo * w;
                            pointSum[1] += yo * w;
                            pointSum[2] += zo * w;
                        }
                    }
                    pointSum[0] /= totalWeight;
                    pointSum[1] /= totalWeight;
                    pointSum[2] /= totalWeight;

                    return { oklabColor: pointSum, count: point.count };
                });

                let maxMovement = -Infinity;
                for (let i = 0; i < currentPoints.length; i++) {
                    const [xp, yp, zp] = currentPoints[i].oklabColor;
                    const [xo, yo, zo] = newPoints[i].oklabColor;

                    const distance = Math.hypot(xp - xo, yp - yo, zp - zo);
                    if (distance > maxMovement) {
                        maxMovement = distance;
                    }
                }
                const absoluteProgress = Math.min(-Math.log10(maxMovement) / 8, 1);
                bestProgress = Math.max(absoluteProgress, bestProgress);
                currentPoints = newPoints;

                if (maxMovement < 0.00000001) {
                    break;
                }
                postProgress(bestProgress);
            }

            const colorSet = new Map<number, Triple>();
            const assignment = currentPoints.map((s) => {
                const rgb = toRgb(s.oklabColor);
                const [r, g, b] = rgb;
                const colorKey = (r << 24) | (g << 12) | (b << 0);
                colorSet.set(colorKey, rgb);
                return rgb;
            });
            return { assignment, colors: Array.from(colorSet.values()) };
        }
    ),

    createQuantizationAlgorithm('Median cut',
        '',
        [{ paramName: 'Color count', defaultVal: 8, tip: 'How many colors to use' }],
        ({ param: [colorCount], data }, postProgress) => {
            const arr = data.map((s, i) => ({
                weight: s.count,
                color: s.oklabColor,
                index: i
            }));
            type Axis = 0 | 1 | 2;
            function findBestAxisInSlice(lo: number, hi: number) {
                const bestValues = Array.from(
                    { length: 3 },
                    () => ({ min: Infinity, max: -Infinity })
                ) as Triple<{ min: number, max: number; }>;
                for (let i = lo; i <= hi; i++) {
                    for (let axis = 0 as Axis; axis <= 3; axis++) {
                        const component = data[i].oklabColor[axis];
                        const { min, max } = bestValues[axis];
                        bestValues[axis].min = Math.min(min, component);
                        bestValues[axis].max = Math.max(max, component);
                    }
                }
                let bestAxis = 0;
                let bestAxisDifference = -Infinity;
                for (let axis = 0 as Axis; axis <= 3; axis++) {
                    const axisValues = bestValues[axis];
                    const axisDifference = axisValues.max - axisValues.min;
                    if (axisDifference > bestAxisDifference) {
                        bestAxis = axis;
                        bestAxisDifference = axisDifference;
                    }
                }
                return { axis: bestAxis, span: bestAxisDifference };
            }

            function swap(arr: unknown[], i1: number, i2: number) {
                let temp = arr[i1];
                arr[i1] = arr[i2];
                arr[i2] = temp;
            }

            function partitionSlice(
                lo: number, hi: number, axis: number,
                weightSum: number
            ) {
                let target = weightSum / 2;
                while (true) {
                    const sliceLength = hi - lo + 1;

                    // Base cases
                    if (sliceLength === 0) {
                        throw new Error('Cannot find median of an empty slice.');
                    } else if (sliceLength === 1) {
                        return target * 2 > arr[lo].color[axis] ? lo + 1 : lo;
                    } else if (sliceLength === 2) {
                        if (arr[lo] > arr[hi]) swap(arr, lo, hi);
                        if (target > arr[lo].color[axis]) { // Focus on the left element.
                            return target * 2 > arr[lo].color[axis] ? lo + 1 : lo;
                        } else { // Focus on the right element.
                            return (target - arr[lo].color[axis]) * 2 > arr[hi].color[axis] ? hi + 1 : hi;
                        }
                    }

                    // Median of three to choose a pivot
                    const pi = Math.floor((lo + hi) / 2);
                    if (arr[lo] > arr[pi]) swap(arr, lo, pi);
                    if (arr[lo] > arr[hi]) swap(arr, lo, hi);
                    if (arr[pi] > arr[hi]) swap(arr, pi, hi);

                    const threshold = arr[pi];
                    let i = lo - 1, j = hi + 1;
                    let rightWeightSum = 0;

                    // Hoare partitioning
                    while (true) {
                        do { i++; } while (arr[i] < threshold);
                        do { j--; rightWeightSum += arr[j].color[axis]; } while (arr[j] > threshold);

                        rightWeightSum -= arr[j].color[axis];
                        if (i >= j) {
                            const leftWeightSum = weightSum - rightWeightSum;
                            //  tail-recursively "call" the partition function again.
                            if (target < leftWeightSum) {
                                // Focus on the left partition
                                hi = j;
                                weightSum = leftWeightSum;
                            } else {
                                // Focus on the right partition
                                lo = j + 1;
                                weightSum = rightWeightSum;
                                target -= leftWeightSum;
                            }
                            break;
                        }

                        swap(arr, i, j);
                        rightWeightSum += arr[j].color[axis];
                    }
                }
            }

            type Slice = {
                indices: { lo: number; hi: number; }; // incl left excl right
                range: { axis: number; span: number; };
                weightSum: number;
            };
            const sliceQueue = [{
                indices: { lo: 0, hi: arr.length - 1 },
                range: findBestAxisInSlice(0, arr.length - 1),
                weightSum: data.reduce((acc, i) => acc + i.count, 0)
            }] as Slice[];

            for (let _ = 0; _ < colorCount; _++) {
                const bestSliceIdx = sliceQueue.reduce(
                    (best, slice, i) => {
                        const span = slice.range.span;
                        if (span > best.span) {
                            best.index = i;
                            best.span = span;
                        }
                        return best;
                    }, { index: NaN, span: 0 }).index;
                swap(sliceQueue, bestSliceIdx, sliceQueue.length - 1);
                const slice = sliceQueue.pop()!;

                const targetWeight = slice.weightSum / 2;

                // while (true) {
                //     const partitionResult = partitionSlice()
                // }

            }
        }
    )

] as const;

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

const createApp = () => {
    const IndexerRunner = workerize(indexColors);
    const progressDisplay = UI.createProgressBar();
    const pixelReader = Data.ImageArrayConverter();
    let algorithmPreferenceIndex = 0;
    type UploadImageResult = { pixels: Uint8ClampedArray; colorData: ColorData[]; indexArr: number[]; };

    async function uploadImage(): Promise<UploadImageResult> {
        const { src, pruneBitCount } = await promptInputSrc();
        progressDisplay
            .append(document.body)
            .setLabel('Loading image')
            .set(0);
        const inputImage = new Image();
        await Data.loadImage(inputImage, src);
        const pixels = pixelReader.read(inputImage);
        pruneRgbBits(pixels, pruneBitCount);

        progressDisplay.setLabel('Counting colors');
        const indexerOutput = await IndexerRunner.run(pixels, progressDisplay.set);
        progressDisplay.detach();

        return { pixels, ...indexerOutput };
    }

    async function displayPicture(
        result: { assignment: Triple[], colors: Triple[]; },
        pixels: Uint8ClampedArray,
        indexArr: number[],

        colorData: ColorData[]
    ) {
        for (let i = 0; i < indexArr.length; i++) {
            const colIndex = indexArr[i];
            if (colIndex !== -1) {
                const [r, g, b] = result.assignment[indexArr[i]];
                pixels[4 * i + 0] = r;
                pixels[4 * i + 1] = g;
                pixels[4 * i + 2] = b;
            }
        }

        const img2 = document.createElement('img');
        await pixelReader.write(img2, pixels);

        const colDisplay = UI.createGroup(result.colors.map(([r, g, b]) => {
            const box = document.createElement('div');
            box.style.background = `rgba(${r}, ${g}, ${b}, 1.0)`;
            box.classList.add('col-list');
            return box;
        }));

        const imgContainer = UI.createGroup([img2]);
        imgContainer.el.id = 'picture-container';
        const retryButton = UI.createButton('Retry with the same picture');
        const changePicButton = UI.createButton('Upload another picture');
        const currentElements = [
            colDisplay.el,
            imgContainer.el,
            UI.createGroup([retryButton, changePicButton]).el
        ];

        retryButton.classList.add('full-flex');
        changePicButton.classList.add('full-flex');
        UI.append(document.body, currentElements);

        retryButton.addEventListener('click', () => {
            UI.detach(currentElements);
            promptAndRunAlgorithm({ colorData, pixels, indexArr });
        });
        changePicButton.addEventListener('click', () => {
            UI.detach(currentElements);
            run();
        });
    }

    async function promptAndRunAlgorithm(arg: UploadImageResult) {
        type Algo<T extends QuantizationParameter[]> = ReturnType<typeof createQuantizationAlgorithm<T>>;
        const parameterElements: HTMLElement[] = [];
        const selectorRadio: (readonly [HTMLLabelElement, HTMLInputElement])[] = [];
        ALGORITHMS.forEach(<T extends QuantizationParameter[]>(algo: Algo<T>, i: number) => {
            const { colorData, indexArr, pixels } = arg;
            const group = algo.buildParameterPrompt(async (parameter) => {
                UI.detach([radioGroups.el, ...parameterElements]);
                progressDisplay.append(document.body);
                const result = await algo.run(colorData, parameter, progressDisplay.set);
                progressDisplay.detach();
                displayPicture(result, pixels, indexArr, colorData);
            });
            group.id = 'parameter-group-' + algo.normalizedName;
            parameterElements.push(group);
            group.hidden = true;

            const radioGroup = UI.createInput('radio', algo.name, algo.name);
            radioGroup[1].name = 'algorithm';
            radioGroup[1].addEventListener('change', () => {
                parameterElements.forEach((e) => { e.hidden = true; });
                group.hidden = false;
                algorithmPreferenceIndex = i;
            });
            selectorRadio.push(radioGroup);
        });
        selectorRadio[algorithmPreferenceIndex][1].checked = true;
        parameterElements[algorithmPreferenceIndex].hidden = false;
        const radioGroups = UI.createGroup(selectorRadio.flatMap((s) => [s[1], s[0]]));
        radioGroups.el.classList.add('algo-selector');
        UI.append(document.body, [radioGroups.el, ...parameterElements]);
    }

    async function promptInputSrc() {
        const imageInput = document.createElement('input');
        const imageInputLabel = document.createElement('label');
        const advancedInputLabel = UI.createTextDiv('Advanced settings, hover at the label to see what they do.');
        const bitCount = UI.createGroup(UI.createInput(
            'number',
            'Bit pruning',
            '12',
            'bit-count',
            'How many bits to use for each color channel. If you are sure ' +
            'that your image has few unique colors, you can bump this up to ' +
            'preserve original colors.'
        ));
        bitCount.el.classList.add('input-group');

        imageInput.type = 'file';
        imageInput.accept = 'image/*';
        imageInput.id = 'image-input';
        imageInputLabel.innerText = 'Input your image';
        imageInputLabel.htmlFor = 'image-input';
        UI.append(document.body, [imageInput, imageInputLabel, advancedInputLabel, bitCount.el]);

        await new Promise((res) => { imageInput.addEventListener('change', res); });
        UI.detach([bitCount.el, imageInputLabel, advancedInputLabel, imageInput]);

        const file = imageInput.files![0];
        const reader = new FileReader();

        const src = await new Promise<string>((res) => {
            reader.addEventListener('load', () => res(reader.result as string));
            reader.readAsDataURL(file);
        });
        return { src, pruneBitCount: bitCount.children[1].valueAsNumber };
    }

    async function run() {
        const out = await uploadImage();
        await promptAndRunAlgorithm(out);
    }
    return { run };
};



createApp().run();