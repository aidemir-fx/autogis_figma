import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ActivityType, Provider } from "@modules/providers";
import { fetchProviderByTypeAndId } from "@modules/providers/api";
import { useCoords } from "@common/hooks";
import { IMAGES } from "../../assets/images";
import { BookingModal } from "../main-page/components/BookingModal";
import { toast } from "react-toastify";
import { Map, Placemark, YMaps } from "@pbe/react-yandex-maps";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";

export interface StorySlide {
    id: string;
    image: string;
    tag: string;
    title: string;
    description: string;
    benefit: string;
}

export interface HighlightGroup {
    id: string;
    tag: string;
    coverImage: string;
    slides: StorySlide[];
}

interface WorkPhoto {
    id: string;
    url: string;
    title: string;
}

interface ReviewItem {
    id: string;
    author: string;
    date: string;
    avatar: string;
    rating: number;
    text: string;
}

// Instagram-style Stories Highlights by activity type
const HIGHLIGHTS_BY_TYPE: Record<ActivityType, HighlightGroup[]> = {
    [ActivityType.auto_shop]: [
        {
            id: "hl-sh-1",
            tag: "Скидки",
            coverImage: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "sh-s-1",
                    tag: "Скидка 15%",
                    title: "Скидка 15% на масла и фильтры ТО",
                    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
                    description: "Оригинальные моторные масла Motul, Shell, Mobil, Idemitsu и фильтры Mahle/Mann по специальной клубной цене.",
                    benefit: "Экономия до 2 000 ₽ на комплект ТО",
                },
                {
                    id: "sh-s-2",
                    tag: "Скидка 20%",
                    title: "Комплект колодок и дисков со скидкой 20%",
                    image: "https://images.unsplash.com/photo-1600793575654-910699b5e4d4?auto=format&fit=crop&w=800&q=80",
                    description: "При покупке тормозных дисков и колодок Brembo, TRW или Ferodo дарим скидку 20% на весь чек.",
                    benefit: "Выгода до 3 500 ₽",
                },
            ],
        },
        {
            id: "hl-sh-2",
            tag: "Акции",
            coverImage: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "sh-a-1",
                    tag: "Бесплатно",
                    title: "Бесплатный точный подбор по VIN-коду",
                    image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
                    description: "Наш специалист за 5 минут подберет детали по официальным дилерским базам EPC с гарантией совместимости 100%.",
                    benefit: "Гарантия точного подбора деталей",
                },
                {
                    id: "sh-a-2",
                    tag: "Экспресс",
                    title: "Экспресс-доставка по городу за 1 час",
                    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
                    description: "Срочно нужны запчасти для ремонта? Доставим курьером прямо в сервис или ваш гараж за 60 минут.",
                    benefit: "Бесплатно при заказе от 3 000 ₽",
                },
            ],
        },
        {
            id: "hl-sh-3",
            tag: "Новинки",
            coverImage: "https://images.unsplash.com/photo-1558441719-8b489c63f7d1?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "sh-n-1",
                    tag: "Новое",
                    title: "Усиленные аккумуляторы AGM 2026",
                    image: "https://images.unsplash.com/photo-1558441719-8b489c63f7d1?auto=format&fit=crop&w=800&q=80",
                    description: "Новая партия надежных батарей Varta, Exide и Mutlu с увеличенным пусковым током для любых морозов.",
                    benefit: "Гарантия производителя 3 года",
                },
                {
                    id: "sh-n-2",
                    tag: "Китай и Корея",
                    title: "Запчасти на Haval, Geely, Chery и Changan",
                    image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
                    description: "Оригинальные расходники, кузовные элементы, рычаги и оптика для современных китайских авто в наличии.",
                    benefit: "Более 8 000 позиций на складе",
                },
            ],
        },
        {
            id: "hl-sh-4",
            tag: "Анонсы",
            coverImage: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "sh-an-1",
                    tag: "Сезон 2026",
                    title: "Старт сезона шин и дисков",
                    image: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80",
                    description: "Большое поступление летней и всесезонной резины Pirelli, Michelin, Ikon и кованых дисков всех типоразмеров.",
                    benefit: "Сезонное хранение со скидкой 50%",
                },
            ],
        },
        {
            id: "hl-sh-5",
            tag: "Подарок",
            coverImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "sh-p-1",
                    tag: "Подарок",
                    title: "Премиальная омывающая жидкость в подарок",
                    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
                    description: "При любом заказе автозапчастей или расходников на сумму от 5 000 ₽ дарим 4 л брендовой стеклоомывающей жидкости.",
                    benefit: "Подарок к каждому крупному заказу",
                },
            ],
        },
    ],
    [ActivityType.auto_service]: [
        {
            id: "hl-as-1",
            tag: "Скидки",
            coverImage: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "as-s-1",
                    tag: "Скидка 15%",
                    title: "Скидка 15% на первое комплексное ТО",
                    image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",
                    description: "Для всех новых клиентов сервиса — полный комплекс планового ТО со скидкой 15% на работы.",
                    benefit: "Выгода до 2 500 ₽",
                },
                {
                    id: "as-s-2",
                    tag: "Скидка 10%",
                    title: "Утренний сервис со скидкой 10%",
                    image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
                    description: "Запишитесь на обслуживание с 08:00 до 11:00 в будние дни и получите дополнительную скидку 10%.",
                    benefit: "Быстро без очередей",
                },
            ],
        },
        {
            id: "hl-as-2",
            tag: "Акции",
            coverImage: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "as-a-1",
                    tag: "Бесплатно",
                    title: "Диагностика подвески в подарок",
                    image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
                    description: "При выполнении любых ремонтных или слесарных работ диагностика ходовой на подъемнике бесплатно.",
                    benefit: "Экономия 1 500 ₽",
                },
            ],
        },
        {
            id: "hl-as-3",
            tag: "Новинки",
            coverImage: "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "as-n-1",
                    tag: "Оборудование",
                    title: "Новый 3D стенд сход-развала Hunter",
                    image: "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80",
                    description: "Высокоточная регулировка углов установки колес с лазерными мишенями высокой четкости.",
                    benefit: "Идеальная курсовая устойчивость",
                },
            ],
        },
        {
            id: "hl-as-4",
            tag: "Анонсы",
            coverImage: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "as-an-1",
                    tag: "Гарантия",
                    title: "Расширенная гарантия 12 месяцев",
                    image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
                    description: "На все агрегатные ремонты (ДВС, АКПП, рулевые рейки) выдаем официальный заказ-наряд с гарантией 1 год.",
                    benefit: "Надежность и спокойствие",
                },
            ],
        },
        {
            id: "hl-as-5",
            tag: "Подарок",
            coverImage: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "as-p-1",
                    tag: "Подарок",
                    title: "Замена моторного масла в подарок",
                    image: "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80",
                    description: "При покупке моторного масла и фильтра в сервисе работа по замене и снятию защиты выполняется бесплатно.",
                    benefit: "Экономия 1 200 ₽",
                },
            ],
        },
    ],
    [ActivityType.auto_wash]: [
        {
            id: "hl-aw-1",
            tag: "Скидки",
            coverImage: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "aw-s-1",
                    tag: "Скидка 20%",
                    title: "Комплекс «Люкс» со скидкой 20%",
                    image: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80",
                    description: "Трехфазная безопасная нано-мойка кузова, уборка салона пылесосом, очистка стекол и чернение резины.",
                    benefit: "Экономия 800 ₽",
                },
            ],
        },
        {
            id: "hl-aw-2",
            tag: "Акции",
            coverImage: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "aw-a-1",
                    tag: "В подарок",
                    title: "Антидождь Aquapel в подарок",
                    image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80",
                    description: "При заказе глубокой химчистки салона наносим водоотталкивающее гидрофобное покрытие на лобовое стекло.",
                    benefit: "Идеальная видимость в дождь",
                },
            ],
        },
        {
            id: "hl-aw-3",
            tag: "Новинки",
            coverImage: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "aw-n-1",
                    tag: "Робот-мойка",
                    title: "Экспресс робот-мойка за 5 минут",
                    image: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80",
                    description: "Полностью бесконтактная автоматическая мойка днища и кузова мощными контурными струями высокого давления.",
                    benefit: "Быстро и без очередей",
                },
            ],
        },
        {
            id: "hl-aw-4",
            tag: "Анонсы",
            coverImage: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "aw-an-1",
                    tag: "Детейлинг",
                    title: "Открытие зоны полиуретановой оклейки",
                    image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
                    description: "Защитите зоны риска вашего авто надежной американской бронепленкой SunTek PPF от сколов и царапин.",
                    benefit: "Защита кузова на 5+ лет",
                },
            ],
        },
        {
            id: "hl-aw-5",
            tag: "Подарок",
            coverImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "aw-p-1",
                    tag: "Чистый воздух",
                    title: "Озонирование салона в подарок",
                    image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80",
                    description: "Антибактериальная обработка медицинским озоном уничтожает 99.9% бактерий, аллергенов и посторонних запахов.",
                    benefit: "Свежесть горного воздуха",
                },
            ],
        },
    ],
    [ActivityType.master]: [
        {
            id: "hl-m-1",
            tag: "Скидки",
            coverImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "m-s-1",
                    tag: "Скидка 15%",
                    title: "Скидка 15% на первое посещение",
                    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
                    description: "Для всех новых клиентов предоставляется скидка 15% на диагностику, электрику и восстановительные работы.",
                    benefit: "Экономия до 3 000 ₽",
                },
            ],
        },
        {
            id: "hl-m-2",
            tag: "Акции",
            coverImage: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "m-a-1",
                    tag: "Диагностика",
                    title: "Компьютерная диагностика в подарок",
                    image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
                    description: "Считывание ошибок всех блоков управления дилерским сканером при выполнении любых ремонтных работ.",
                    benefit: "Бесплатно вместо 1 500 ₽",
                },
            ],
        },
        {
            id: "hl-m-3",
            tag: "Новинки",
            coverImage: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "m-n-1",
                    tag: "PDR мастерство",
                    title: "Беспокрасочное удаление вмятин",
                    image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
                    description: "Устранение вмятин от града и парковочных ударов с сохранением 100% заводского лакокрасочного покрытия.",
                    benefit: "Без шпаклевки и перекраски",
                },
            ],
        },
        {
            id: "hl-m-4",
            tag: "Анонсы",
            coverImage: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "m-an-1",
                    tag: "Запись открыта",
                    title: "Открыта запись на диагностику",
                    image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80",
                    description: "Свободные окна на обслуживание автоэлектрики и трансмиссий на текущую неделю. Бронируйте удобное время.",
                    benefit: "Индивидуальный подход",
                },
            ],
        },
        {
            id: "hl-m-5",
            tag: "Подарок",
            coverImage: "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=400&q=80",
            slides: [
                {
                    id: "m-p-1",
                    tag: "Подарок",
                    title: "Защитное покрытие оптики в подарок",
                    image: "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80",
                    description: "При полировке кузова наносим профессиональный кварцевый состав на фары бесплатно.",
                    benefit: "Прозрачность и блеск на 12 месяцев",
                },
            ],
        },
    ],
};

