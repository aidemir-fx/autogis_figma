import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";

export const useQueryParams = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Объект со всеми параметрами URL - обновляется при каждом изменении searchParams
    const params = useMemo(() => {
        const paramsObj: Record<string, unknown> = {};

        // Собираем все значения для каждого ключа
        const keysMap = new Map();
        searchParams.forEach((value, key) => {
            if (!keysMap.has(key)) {
                keysMap.set(key, []);
            }
            keysMap.get(key).push(value);
        });

        // Преобразуем в объект, одиночные значения оставляем как есть, множественные - как массивы
        keysMap.forEach((values, key) => {
            paramsObj[key] = values.length === 1 ? values[0] : values;
        });

        return paramsObj;
    }, [searchParams]);

    const setParam = (
        name: string,
        value: string | number | null | (string | number)[]
    ) => {
        const newParams = new URLSearchParams(searchParams);

        if (
            value === null ||
            value === "" ||
            (Array.isArray(value) && value.length === 0)
        ) {
            // Удаляем все значения параметра
            newParams.delete(name);
        } else if (Array.isArray(value)) {
            // Удаляем старые значения параметра
            newParams.delete(name);
            // Добавляем новые значения массива
            value.forEach((item) => {
                if (item !== null && item !== "") {
                    newParams.append(name, String(item));
                }
            });
        } else {
            // Одиночное значение
            newParams.set(name, String(value));
        }

        setSearchParams(newParams);
    };

    return { params, setParam };
};
