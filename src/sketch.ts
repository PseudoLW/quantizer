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

const arr = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 100));
console.log(arr);

const partition = weightedMedian(arr);
console.log(`Partitioned into medians at ${partition}.`);
let l2 = 0, r2 = 0;
for (let i = 0; i < arr.length; i++) {
    if (i < partition) l2 += arr[i]; else r2 += arr[i];
}
console.log(arr);

console.log(`Weight on the left: ${l2} vs right: ${r2}`);
