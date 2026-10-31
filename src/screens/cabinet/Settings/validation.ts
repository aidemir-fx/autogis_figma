import * as yup from "yup";
import dayjs from "dayjs";

const dayjsSchema = yup.mixed()
    .required("Обязательное поле")
    .test("is-valid-time", "Некорректное время", (value) => {
        if (!value) return false;
        return dayjs.isDayjs(value) ? value.isValid() : typeof value === "string";
    });

const baseSettingsSchema = {
    fullName: yup
        .string()
        .required("Обязательное поле")
        .min(2, "Минимум 2 символа")
        .max(120, "Максимум 120 символов"),
    phone: yup.string().optional(),
    workingPhone: yup
        .string()
        .required("Обязательное поле")
        .test("phone-length", "Минимум 11 цифр", (value) => {
            if (!value) return false;
            const digits = value.replace(/\D/g, "");
            return digits.length >= 11;
        }),
    address: yup.string().required("Укажите адрес на карте"),
    coordinates: yup.object({
        x: yup.number().required(),
        y: yup.number().required(),
    }),
    description: yup.string().max(1000, "Максимум 1000 символов").optional().default(""),
    workingDays: yup
        .array()
        .of(yup.boolean())
        .test("at-least-one", "Выберите хотя бы 1 рабочий день", (value) => {
            if (!value) return false;
            return value.some((v) => v === true);
        }),
    workFrom: dayjsSchema,
    workTo: dayjsSchema,
    onlineBookingEnabled: yup.boolean().default(false),
    payments: yup.array().of(yup.string()).default([]),
    coverImageUrl: yup.string().optional().default(""),
    coverImageAssetId: yup.string().optional().default(""),
};

export const autoWashSchema = yup.object({
    ...baseSettingsSchema,
    washType: yup.string().required("Выберите тип мойки"),
    boxCount: yup.number().integer().min(1, "Минимум 1 бокс").required("Обязательное поле").typeError("Введите число"),
    washerCount: yup.number().integer().min(0, "Не может быть отрицательным").required("Обязательное поле").typeError("Введите число"),
    hasWaitingArea: yup.boolean().default(false),
    liveQueueEnabled: yup.boolean().default(false),
    additionalServices: yup.array().of(yup.string()).default([]),
});

export const autoServiceSchema = yup.object({
    ...baseSettingsSchema,
    liveQueueEnabled: yup.boolean().default(false),
    professions: yup.array().of(yup.string()).default([]),
    hasParking: yup.boolean().default(false),
    liftCount: yup.number().integer().min(0, "Не может быть отрицательным").required("Обязательное поле").typeError("Введите число"),
    warranty: yup.boolean().default(false),
    hotline: yup.string().optional().default(""),
    brandSupport: yup.array().of(yup.string()).default([]),
});

export const autoShopSchema = yup.object({
    ...baseSettingsSchema,
    shopType: yup.string().required("Выберите тип магазина"),
    hasPickup: yup.boolean().default(false),
    deliveryAvailable: yup.boolean().default(false),
    deliveryRadiusKm: yup.number().integer().min(0, "Не может быть отрицательным").typeError("Введите число").when("deliveryAvailable", {
        is: true,
        then: (schema) => schema.required("Укажите радиус доставки"),
        otherwise: (schema) => schema.optional().default(0),
    }),
    brands: yup.array().of(yup.string()).default([]),
    productCategories: yup.array().of(yup.string()).default([]),
    additionalServices: yup.array().of(yup.string()).default([]),
});
