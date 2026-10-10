export interface ZoomTransform {
    k: number;
    x: number;
    y: number;
}

export interface LinearScale {
    (value: number): number;
    domain: {
        (): [number, number];
        (values: [number, number]): LinearScale;
    };
    range: {
        (): [number, number];
        (values: [number, number]): LinearScale;
    };
    copy(): LinearScale;
    rescaleX(transform: ZoomTransform): LinearScale;
    rescaleY(transform: ZoomTransform): LinearScale;
}

export function scaleLinear(): LinearScale {
    let domainMin = 0;
    let domainMax = 1;
    let rangeMin = 0;
    let rangeMax = 1;

    const scale = ((value: number): number => {
        const normalized = (value - domainMin) / (domainMax - domainMin);
        return normalized * (rangeMax - rangeMin) + rangeMin;
    }) as LinearScale;

    scale.domain = function (values?: [number, number]): [number, number] | LinearScale {
        if (values === undefined) {
            return [domainMin, domainMax];
        }

        domainMin = values[0];
        domainMax = values[1];
        return scale;
    } as LinearScale['domain'];

    scale.range = function (values?: [number, number]): [number, number] | LinearScale {
        if (values === undefined) {
            return [rangeMin, rangeMax];
        }

        rangeMin = values[0];
        rangeMax = values[1];
        return scale;
    } as LinearScale['range'];

    scale.copy = function (): LinearScale {
        return scaleLinear()
            .domain([domainMin, domainMax])
            .range([rangeMin, rangeMax]);
    };

    scale.rescaleX = function (transform: ZoomTransform): LinearScale {
        const k = transform.k;
        const x = transform.x;
        const newMin = (rangeMin - x) / k;
        const newMax = (rangeMax - x) / k;

        return scaleLinear()
            .domain([newMin, newMax])
            .range([rangeMin, rangeMax]);
    };

    scale.rescaleY = function (transform: ZoomTransform): LinearScale {
        const k = transform.k;
        const y = transform.y;
        const newMin = (rangeMin - y) / k;
        const newMax = (rangeMax - y) / k;

        return scaleLinear()
            .domain([newMin, newMax])
            .range([rangeMin, rangeMax]);
    };

    return scale;
}