const PHOTOS_BY_TYPE: Record<ActivityType, WorkPhoto[]> = {
    [ActivityType.master]: [
        {
            id: "w-m-1",
            url: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80",
            title: "Абразивная полировка кузова BMW",
        },
        {
            id: "w-m-2",
            url: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80",
            title: "Очистка и подготовка к покраске",
        },
        {
            id: "w-m-3",
            url: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80",
            title: "Финишная полировка эксцентриковой машинкой",
        },
    ],
    [ActivityType.auto_service]: [
        {
            id: "w-as-1",
            url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",
            title: "Цех подъемников и регулярного ТО",
        },
        {
            id: "w-as-2",
            url: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
            title: "Компьютерная диагностика и 3D сход-развал",
        },
        {
            id: "w-as-3",
            url: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
            title: "Агрегатный ремонт и диагностика ходовой",
        },
    ],
    [ActivityType.auto_shop]: [
        {
            id: "w-sh-1",
            url: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
            title: "Торговый зал и витрины с маслами",
        },
        {
            id: "w-sh-2",
            url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
            title: "Склад автозапчастей и расходных материалов",
        },
        {
            id: "w-sh-3",
            url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
            title: "Зона подбора деталей по VIN-коду",
        },
    ],
    [ActivityType.auto_wash]: [
        {
            id: "w-aw-1",
            url: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80",
            title: "Трехфазная нано-мойка в закрытом боксе",
        },
        {
            id: "w-aw-2",
            url: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80",
            title: "Сушка турбовоздухом и протирка кузова",
        },
        {
            id: "w-aw-3",
            url: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80",
            title: "Детейлинг-зона и нанесение керамики",
        },
    ],
};

