function swap(arr: unknown[], a: number, b: number) {
    const temp = arr[a];
    arr[a] = arr[b];
    arr[b] = temp;
}


function hoarePartition(arr: number[], lo: number, hi: number): number {
    const pi = Math.floor((lo + hi) / 2);
    if (arr[lo] > arr[pi]) swap(arr, lo, pi);
    if (arr[lo] > arr[hi]) swap(arr, lo, hi);
    if (arr[pi] > arr[hi]) swap(arr, pi, hi);

    const pivotValue = arr[pi];

    let i = lo - 1;
    let j = hi + 1;

    while (true) {
        do {
            i++;
        } while (arr[i] < pivotValue);
        do {
            j--;
        } while (arr[j] > pivotValue);
        if (i >= j) {
            return j;
        }

        swap(arr, i, j);
    }
}

function weightedMedian(
    arr: number[],
    lo = 0,
    hi = arr.length - 1,
    totalWeight = arr.reduce((a, b) => (a + b)) / 2,
    target = totalWeight / 2
): number {
    console.log('Finding ');

    const sliceLength = hi - lo + 1;
    if (sliceLength === 0) {
        throw new Error('what');
    } else if (sliceLength === 1) {
        if (target * 2 > arr[lo]) {
            return lo + 1;
        } else {
            return lo;
        }
    } else if (sliceLength === 2) {
        if (arr[lo] > arr[hi]) swap(arr, lo, hi);
        if (target > arr[lo]) {
            return weightedMedian(arr, lo, lo, arr[lo], target);
        } else {
            return weightedMedian(arr, hi, hi, arr[hi], target - arr[lo]);
        }
    }

    const pi = Math.floor((lo + hi) / 2);
    if (arr[lo] > arr[pi]) swap(arr, lo, pi);
    if (arr[lo] > arr[hi]) swap(arr, lo, hi);
    if (arr[pi] > arr[hi]) swap(arr, pi, hi);

    const threshold = arr[pi];

    let i = lo - 1;
    let j = hi + 1;
    let rightWeightSum = 0;
    while (true) {
        do {
            i++;
        } while (arr[i] < threshold);
        do {
            j--;
            rightWeightSum += arr[j];
        } while (arr[j] > threshold);
        if (i >= j) {
            // The new partition will start at j+1
            rightWeightSum -= arr[j];
            const leftWeightSum = totalWeight - rightWeightSum;
            if (target > leftWeightSum) {
                return weightedMedian( // Check left partition
                    arr, lo, j,
                    leftWeightSum, target);
            } else {
                return weightedMedian( // Check right partition
                    arr, j + 1, hi,
                    rightWeightSum, target - leftWeightSum);
            }
        }

        swap(arr, i, j);
    }
}

function display(arr: number[], l: number, r: number, m = NaN) {
    const wa = Array.from(' ' +
        arr.map(s => s.toString().padStart(2, ' ')).join(' ') +
        ' ');
    wa[l * 3] = '[';
    wa[r * 3 + 3] = ']';
    if (!Number.isNaN(m)) {

    }

    console.log(wa.join(''));

}

const arr = Array.from({ length: 20 }, () => Math.floor(Math.random() * 100));
display(arr, 0, arr.length - 1);
