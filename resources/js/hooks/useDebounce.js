import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a fast-changing value (e.g. search query input).
 * 
 * @param {any} value The value to debounce
 * @param {number} delay Delay in milliseconds (default 300ms)
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