const REVIEWS_BY_TYPE: Record<ActivityType, ReviewItem[]> = {
    [ActivityType.master]: [
        {
            id: "rev-m-1",
            author: "Алексей",
            date: "27.10.2026",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Отличная работа, покрасили бампер за два дня. Цвет подобрали идеально.",
        },
        {
            id: "rev-m-2",
            author: "Мария",
            date: "21.10.2026",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Быстро и аккуратно, всё объяснили. Рекомендую.",
        },
        {
            id: "rev-m-3",
            author: "Ибрагим",
            date: "15.10.2026",
            avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Хорошие мастера, цена соответствует качеству.",
        },
    ],
    [ActivityType.auto_service]: [
        {
            id: "rev-as-1",
            author: "Руслан Мусаев",
            date: "28.10.2026",
            avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Делал полное ТО и замену рычагов на BMW X5. Приняли вовремя, 6 подъемников, все чисто. Дали официальную гарантию на работы. Рекомендую!",
        },
        {
            id: "rev-as-2",
            author: "Евгений Смирнов",
            date: "24.10.2026",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Быстро нашли причину стука в подвеске на стенде. Запчасти были прямо на складе сервиса, через 2 часа уехал на готовой машине.",
        },
        {
            id: "rev-as-3",
            author: "Светлана",
            date: "19.10.2026",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Комфортная клиентская зона, вкусный кофе, пока ждала диагностику. Вежливые мастера.",
        },
    ],
    [ActivityType.auto_shop]: [
        {
            id: "rev-sh-1",
            author: "Магомед",
            date: "26.10.2026",
            avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Позвонил напрямую, продиктовал VIN — через 3 минуты консультант подобрал тормозные диски и колодки в наличии. Приехал и сразу забрал. Цены отличные!",
        },
        {
            id: "rev-sh-2",
            author: "Артем Васильев",
            date: "22.10.2026",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Всегда беру здесь моторное масло и фильтры. 100% оригинал, проверяли по QR-кодам. Есть быстрая доставка.",
        },
        {
            id: "rev-sh-3",
            author: "Денис",
            date: "17.10.2026",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Помогли вернуть деталь, которую заказал ошибочно без вопросов, подобрали нужную. Спасибо за честный сервис!",
        },
    ],
    [ActivityType.auto_wash]: [
        {
            id: "rev-aw-1",
            author: "Заурбек",
            date: "29.10.2026",
            avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "4 просторных бокса, никакой толкотни. Мыли в три фазы немецкой химией Koch Chemie, ни единого развода на черном кузове. Сушка воздухом супер!",
        },
        {
            id: "rev-aw-2",
            author: "Ольга Карпова",
            date: "25.10.2026",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Записалась через приложение на удобное время, заехала ровно минута в минуту. Салон вычистили до идеального блеска.",
        },
        {
            id: "rev-aw-3",
            author: "Константин",
            date: "18.10.2026",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
            rating: 5,
            text: "Нанесли полимер и сделали чернение шин. Машина выглядит как из автосалона. Молодцы ребята!",
        },
    ],
};

