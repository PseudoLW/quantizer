function swap(arr: unknown[], a: number, b: number) {
    const temp = arr[a];
    arr[a] = arr[b];
    arr[b] = temp;
}

function weightedMedian(arr: number[], lo = 0, hi = arr.length - 1): number {
    let totalWeight = 0;
    for (let i = lo; i <= hi; i++) {
        totalWeight += arr[i];
    }
    let target = totalWeight / 2;

    // Set up tail recursion.
    while (true) {
        const sliceLength = hi - lo + 1;

        // Base cases
        if (sliceLength === 0) {
            throw new Error('Cannot find median of an empty slice.');
        } else if (sliceLength === 1) {
            return target * 2 > arr[lo] ? lo + 1 : lo;
        } else if (sliceLength === 2) {
            if (arr[lo] > arr[hi]) swap(arr, lo, hi);

            if (target > arr[lo]) { // Focus on the left element.
                return target * 2 > arr[lo] ? lo + 1 : lo;
            } else { // Focus on the right element.
                return (target - arr[lo]) * 2 > arr[hi] ? hi + 1 : hi;
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
            do { j--; rightWeightSum += arr[j]; } while (arr[j] > threshold);

            rightWeightSum -= arr[j];
            if (i >= j) {
                const leftWeightSum = totalWeight - rightWeightSum;
                //  tail-recursively "call" the partition function again.
                if (target < leftWeightSum) {
                    // Focus on the left partition
                    hi = j;
                    totalWeight = leftWeightSum;
                } else {
                    // Focus on the right partition
                    lo = j + 1;
                    totalWeight = rightWeightSum;
                    target -= leftWeightSum;
                }
                break;
            }

            swap(arr, i, j);
            rightWeightSum += arr[j];
        }
    }
}
const viz = (n: number, pad = 3) => {
    const mapper = Object.fromEntries(Array.from('⁰¹²³⁴⁵⁶⁷⁸⁹', (s, i) => [i, s]));
    return Array.from(n.toString(), s => mapper[s] ?? s).join('').padStart(pad, ' ');
};
const visualizeTriple = (a: Triple<number>) => a.map(s => s.toString().padStart(3, ' ')).join(' ');
type Triple<T = number> = [T, T, T];
const f = ({ param: [colorCount], data }: { param: [number]; data: { count: number; oklabColor: Triple; }[]; }, postProgress: (n: number) => void) => {
    const arr = data.map((s, i) => ({
        weight: s.count,
        color: s.oklabColor.map(s => Math.round(s * 100)) as Triple, // TODO: return
        index: i
    }));
    // console.log(arr.map(({ weight, color }, i) => `${viz(i)} ${visualizeTriple(color)} (${weight})`).join('\n'));

    type Axis = 0 | 1 | 2;
    function findBestAxisInSlice(lo: number, hi: number) {
        const bestValues = Array.from(
            { length: 3 },
            () => ({ min: Infinity, max: -Infinity })
        ) as Triple<{ min: number, max: number; }>;
        for (let i = lo; i <= hi; i++) {
            for (let axis = 0 as Axis; axis < 3; axis++) {
                const component = arr[i].color[axis];
                const { min, max } = bestValues[axis];
                bestValues[axis].min = Math.min(min, component);
                bestValues[axis].max = Math.max(max, component);
            }
        }

        let bestAxis = 0;
        let bestAxisDifference = -Infinity;
        for (let axis = 0 as Axis; axis < 3; axis++) {
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

    function partitionSlice(lo: number, hi: number, axis: number, weightSum: number) {
        let target = weightSum / 2;
        while (true) {
            const sliceLength = hi - lo + 1;

            if (sliceLength === 0) {
                throw new Error('Cannot find median of an empty slice.');
            } else if (sliceLength === 1) {
                return target * 2 > arr[lo].color[axis] ? lo + 1 : lo;
            } else if (sliceLength === 2) {
                if (arr[lo].color[axis] > arr[hi].color[axis]) swap(arr, lo, hi);
                if (target > arr[lo].color[axis]) {
                    return target * 2 > arr[lo].color[axis] ? lo + 1 : lo;
                } else {
                    return (target - arr[lo].color[axis]) * 2 > arr[hi].color[axis] ? hi + 1 : hi;
                }
            }
            const pi = Math.floor((lo + hi) / 2);
            if (arr[lo].color[axis] > arr[pi].color[axis]) swap(arr, lo, pi);
            if (arr[lo].color[axis] > arr[hi].color[axis]) swap(arr, lo, hi);
            if (arr[pi].color[axis] > arr[hi].color[axis]) swap(arr, pi, hi);

            const threshold = arr[pi].color[axis];
            let i = lo - 1, j = hi + 1;
            let rightWeightSum = 0;

            while (true) {
                do { i++; } while (arr[i].color[axis] < threshold);
                do { j--; rightWeightSum += arr[j].weight; } while (arr[j].color[axis] > threshold);

                rightWeightSum -= arr[j].color[axis];
                if (i >= j) {
                    const leftWeightSum = weightSum - rightWeightSum;
                    if (target < leftWeightSum) {
                        hi = j;
                        weightSum = leftWeightSum;
                    } else {
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
        weightSum: arr.reduce((acc, i) => acc + i.weight, 0)
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

        const { indices: { lo, hi }, range: { axis }, weightSum } = slice;
        const partitionIndex = partitionSlice(lo, hi, axis, weightSum);
        let leftPartWeight = 0;
        for (let i = 0; i < partitionIndex; i++) {
            leftPartWeight += arr[i].weight;
        }
        sliceQueue.push({
            indices: { lo, hi: partitionIndex - 1 },
            range: findBestAxisInSlice(lo, partitionIndex - 1),
            weightSum: leftPartWeight
        }, {
            indices: { lo: partitionIndex, hi },
            range: findBestAxisInSlice(partitionIndex, hi),
            weightSum: weightSum - leftPartWeight
        });
    }
    const averageColors: Triple[] = [];
    for (const { indices: { lo, hi }, weightSum } of sliceQueue) {
        const averageColor = [0, 0, 0] as Triple;

        for (let i = lo; i <= hi; i++) {
            for (let c = 0; c < 3; c++) {
                averageColor[c] += arr[i].color[c] * arr[i].weight;
            }
        }
        averageColor[0] /= weightSum;
        averageColor[1] /= weightSum;
        averageColor[2] /= weightSum;
        averageColors.push(averageColor);
    }
};

import wawa from '../wawa.json';

f({ param: [8], data: wawa }, () => { });