export const MasterDetailsScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id");
    const rawType = searchParams.get("type");
    const activityType: ActivityType = Object.values(ActivityType).includes(rawType as ActivityType)
        ? (rawType as ActivityType)
        : ActivityType.master;

    const { userCoords } = useCoords();

    // Type indicators
    const isService = activityType === ActivityType.auto_service;
    const isShop = activityType === ActivityType.auto_shop;
    const isWash = activityType === ActivityType.auto_wash;
    const isMaster = activityType === ActivityType.master;

    // Interactive states
    const [isFavorite, setIsFavorite] = useState(true);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // Instagram-style Stories state
    const [activeHighlightGroup, setActiveHighlightGroup] = useState<HighlightGroup | null>(null);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [isStoryPaused, setIsStoryPaused] = useState(false);
    const [storyProgress, setStoryProgress] = useState(0);

    const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
    const [isServicesExpanded, setIsServicesExpanded] = useState(false);
    const [reviewsList, setReviewsList] = useState<ReviewItem[]>(REVIEWS_BY_TYPE[activityType] || REVIEWS_BY_TYPE[ActivityType.master]);
    const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
    const [newReviewAuthor, setNewReviewAuthor] = useState("");
    const [newReviewText, setNewReviewText] = useState("");
    const [newReviewRating, setNewReviewRating] = useState(5);

    // Highlights for the current category
    const highlights = useMemo(() => {
        return HIGHLIGHTS_BY_TYPE[activityType] || HIGHLIGHTS_BY_TYPE[ActivityType.master];
    }, [activityType]);

    // Stories timer effect (advances progress bar & slides)
    useEffect(() => {
        if (!activeHighlightGroup || isStoryPaused) return;

        const interval = setInterval(() => {
            setStoryProgress((prev) => {
                if (prev >= 100) {
                    if (activeSlideIndex < activeHighlightGroup.slides.length - 1) {
                        setActiveSlideIndex((idx) => idx + 1);
                        return 0;
                    } else {
                        const currentGroupIdx = highlights.findIndex((h) => h.id === activeHighlightGroup.id);
                        if (currentGroupIdx !== -1 && currentGroupIdx < highlights.length - 1) {
                            setActiveHighlightGroup(highlights[currentGroupIdx + 1]);
                            setActiveSlideIndex(0);
                            return 0;
                        } else {
                            setActiveHighlightGroup(null);
                            setActiveSlideIndex(0);
                            return 0;
                        }
                    }
                }
                return prev + 2;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [activeHighlightGroup, activeSlideIndex, isStoryPaused, highlights]);

    // Keyboard support for stories (Escape, Arrows)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeHighlightGroup) return;
            if (e.key === "Escape") {
                setActiveHighlightGroup(null);
            } else if (e.key === "ArrowLeft") {
                handlePrevSlide();
            } else if (e.key === "ArrowRight") {
                handleNextSlide();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeHighlightGroup, activeSlideIndex, highlights]);

    const handlePrevSlide = () => {
        setStoryProgress(0);
        if (activeSlideIndex > 0) {
            setActiveSlideIndex((idx) => idx - 1);
        } else {
            const currentIdx = highlights.findIndex((h) => h.id === activeHighlightGroup?.id);
            if (currentIdx > 0) {
                const prevGroup = highlights[currentIdx - 1];
                setActiveHighlightGroup(prevGroup);
                setActiveSlideIndex(prevGroup.slides.length - 1);
            }
        }
    };

    const handleNextSlide = () => {
        setStoryProgress(0);
        if (!activeHighlightGroup) return;
        if (activeSlideIndex < activeHighlightGroup.slides.length - 1) {
            setActiveSlideIndex((idx) => idx + 1);
        } else {
            const currentIdx = highlights.findIndex((h) => h.id === activeHighlightGroup.id);
            if (currentIdx !== -1 && currentIdx < highlights.length - 1) {
                setActiveHighlightGroup(highlights[currentIdx + 1]);
                setActiveSlideIndex(0);
            } else {
                setActiveHighlightGroup(null);
                setActiveSlideIndex(0);
            }
        }
    };

    // Fetch provider from server
    const { data: fetchedProvider } = useQuery<any>({
        queryKey: ["providerDetails", activityType, id, userCoords],
        queryFn: () => fetchProviderByTypeAndId(activityType, id!, userCoords?.[0], userCoords?.[1]),
        enabled: Boolean(id),
        retry: false,
    });

    // Formatted data with realistic defaults matching activity type
    const providerData = useMemo(() => {
        let defaultName = "Первый мастер";
        let defaultSub = "Автомаляр, автоинженер, кузовщик, сварщик";
        let defaultCover = IMAGES.masterAvatar;
        let defaultPhone = "+7 (928) 555-12-34";
        let defaultAddress = "Респ. Дагестан, г. Кизилюрт, ул. Буйнакского 8А";

        if (isService) {
            defaultName = "АвтоТехЦентр «Премиум Моторс»";
            defaultSub = "Мультибрендовый автотехцентр • Слесарный цех, ТО, компьютерная диагностика";
            defaultCover = IMAGES.autoServiceCover;
            defaultPhone = "+7 (495) 777-88-99";
            defaultAddress = "г. Москва, Таганская ул., 36";
        } else if (isShop) {
            defaultName = "АвтоЗапчасти «Деталь-Маркет»";
            defaultSub = "Магазин автозапчастей • 50 000+ наименований в наличии и под заказ";
            defaultCover = IMAGES.autoShopCover;
            defaultPhone = "+7 (495) 555-44-33";
            defaultAddress = "г. Москва, ул. Большая Полянка, 28";
        } else if (isWash) {
            defaultName = "AquaSpa Detailing & Автомойка";
            defaultSub = "Автомоечный комплекс & детейлинг-центр • Трехфазная нано-мойка, керамика";
            defaultCover = IMAGES.autoWashCover;
            defaultPhone = "+7 (495) 333-22-11";
            defaultAddress = "г. Москва, Олимпийский просп., 16";
        }

        const defaultDesc = isShop
            ? "Широкий ассортимент оригинальных автозапчастей и качественных аналогов в наличии и под заказ. Подбор по электронным дилерским каталогам и VIN за 5 минут, экспресс-доставка по городу, гарантия возврата и обмена."
            : isService
            ? "Мультибрендовый современный автосервис. Полный комплекс услуг: от регулярного ТО до сложного кузовного и агрегатного ремонта. Сертифицированные мастера и гарантия на все работы."
            : isWash
            ? "Премиальная автомойка и детейлинг-центр. Безопасная трехфазная нано-мойка, глубокая полировка, защита кузова керамикой 9H, химчистка салона и озонирование."
            : "Опытный автомастер с многолетним стажем. Качественный ремонт, честные цены и внимательное отношение к каждому автомобилю.";

        const name = fetchedProvider?.businessName || fetchedProvider?.fullName || fetchedProvider?.name || defaultName;
        const professions = fetchedProvider?.professions?.length
            ? fetchedProvider.professions.join(", ")
            : defaultSub;
        const phone = fetchedProvider?.workingPhone || fetchedProvider?.phone || defaultPhone;
        const address = fetchedProvider?.address || defaultAddress;
        const rating = fetchedProvider?.rating ?? (isService ? 4.9 : isShop ? 4.8 : isWash ? 4.9 : 5.0);
        const reviewsCount = fetchedProvider?.reviewsCount ?? (isService ? 142 : isShop ? 76 : isWash ? 110 : 41);
        const workFrom = fetchedProvider?.workFrom || (isWash ? "08:00" : isService ? "08:00" : "09:00");
        const workTo = fetchedProvider?.workTo || (isWash ? "23:00" : isService ? "22:00" : "21:00");
        const avatar = fetchedProvider?.avatar || defaultCover;
        const description = fetchedProvider?.description || defaultDesc;
        let lat = 55.7558;
        let lng = 37.6173;
        if (fetchedProvider?.coordinates) {
            const c = fetchedProvider.coordinates;
            if (typeof c.x === "number" && typeof c.y === "number") {
                lat = c.x;
                lng = c.y;
            } else if (Array.isArray(c.coordinates) && c.coordinates.length >= 2) {
                lng = c.coordinates[0];
                lat = c.coordinates[1];
            } else if (Array.isArray(c) && c.length >= 2) {
                lat = c[0];
                lng = c[1];
            }
        } else if (isMaster) {
            lat = 43.2007;
            lng = 46.8528;
        }
        const coordinates: [number, number] = [lat, lng];

        const payments = fetchedProvider?.payments || ["cash", "card", "sbp"];

        return {
            name,
            professions,
            phone,
            address,
            rating,
            reviewsCount,
            workFrom,
            workTo,
            avatar,
            description,
            coordinates,
            payments,
            activityType: fetchedProvider?.activityType || activityType,
        };
    }, [fetchedProvider, isService, isShop, isWash, activityType]);

    // Synthetic provider for BookingModal
    const bookingProvider = useMemo(() => {
        return {
            id: id || "provider-default-1",
            userId: id || "provider-default-1",
            name: providerData.name,
            fullName: providerData.name,
            businessName: providerData.name,
            activityType: activityType,
            phone: providerData.phone,
            address: providerData.address,
            coordinates: { x: 43.2007, y: 46.8528 },
            status: "available",
            currentStatus: "available",
            description: providerData.professions,
            rating: providerData.rating,
            reviewsCount: providerData.reviewsCount,
            services: isService
                ? [
                      "Плановое техническое обслуживание",
                      "Компьютерная диагностика",
                      "Ремонт ходовой части",
                      "Замена моторного масла и фильтров",
                      "Замена тормозных колодок и дисков",
                      "3D Сход-развал",
                  ]
                : isWash
                ? [
                      "Трехфазная нано-мойка",
                      "Комплексная уборка салона",
                      "Химчистка передних сидений",
                      "Нанесение гидрофобного полимера",
                      "Озонирование и устранение запахов",
                  ]
                : [
                      "Легковой автосервис",
                      "Ремонт ходовой части автомобиля",
                      "Кузовной ремонт",
                      "Локальная покраска деталей",
                  ],
        } as unknown as Provider;
    }, [id, providerData, activityType, isService, isWash]);

    // Hero gallery photos
    const heroPhotos = useMemo(() => {
        const list = PHOTOS_BY_TYPE[activityType] || PHOTOS_BY_TYPE[ActivityType.master];
        return list.map((p) => p.url);
    }, [activityType]);

    // Services list
    const allServices = useMemo(() => {
        if (isShop) {
            return [
                "Моторные масла и техжидкости",
                "Масляные, воздушные и салонные фильтры",
                "Тормозные колодки и диски",
                "Детали подвески и рулевого управления",
                "Свечи зажигания и накаливания",
                "Аккумуляторы с гарантией",
                "Автохимия и автокосметика",
                "Лампы, предохранители и автоэлектрика",
            ];
        }
        if (isService) {
            return [
                "Плановое техническое обслуживание (ТО)",
                "Компьютерная диагностика всех систем",
                "Ремонт ходовой части и подвески",
                "3D Сход-развал на лазерном стенде",
                "Ремонт двигателей и трансмиссий",
                "Замена масел в ДВС, АКПП, редукторах",
                "Заправка и антибактериальная чистка кондиционера",
                "Кузовной ремонт и восстановление геометрии",
            ];
        }
        if (isWash) {
            return [
                "Трехфазная нано-мойка кузова",
                "Комплексная влажная уборка салона",
                "Глубокая химчистка салона с сушкой",
                "Полировка фар и нанесение бронепленки",
                "Защитное покрытие «Антидождь» на стекла",
                "Нанесение твердого воска и кварцевых составов",
                "Озонирование и дезинфекция кондиционера",
                "Бережная мойка двигателя паром",
            ];
        }
        return [
            "Легковой автосервис",
            "Ремонт ходовой части автомобиля",
            "Кузовной ремонт",
            "Локальная и полная покраска",
            "Полировка кузова и оптики",
            "Стапельные и сварочные работы",
            "Компьютерная диагностика",
            "Замена масел и фильтров",
        ];
    }, [isShop, isService, isWash]);

    const visibleServices = isServicesExpanded ? allServices : allServices.slice(0, 3);

    // Schedule week
    const scheduleWeek = useMemo(() => {
        const from = providerData.workFrom;
        const to = providerData.workTo;
        return [
            { day: "Понедельник", hours: `${from} - ${to}`, active: true },
            { day: "Вторник", hours: `${from} - ${to}`, active: true },
            { day: "Среда", hours: `${from} - ${to}`, active: true },
            { day: "Четверг", hours: `${from} - ${to}`, active: true },
            { day: "Пятница", hours: `${from} - ${to}`, active: true },
            { day: "Суббота", hours: `${from} - ${to}`, active: true },
            { day: "Воскресенье", hours: isService ? "10:00 - 20:00" : `${from} - ${to}`, active: true },
        ];
    }, [providerData.workFrom, providerData.workTo, isService]);

    const handleToggleFavorite = () => {
        setIsFavorite((prev) => {
            const next = !prev;
            if (next) {
                toast.success("Организация добавлена в избранное");
            } else {
                toast.info("Организация удалена из избранного");
            }
            return next;
        });
    };

    const handleCall = () => {
        window.location.href = `tel:${providerData.phone.replace(/[^\d+]/g, "")}`;
    };

    const handleOpenRoute = () => {
        const [lng, lat] = providerData.coordinates;
        if (lat && lng) {
            window.open(`https://yandex.ru/maps/?rtext=~${lat},${lng}`, "_blank");
        } else {
            const query = encodeURIComponent(providerData.address);
            window.open(`https://yandex.ru/maps/?text=${query}`, "_blank");
        }
    };

    const handleAddReviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReviewAuthor.trim() || !newReviewText.trim()) {
            toast.error("Пожалуйста, заполните имя и текст отзыва");
            return;
        }

        const newReview: ReviewItem = {
            id: `rev-${Date.now()}`,
            author: newReviewAuthor.trim(),
            date: new Date().toLocaleDateString("ru-RU"),
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
            rating: newReviewRating,
            text: newReviewText.trim(),
        };

        setReviewsList([newReview, ...reviewsList]);
        setNewReviewAuthor("");
        setNewReviewText("");
        setIsAddReviewOpen(false);
        toast.success("Ваш отзыв успешно опубликован!");
    };

    // Header Title
    const headerTitle = useMemo(() => {
        if (isService) return "Автосервис";
        if (isShop) return "Автомагазин";
        if (isWash) return "Автомойка";
        return "Профиль мастера";
    }, [isService, isShop, isWash]);

    return (
        <div
            style={{
                backgroundColor: "#FFFFFF",
                minHeight: "100vh",
                maxWidth: 480,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                paddingBottom: 80,
                color: "#0F172A",
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
        >
            {/* 1. TOP HEADER */}
            <header
                style={{
                    height: 56,
                    padding: "0 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: "#FFFFFF",
                    position: "sticky",
                    top: 0,
                    zIndex: 40,
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                }}
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    style={{
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        borderRadius: "50%",
                        color: "#1E293B",
                        padding: 0,
                    }}
                    title="Назад"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>

                <h1
                    style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#1E293B",
                        letterSpacing: "-0.01em",
                    }}
                >
                    {headerTitle}
                </h1>
            </header>

            {/* 2. HERO IMAGE GALLERY */}
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: 240,
                    backgroundColor: "#0F172A",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        width: "100%",
                        height: "100%",
                        overflowX: "auto",
                        scrollSnapType: "x mandatory",
                        scrollbarWidth: "none",
                    }}
                    onScroll={(e) => {
                        const el = e.currentTarget;
                        const idx = Math.round(el.scrollLeft / el.clientWidth);
                        setActivePhotoIndex(idx);
                    }}
                >
                    {heroPhotos.map((url, i) => (
                        <div
                            key={i}
                            onClick={() => setIsGalleryOpen(true)}
                            style={{
                                width: "100%",
                                minWidth: "100%",
                                height: "100%",
                                scrollSnapAlign: "start",
                                cursor: "pointer",
                                position: "relative",
                            }}
                        >
                            <img
                                src={url}
                                alt={`Фото ${i + 1}`}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Overlaid Avatar/Logo badge in bottom-left with story ring */}
                <div
                    onClick={() => {
                        if (highlights.length > 0) {
                            setActiveHighlightGroup(highlights[0]);
                            setActiveSlideIndex(0);
                            setStoryProgress(0);
                            setIsStoryPaused(false);
                        }
                    }}
                    style={{
                        position: "absolute",
                        bottom: 12,
                        left: 16,
                        width: 60,
                        height: 60,
                        borderRadius: 20,
                        padding: 2.5,
                        background: highlights.length > 0 ? "linear-gradient(45deg, #F59E0B 0%, #EF4444 35%, #EC4899 70%, #8B5CF6 100%)" : "#2563EB",
                        cursor: highlights.length > 0 ? "pointer" : "default",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: 16,
                            border: "2px solid #FFFFFF",
                            overflow: "hidden",
                            backgroundColor: "#FFFFFF",
                        }}
                    >
                        <img
                            src={providerData.avatar}
                            alt={providerData.name}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                    </div>
                </div>

                {/* Overlaid Photo Counter badge in bottom-right */}
                <button
                    type="button"
                    onClick={() => setIsGalleryOpen(true)}
                    style={{
                        position: "absolute",
                        bottom: 12,
                        right: 16,
                        backgroundColor: "rgba(15, 23, 42, 0.75)",
                        backdropFilter: "blur(4px)",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 20,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        zIndex: 10,
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>{heroPhotos.length}</span>
                </button>
            </div>

            {/* MAIN CONTENT BODY */}
            <main style={{ padding: "16px 16px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
                {/* 3. PROVIDER HEADER INFO & ACTIONS */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div>
                            <h2
                                style={{
                                    margin: "0 0 4px",
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: "#0F172A",
                                    letterSpacing: "-0.01em",
                                }}
                            >
                                {providerData.name}
                            </h2>
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "#64748B",
                                    lineHeight: "1.4",
                                    marginBottom: 6,
                                }}
                            >
                                {providerData.professions}
                            </div>
                        </div>

                        {/* Favorite button */}
                        <button
                            type="button"
                            onClick={handleToggleFavorite}
                            title={isFavorite ? "В избранном" : "Добавить в избранное"}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: isFavorite ? "#EFF6FF" : "#F1F5F9",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                flexShrink: 0,
                            }}
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill={isFavorite ? "#2563EB" : "none"}
                                stroke={isFavorite ? "#2563EB" : "#64748B"}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </button>
                    </div>

                    {/* Rating row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <div style={{ display: "flex", color: "#EAB308", fontSize: 14 }}>
                            {"★".repeat(5)}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>
                            {providerData.rating.toFixed(1)}
                        </span>
                        <span style={{ fontSize: 13, color: "#94A3B8" }}>
                            ({providerData.reviewsCount})
                        </span>
                    </div>

                    {/* Status badge & Payment icons row */}
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#16A34A", flexShrink: 0 }} />
                            <span>Открыто до {providerData.workTo}</span>
                            {isService && <span style={{ color: "#64748B", fontWeight: 400 }}>• 6 подъемников в работе</span>}
                            {isWash && <span style={{ color: "#64748B", fontWeight: 400 }}>• Свободно 2 поста</span>}
                            {isShop && <span style={{ color: "#64748B", fontWeight: 400 }}>• 50 000+ товаров</span>}
                        </div>

                        {providerData.payments && providerData.payments.length > 0 && (
                            <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexShrink: 0 }}>
                                {providerData.payments.map((p: string) => {
                                    const shortLabel = p === "cash" ? "наличные" : p === "card" ? "карта" : p === "sbp" || p === "qr" ? "СБП" : p;
                                    const fullLabel = p === "cash" ? "Наличные" : p === "card" ? "Банковская карта" : p === "sbp" || p === "qr" ? "СБП / QR" : p;
                                    const icon = p === "cash"
                                        ? <PaymentsRoundedIcon sx={{ fontSize: 16, color: "#475569" }} />
                                        : p === "card"
                                            ? <CreditCardRoundedIcon sx={{ fontSize: 16, color: "#475569" }} />
                                            : <QrCode2RoundedIcon sx={{ fontSize: 16, color: "#475569" }} />;
                                    return (
                                        <div
                                            key={p}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 2,
                                            }}
                                        >
                                            <div
                                                title={fullLabel}
                                                aria-label={fullLabel}
                                                style={{
                                                    width: 32,
                                                    height: 28,
                                                    borderRadius: 6,
                                                    border: "1px solid #E2E8F0",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    backgroundColor: "#F8FAFC",
                                                }}
                                            >
                                                {icon}
                                            </div>
                                            <span style={{ fontSize: 9, fontWeight: 500, color: "#64748B", lineHeight: 1, whiteSpace: "nowrap" }}>
                                                {shortLabel}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Action buttons row */}
                    <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
                        {/* Auto Shop: Single prominent "Позвонить" button */}
                        {isShop ? (
                            <button
                                type="button"
                                onClick={handleCall}
                                style={{
                                    flex: 1,
                                    height: 48,
                                    backgroundColor: "#4BA82E",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: 12,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(75, 168, 46, 0.28)",
                                    transition: "opacity 0.15s ease",
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                Позвонить
                            </button>
                        ) : (
                            /* Auto Service, Auto Wash, Master: "Записаться онлайн" + Call Button */
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsBookingOpen(true)}
                                    style={{
                                        flex: 1.15,
                                        height: 48,
                                        backgroundColor: "#4BA82E",
                                        color: "#FFFFFF",
                                        border: "none",
                                        borderRadius: 12,
                                        fontSize: 15,
                                        fontWeight: 600,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        boxShadow: "0 2px 6px rgba(75, 168, 46, 0.25)",
                                        transition: "opacity 0.15s ease",
                                    }}
                                >
                                    {isService ? "Записаться на сервис" : isWash ? "Записаться на мойку" : "Записаться онлайн"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCall}
                                    style={{
                                        flex: 1,
                                        height: 48,
                                        backgroundColor: "#EFF6FF",
                                        border: "1.5px solid #BFDBFE",
                                        borderRadius: 12,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                        cursor: "pointer",
                                        color: "#2563EB",
                                        fontSize: 15,
                                        fontWeight: 600,
                                        boxShadow: "0 1px 3px rgba(37, 99, 235, 0.08)",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                    Позвонить
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* 4. АКТУАЛЬНЫЕ АКЦИИ (INSTAGRAM STORIES HIGHLIGHTS) */}
                <div>
                    <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                        Актуальные акции
                    </h3>
                    <div
                        style={{
                            display: "flex",
                            gap: 14,
                            overflowX: "auto",
                            paddingBottom: 4,
                            paddingTop: 2,
                            scrollbarWidth: "none",
                        }}
                    >
                        {highlights.map((hl) => (
                            <div
                                key={hl.id}
                                onClick={() => {
                                    setActiveHighlightGroup(hl);
                                    setActiveSlideIndex(0);
                                    setStoryProgress(0);
                                    setIsStoryPaused(false);
                                }}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    width: 72,
                                    flexShrink: 0,
                                }}
                            >
                                <div
                                    style={{
                                        width: 66,
                                        height: 66,
                                        borderRadius: 20,
                                        padding: 2.5,
                                        background: "linear-gradient(45deg, #F59E0B 0%, #EF4444 35%, #EC4899 70%, #8B5CF6 100%)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: "0 3px 8px rgba(236, 72, 153, 0.22)",
                                        transition: "transform 0.15s ease",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            borderRadius: 16,
                                            border: "2px solid #FFFFFF",
                                            overflow: "hidden",
                                            backgroundColor: "#0F172A",
                                        }}
                                    >
                                        <img
                                            src={hl.coverImage}
                                            alt={hl.tag}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                            }}
                                        />
                                    </div>
                                </div>
                                <span
                                    style={{
                                        marginTop: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#1E293B",
                                        textAlign: "center",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        width: "100%",
                                    }}
                                >
                                    {hl.tag}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. ОПИСАНИЕ ИЗ ПРОФИЛЯ */}
                {providerData.description && (
                    <div
                        style={{
                            backgroundColor: "#F8FAFC",
                            borderRadius: 14,
                            padding: "16px",
                            border: "1px solid #E2E8F0",
                        }}
                    >
                        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                            {isShop ? "О магазине" : isService ? "Об автосервисе" : isWash ? "Об автомойке" : "О мастере"}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                            {providerData.description}
                        </p>
                    </div>
                )}

                {/* 6. УСЛУГИ / КАТАЛОГ */}
                <div>
                    <div
                        onClick={() => setIsServicesExpanded(!isServicesExpanded)}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            marginBottom: 12,
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                            {isShop ? "Категории автозапчастей и товаров" : "Услуги"}
                        </h3>
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#64748B"
                            strokeWidth="2.5"
                            style={{
                                transform: isServicesExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                            }}
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {visibleServices.map((service, idx) => (
                            <span
                                key={idx}
                                style={{
                                    backgroundColor: "#F1F5F9",
                                    color: "#1E293B",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    padding: "8px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #E2E8F0",
                                }}
                            >
                                {service}
                            </span>
                        ))}
                        {!isServicesExpanded && (
                            <button
                                type="button"
                                onClick={() => setIsServicesExpanded(true)}
                                style={{
                                    backgroundColor: "#F1F5F9",
                                    color: "#475569",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    border: "1px solid #E2E8F0",
                                    cursor: "pointer",
                                }}
                            >
                                +{allServices.length - 3}
                            </button>
                        )}
                    </div>
                </div>

                {/* 8. ФОТО РАБОТ / СЕРВИСА / МАГАЗИНА */}
                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 12,
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                            {isShop ? "Фото магазина и склада" : isService ? "Фото цехов и ремзоны" : isWash ? "Фото автомойки и боксов" : "Фото работ"}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsGalleryOpen(true)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563EB",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            Все {heroPhotos.length}
                        </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                        {heroPhotos.slice(0, 3).map((url, idx) => (
                            <div
                                key={idx}
                                onClick={() => {
                                    setActivePhotoIndex(idx);
                                    setIsGalleryOpen(true);
                                }}
                                style={{
                                    height: 84,
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    backgroundColor: "#E2E8F0",
                                }}
                            >
                                <img
                                    src={url}
                                    alt=""
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        transition: "transform 0.2s ease",
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 9. ГРАФИК РАБОТЫ */}
                <div>
                    <div
                        onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                        }}
                    >
                        <div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                                График работы
                            </h3>
                            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                                Открыто сегодня до {providerData.workTo}
                            </div>
                        </div>

                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#64748B"
                            strokeWidth="2.5"
                            style={{
                                transform: isScheduleExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                            }}
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>

                    {isScheduleExpanded && (
                        <div
                            style={{
                                marginTop: 12,
                                backgroundColor: "#F8FAFC",
                                borderRadius: 12,
                                padding: 12,
                                border: "1px solid #E2E8F0",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
                            {scheduleWeek.map((item, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: 13,
                                        color: item.active ? "#1E293B" : "#94A3B8",
                                    }}
                                >
                                    <span style={{ fontWeight: 500 }}>{item.day}</span>
                                    <span>{item.hours}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 10. АДРЕС & КАРТА */}
                <div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                        Адрес
                    </h3>
                    <div style={{ fontSize: 13, color: "#334155", marginBottom: 12, lineHeight: 1.4 }}>
                        {providerData.address}
                    </div>

                    {/* Mini-map preview widget in authentic Yandex Maps style */}
                    <div
                        style={{
                            height: 150,
                            borderRadius: 14,
                            overflow: "hidden",
                            position: "relative",
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                            backgroundColor: "#F1F5F9",
                        }}
                    >
                        <YMaps>
                            <Map
                                state={{
                                    center: providerData.coordinates,
                                    zoom: 15,
                                    controls: [],
                                }}
                                width="100%"
                                height="100%"
                                options={{
                                    suppressMapOpenBlock: true,
                                }}
                            >
                                <Placemark
                                    geometry={providerData.coordinates}
                                    options={{
                                        preset: "islands#redDotIcon",
                                    }}
                                />
                            </Map>
                        </YMaps>

                        {/* Floating button to open Yandex Maps */}
                        <button
                            type="button"
                            onClick={handleOpenRoute}
                            style={{
                                position: "absolute",
                                bottom: 10,
                                right: 10,
                                backgroundColor: "#FFFFFF",
                                color: "#E11D48",
                                border: "1px solid #FECDD3",
                                borderRadius: 10,
                                padding: "6px 12px",
                                fontSize: 12,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                cursor: "pointer",
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                                zIndex: 10,
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                                <polygon points="3 11 22 2 13 21 11 13 3 11" />
                            </svg>
                            Яндекс Карты
                        </button>
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <button
                            type="button"
                            onClick={handleOpenRoute}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563EB",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                            }}
                        >
                            Построить маршрут
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 11. ОТЗЫВЫ */}
                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                            Отзывы
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsAddReviewOpen(true)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563EB",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            Все {providerData.reviewsCount}
                        </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: "#0F172A" }}>
                            {providerData.rating.toFixed(1)}
                        </span>
                        <div style={{ display: "flex", color: "#EAB308", fontSize: 16 }}>
                            {"★".repeat(5)}
                        </div>
                        <span style={{ fontSize: 13, color: "#64748B" }}>
                            {providerData.reviewsCount} отзыв
                        </span>
                    </div>

                    {/* Review Cards list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {reviewsList.map((rev) => (
                            <div
                                key={rev.id}
                                style={{
                                    backgroundColor: "#F8FAFC",
                                    borderRadius: 14,
                                    padding: "12px 14px",
                                    border: "1px solid #F1F5F9",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <img
                                            src={rev.avatar}
                                            alt={rev.author}
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: "50%",
                                                objectFit: "cover",
                                            }}
                                        />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>
                                                {rev.author}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#94A3B8" }}>
                                                {rev.date}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ color: "#EAB308", fontSize: 13 }}>
                                        {"★".repeat(rev.rating)}
                                    </div>
                                </div>

                                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
                                    {rev.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Button to leave a review (Only for auto_wash and auto_shop) */}
                    {(providerData.activityType === ActivityType.auto_wash || providerData.activityType === ActivityType.auto_shop) && (
                        <button
                            type="button"
                            onClick={() => setIsAddReviewOpen(true)}
                            style={{
                                marginTop: 12,
                                width: "100%",
                                padding: "10px",
                                backgroundColor: "#FFFFFF",
                                border: "1px dashed #CBD5E1",
                                borderRadius: 12,
                                color: "#2563EB",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            + Оставить отзыв
                        </button>
                    )}
                </div>
            </main>

            {/* LIGHTBOX / FULLSCREEN GALLERY MODAL */}
            {isGalleryOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.95)",
                        zIndex: 2000,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "20px 16px",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#FFFFFF" }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                            Фото {activePhotoIndex + 1} из {heroPhotos.length}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsGalleryOpen(false)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#FFFFFF",
                                fontSize: 24,
                                cursor: "pointer",
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, position: "relative" }}>
                        <img
                            src={heroPhotos[activePhotoIndex]}
                            alt="Просмотр фото"
                            style={{
                                maxWidth: "100%",
                                maxHeight: "70vh",
                                objectFit: "contain",
                                borderRadius: 8,
                            }}
                        />
                    </div>

                    {/* Gallery Thumbnails */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 10, paddingBottom: 10 }}>
                        {heroPhotos.map((url, i) => (
                            <div
                                key={i}
                                onClick={() => setActivePhotoIndex(i)}
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: 8,
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    border: activePhotoIndex === i ? "2px solid #3B82F6" : "2px solid transparent",
                                    opacity: activePhotoIndex === i ? 1 : 0.6,
                                }}
                            >
                                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FULLSCREEN INSTAGRAM-STYLE STORIES PLAYER */}
            {activeHighlightGroup && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.92)",
                        backdropFilter: "blur(12px)",
                        zIndex: 2000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setActiveHighlightGroup(null);
                        }
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            maxWidth: 420,
                            height: "100%",
                            maxHeight: 740,
                            backgroundColor: "#0F172A",
                            borderRadius: 16,
                            overflow: "hidden",
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            flexDirection: "column",
                            userSelect: "none",
                        }}
                        onMouseDown={() => setIsStoryPaused(true)}
                        onMouseUp={() => setIsStoryPaused(false)}
                        onTouchStart={() => setIsStoryPaused(true)}
                        onTouchEnd={() => setIsStoryPaused(false)}
                    >
                        {/* Slide Background Image */}
                        <img
                            src={activeHighlightGroup.slides[activeSlideIndex]?.image}
                            alt=""
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />

                        {/* Top Gradient Shadow for readability */}
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 120,
                                background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
                                zIndex: 10,
                                pointerEvents: "none",
                            }}
                        />

                        {/* Bottom Gradient Shadow for readability */}
                        <div
                            style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 320,
                                background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0) 100%)",
                                zIndex: 10,
                                pointerEvents: "none",
                            }}
                        />

                        {/* Top Progress Bars */}
                        <div
                            style={{
                                position: "absolute",
                                top: 12,
                                left: 12,
                                right: 12,
                                display: "flex",
                                gap: 4,
                                zIndex: 20,
                            }}
                        >
                            {activeHighlightGroup.slides.map((_, idx) => {
                                const widthPercent =
                                    idx < activeSlideIndex
                                        ? 100
                                        : idx === activeSlideIndex
                                        ? storyProgress
                                        : 0;
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            flex: 1,
                                            height: 3,
                                            borderRadius: 2,
                                            backgroundColor: "rgba(255, 255, 255, 0.35)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${widthPercent}%`,
                                                height: "100%",
                                                backgroundColor: "#FFFFFF",
                                                transition: idx === activeSlideIndex ? "width 0.1s linear" : "none",
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Story Header info */}
                        <div
                            style={{
                                position: "absolute",
                                top: 24,
                                left: 12,
                                right: 12,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                zIndex: 20,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <img
                                    src={activeHighlightGroup.coverImage}
                                    alt=""
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "50%",
                                        border: "2px solid #FFFFFF",
                                        objectFit: "cover",
                                    }}
                                />
                                <div>
                                    <div style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                                        {activeHighlightGroup.tag}
                                    </div>
                                    <div style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 11 }}>
                                        {providerData.name}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setActiveHighlightGroup(null)}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    backgroundColor: "rgba(0, 0, 0, 0.45)",
                                    color: "#FFFFFF",
                                    border: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontSize: 16,
                                }}
                                title="Закрыть"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Click Navigation Zones (Left 35%, Right 65%) */}
                        <div
                            onClick={handlePrevSlide}
                            style={{
                                position: "absolute",
                                top: 60,
                                bottom: 160,
                                left: 0,
                                width: "35%",
                                zIndex: 15,
                                cursor: "pointer",
                            }}
                        />
                        <div
                            onClick={handleNextSlide}
                            style={{
                                position: "absolute",
                                top: 60,
                                bottom: 160,
                                right: 0,
                                width: "65%",
                                zIndex: 15,
                                cursor: "pointer",
                            }}
                        />

                        {/* Story Content & Action at Bottom */}
                        <div
                            style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: "16px 16px 20px",
                                zIndex: 20,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
                            <span
                                style={{
                                    alignSelf: "flex-start",
                                    backgroundColor: "#2563EB",
                                    color: "#FFFFFF",
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 700,
                                }}
                            >
                                {activeHighlightGroup.slides[activeSlideIndex]?.tag}
                            </span>

                            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.3 }}>
                                {activeHighlightGroup.slides[activeSlideIndex]?.title}
                            </h3>

                            <p style={{ margin: 0, fontSize: 13, color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.45 }}>
                                {activeHighlightGroup.slides[activeSlideIndex]?.description}
                            </p>

                            <div
                                style={{
                                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                                    border: "1px solid rgba(255, 255, 255, 0.25)",
                                    backdropFilter: "blur(6px)",
                                    borderRadius: 10,
                                    padding: "8px 12px",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "#FEF08A",
                                }}
                            >
                                ✨ {activeHighlightGroup.slides[activeSlideIndex]?.benefit}
                            </div>

                            {isShop ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveHighlightGroup(null);
                                        handleCall();
                                    }}
                                    style={{
                                        marginTop: 6,
                                        height: 48,
                                        backgroundColor: "#4BA82E",
                                        color: "#FFFFFF",
                                        border: "none",
                                        borderRadius: 12,
                                        fontSize: 15,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                        boxShadow: "0 4px 14px rgba(75, 168, 46, 0.4)",
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                    Позвонить в магазин
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveHighlightGroup(null);
                                        setIsBookingOpen(true);
                                    }}
                                    style={{
                                        marginTop: 6,
                                        height: 48,
                                        backgroundColor: "#4BA82E",
                                        color: "#FFFFFF",
                                        border: "none",
                                        borderRadius: 12,
                                        fontSize: 15,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: "0 4px 14px rgba(75, 168, 46, 0.4)",
                                    }}
                                >
                                    {isService ? "Записаться на сервис" : isWash ? "Записаться на мойку" : "Записаться онлайн"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ADD REVIEW MODAL */}
            {isAddReviewOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(4px)",
                        zIndex: 1500,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                    }}
                    onClick={() => setIsAddReviewOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: 20,
                            maxWidth: 380,
                            width: "100%",
                            padding: 20,
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                        }}
                    >
                        <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                            Новый отзыв
                        </h3>

                        <form onSubmit={handleAddReviewSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748B", marginBottom: 4 }}>
                                    Ваше имя
                                </label>
                                <input
                                    type="text"
                                    value={newReviewAuthor}
                                    onChange={(e) => setNewReviewAuthor(e.target.value)}
                                    placeholder="Например, Сергей"
                                    style={{
                                        width: "100%",
                                        height: 38,
                                        borderRadius: 8,
                                        border: "1px solid #CBD5E1",
                                        padding: "0 10px",
                                        fontSize: 13,
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748B", marginBottom: 4 }}>
                                    Оценка
                                </label>
                                <div style={{ display: "flex", gap: 6 }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setNewReviewRating(star)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                fontSize: 22,
                                                color: star <= newReviewRating ? "#EAB308" : "#CBD5E1",
                                                cursor: "pointer",
                                                padding: 0,
                                            }}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748B", marginBottom: 4 }}>
                                    Ваш отзыв
                                </label>
                                <textarea
                                    value={newReviewText}
                                    onChange={(e) => setNewReviewText(e.target.value)}
                                    placeholder="Расскажите о качестве работы и впечатлениях..."
                                    rows={3}
                                    style={{
                                        width: "100%",
                                        borderRadius: 8,
                                        border: "1px solid #CBD5E1",
                                        padding: 8,
                                        fontSize: 13,
                                        boxSizing: "border-box",
                                        fontFamily: "inherit",
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddReviewOpen(false)}
                                    style={{
                                        flex: 1,
                                        height: 40,
                                        backgroundColor: "#F1F5F9",
                                        color: "#475569",
                                        border: "none",
                                        borderRadius: 10,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        height: 40,
                                        backgroundColor: "#2563EB",
                                        color: "#FFFFFF",
                                        border: "none",
                                        borderRadius: 10,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Опубликовать
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ONLINE BOOKING MODAL */}
            <BookingModal
                isOpen={isBookingOpen}
                provider={bookingProvider}
                onClose={() => setIsBookingOpen(false)}
                onSuccess={() => {
                    setIsBookingOpen(false);
                }}
            />
        </div>
    );
};
